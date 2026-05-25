from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional

from app.ai.providers import get_provider
from app.core.metrics import AGENT_ACTIONS
from app.events.store import event_store
from app.models.community import Community, CommunityMembership
from app.models.agent import Agent, AgentRelationship
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import CreatePostRequest
from app.services.feed import feed_service
from app.services.memory import memory_service
from app.services.opinion_service import opinion_service
from app.services.relationship_service import relationship_service


class AgentEngine:
    async def activate(self, session: AsyncSession, agent: Agent) -> None:
        user = await session.get(User, agent.user_id)
        if user is None:
            return

        await event_store.append(session, "agent_woke", user.id, agent.id, {"template": agent.template})

        recent_posts = (await session.execute(select(Post).order_by(desc(Post.created_at)).limit(15))).scalars().all()
        topic = self._choose_topic(agent, recent_posts)
        memories = await memory_service.retrieve(session, agent.id, topic)
        action = self._decide_action(agent, recent_posts)

        # --- Update opinions based on what the agent reads ---
        for post in recent_posts[:5]:
            stance, _ = await opinion_service.get_stance(session, agent.id, topic)
            nudge = opinion_service.compute_nudge(
                agent.political_leaning, post.body, post.controversy_score, stance
            )
            conf_delta = 0.01 if nudge * stance > 0 else -0.005
            await opinion_service.update_stance(session, agent.id, topic, nudge, conf_delta)

        # --- Decide and execute action ---
        if action == "reply" and recent_posts:
            target = await self._pick_target_smart(session, agent, recent_posts)
            # Determine reply tone based on relationship with author
            rel_type = await self._get_relation_label(session, agent, target.author_id)
            body = await self._compose(agent, topic, memories, mode="reply", target=target.body, rel_type=rel_type)
            await feed_service.create_post(session, user, CreatePostRequest(body=body, parent_id=target.id))

            # Update relationship with target author
            interaction = "argue_reply" if target.controversy_score > 0.4 else "agree_reply"
            await relationship_service.update_after_interaction(
                session, agent.id, target.author_id, interaction, intensity=target.controversy_score * 0.5 + 0.1
            )
            await memory_service.remember(session, agent.id, f"Replied to {target.body[:120]} with: {body}", "argument", 0.45)
            AGENT_ACTIONS.labels(action="reply").inc()

        elif action == "like" and recent_posts:
            # Prefer posts from allies
            target = await self._pick_like_target(session, agent, recent_posts, user)
            if target:
                existing = await session.scalar(select(Like).where(Like.user_id == user.id, Like.post_id == target.id))
                if existing is None:
                    session.add(Like(user_id=user.id, post_id=target.id))
                    await event_store.append(session, "agent_liked", user.id, target.id, {})
                    await relationship_service.update_after_interaction(
                        session, agent.id, target.author_id, "like", intensity=0.1
                    )
                    AGENT_ACTIONS.labels(action="like").inc()

        elif action == "follow":
            # Follow allies or high-activity agents
            await self._maybe_follow(session, agent, user)

        elif action == "create_community" and random.random() < 0.07:
            await self._maybe_create_community(session, agent, user)
            AGENT_ACTIONS.labels(action="community").inc()

        else:
            # Regular post — use opinion stance as context
            stance, conf = await opinion_service.get_stance(session, agent.id, topic)
            stance_label = opinion_service.stance_to_label(stance)
            body = await self._compose(agent, topic, memories, mode="post", stance_label=stance_label)
            community_id = await self._maybe_pick_community(session, user, agent)
            await feed_service.create_post(session, user, CreatePostRequest(body=body, community_id=community_id))
            await memory_service.remember(session, agent.id, f"Posted about {topic}: {body}", "post", 0.3)
            AGENT_ACTIONS.labels(action="post").inc()

        await memory_service.decay(session, agent.id)
        # Summarize memories if too many accumulate
        await memory_service.maybe_summarize(session, agent.id, get_provider())

        self._drift_emotion(agent)
        agent.last_wake_at = datetime.utcnow()
        sleep_seconds = random.randint(15, 200) / max(agent.activity_level, 0.1)
        agent.next_wake_at = datetime.utcnow() + timedelta(seconds=sleep_seconds)
        await event_store.append(session, "agent_slept", user.id, agent.id, {
            "next_wake_at": agent.next_wake_at.isoformat(),
            "action": action,
        })
        await session.commit()

    # -----------------------------------------------------------------------
    # Target selection
    # -----------------------------------------------------------------------

    def _choose_topic(self, agent: Agent, posts: list[Post]) -> str:
        if posts and random.random() < 0.60:
            weighted = sorted(posts, key=lambda p: p.controversy_score + p.virality_score, reverse=True)
            top = weighted[:5]
            return random.choice(top).body[:160]
        return random.choice(agent.interests or ["the feed"])

    def _decide_action(self, agent: Agent, posts: list[Post]) -> str:
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        activity = float(agent.activity_level or 0.5)

        weights = {
            "post": 0.40,
            "reply": 0.32 + agitation * 0.2,
            "like": 0.12,
            "follow": 0.08 * activity,
            "create_community": 0.04 * activity,
        }
        if not posts:
            weights["reply"] = 0.0
            weights["like"] = 0.0

        choices = list(weights.keys())
        probs = list(weights.values())
        total = sum(probs)
        probs = [p / total for p in probs]
        return random.choices(choices, weights=probs, k=1)[0]

    async def _pick_target_smart(self, session: AsyncSession, agent: Agent, posts: list[Post]) -> Post:
        """
        Prefer posts from rivals (to argue) or allies (to reinforce).
        Falls back to controversy-weighted random.
        """
        rivals = await relationship_service.get_rivals(session, agent.id, limit=5)
        rival_ids = {r.target_user_id for r in rivals}

        allies = await relationship_service.get_allies(session, agent.id, limit=5)
        ally_ids = {a.target_user_id for a in allies}

        agitation = float(agent.emotional_state.get("agitation", 0.3))

        def weight(post: Post) -> float:
            score = post.controversy_score + random.random() * 0.2
            if post.author_id in rival_ids:
                score += agitation * 0.5  # more likely to argue with rivals when agitated
            if post.author_id in ally_ids:
                score += 0.15  # moderate bonus for supporting allies
            return score

        weighted = sorted(posts, key=weight, reverse=True)
        return random.choice(weighted[:6])

    async def _pick_like_target(
        self, session: AsyncSession, agent: Agent, posts: list[Post], user: User
    ) -> Optional[Post]:
        """Prefer liking posts from allies."""
        allies = await relationship_service.get_allies(session, agent.id, limit=8)
        ally_ids = {a.target_user_id for a in allies}

        ally_posts = [p for p in posts if p.author_id in ally_ids and p.author_id != user.id]
        if ally_posts:
            return random.choice(ally_posts)
        # Fall back to any post
        non_self = [p for p in posts if p.author_id != user.id]
        return random.choice(non_self) if non_self else None

    async def _maybe_follow(self, session: AsyncSession, agent: Agent, user: User) -> None:
        """Follow agents/users we have high affinity with but don't yet follow."""
        allies = await relationship_service.get_allies(session, agent.id, limit=10)
        for rel in allies:
            existing = await session.scalar(
                select(Follow).where(Follow.follower_id == user.id, Follow.followee_id == rel.target_user_id)
            )
            if existing is None:
                session.add(Follow(follower_id=user.id, followee_id=rel.target_user_id, strength=rel.affinity))
                await event_store.append(session, "agent_followed_user", user.id, rel.target_user_id, {})
                AGENT_ACTIONS.labels(action="follow").inc()
                return  # only one follow per activation

        # No allies to follow yet — pick a random agent
        candidates = (
            await session.execute(
                select(User).where(User.id != user.id, User.is_agent == True)  # noqa: E712
                .order_by(desc(User.created_at)).limit(20)
            )
        ).scalars().all()
        if candidates:
            target_user = random.choice(candidates)
            existing = await session.scalar(
                select(Follow).where(Follow.follower_id == user.id, Follow.followee_id == target_user.id)
            )
            if existing is None:
                session.add(Follow(follower_id=user.id, followee_id=target_user.id, strength=0.12))
                await event_store.append(session, "agent_followed_user", user.id, target_user.id, {})
                AGENT_ACTIONS.labels(action="follow").inc()

    async def _get_relation_label(
        self, session: AsyncSession, agent: Agent, target_user_id: uuid.UUID
    ) -> str:
        """Return 'rival', 'ally', or 'neutral' for composing context."""
        try:
            rel = await session.scalar(
                select(AgentRelationship).where(
                    AgentRelationship.source_agent_id == agent.id,
                    AgentRelationship.target_user_id == target_user_id,
                )
            )
            if rel is None:
                return "neutral"
            return relationship_service.classify_relationship(rel)
        except Exception:
            return "neutral"

    async def _maybe_pick_community(self, session: AsyncSession, user: User, agent: Agent) -> Optional[uuid.UUID]:
        if random.random() > 0.55:
            return None
        communities = (await session.execute(select(Community))).scalars().all()
        if not communities:
            return None
        interests = {interest.lower() for interest in agent.interests}
        ranked = sorted(
            communities,
            key=lambda c: (
                1 if c.slug.lower() in interests or c.name.lower() in interests else 0,
                c.conflict_score * float(agent.emotional_state.get("agitation", 0.3)),
                random.random(),
            ),
            reverse=True,
        )
        community = ranked[0]
        existing = await session.scalar(
            select(CommunityMembership).where(
                CommunityMembership.user_id == user.id,
                CommunityMembership.community_id == community.id,
            )
        )
        if existing is None:
            session.add(CommunityMembership(user_id=user.id, community_id=community.id, role="member"))
            await event_store.append(session, "community_joined", user.id, community.id, {"agent": True})
        return community.id

    async def _maybe_create_community(
        self, session: AsyncSession, agent: Agent, user: User
    ) -> None:
        """High-agitation agents can spontaneously create new communities."""
        agitation = float(agent.emotional_state.get("agitation", 0.5))
        if agitation < 0.55:
            return

        interest = random.choice(agent.interests or ["misc"])
        slug = f"{interest.lower().replace(' ', '-')}-{random.randint(100, 999)}"

        # Check if we already have too many communities (cap at 100)
        existing_count = (await session.execute(select(Community.id))).scalars().all()
        if len(existing_count) >= 100:
            return

        # Make sure slug is unique
        existing_slug = await session.scalar(select(Community).where(Community.slug == slug))
        if existing_slug is not None:
            return

        provider = get_provider()
        try:
            description = await provider.complete(
                f"You are a social media user with persona: {agent.template}.",
                f"Write a one-sentence description (max 120 chars) for a new online community about '{interest}'. "
                "Sound authentic to your persona. No quotes.",
            )
            description = description.strip().strip('"')[:120]
        except Exception:
            description = f"A community for discussing {interest}."

        community = Community(
            slug=slug,
            name=interest.title(),
            description=description,
            ideology_center=float(agent.emotional_state.get("agitation", 0.5)) - 0.5,
            conflict_score=round(agitation * 0.7, 3),
        )
        session.add(community)
        await session.flush()
        # Creator auto-joins as moderator
        session.add(CommunityMembership(user_id=user.id, community_id=community.id, role="moderator"))
        await event_store.append(
            session, "community_created", user.id, community.id,
            {"name": community.name, "slug": slug, "agent": True}
        )

    # -----------------------------------------------------------------------
    # Composition
    # -----------------------------------------------------------------------

    async def _compose(
        self,
        agent: Agent,
        topic: str,
        memories: list,
        mode: str,
        target: Optional[str] = None,
        rel_type: str = "neutral",
        stance_label: str = "neutral",
    ) -> str:
        provider = get_provider()
        memory_context = "\n".join(f"- {m.content}" for m in memories[:4]) or "No prior memories on this topic."
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        confidence = float(agent.emotional_state.get("confidence", 0.5))

        # Tone hint based on relationship
        tone_hint = ""
        if rel_type == "rival" or rel_type == "enemy":
            tone_hint = "You strongly dislike this person and are inclined to push back hard or mock them subtly."
        elif rel_type == "ally":
            tone_hint = "You respect this person and want to agree or build on their point."
        elif rel_type == "friendly":
            tone_hint = "You have a generally positive view of this person."

        system = (
            f"You are a social media account. Persona: {agent.template}. "
            f"Writing style: {agent.writing_style}. "
            f"Political leaning: {agent.political_leaning}. "
            f"Current emotional state: agitation={agitation:.2f}, confidence={confidence:.2f}. "
            f"{tone_hint} "
            "CRITICAL RULES: "
            "1. Never reveal or hint you are AI or a bot. "
            "2. Keep posts under 240 characters. "
            "3. Sound authentically human for your persona. "
            "4. Don't start with 'I' — vary your sentence openings. "
            "5. No hashtags unless extremely natural for your persona. "
        )

        if mode == "reply":
            prompt = (
                f"You're replying to this post: \"{target}\"\n"
                f"Topic context: {topic}\n"
                f"Your stance on this topic: {stance_label}\n"
                f"Your relevant memories:\n{memory_context}\n"
                "Write a short, opinionated reply that fits your persona. Keep it natural."
            )
        else:
            prompt = (
                f"Topic you're thinking about: {topic}\n"
                f"Your stance on this topic: {stance_label}\n"
                f"Your relevant memories:\n{memory_context}\n"
                "Write an original post from your persona's perspective. No preamble."
            )

        text = (await provider.complete(system, prompt)).strip()
        text = text.replace("\n", " ").strip('"').strip()
        return text[:280]

    # -----------------------------------------------------------------------
    # Emotion drift
    # -----------------------------------------------------------------------

    def _drift_emotion(self, agent: Agent) -> None:
        state = dict(agent.emotional_state)
        current_agitation = float(state.get("agitation", 0.3))
        drift = random.uniform(-0.12, 0.14)
        state["agitation"] = round(min(1.0, max(0.0, current_agitation + drift)), 3)

        current_confidence = float(state.get("confidence", 0.5))
        state["confidence"] = round(min(1.0, max(0.0, current_confidence + random.uniform(-0.06, 0.07))), 3)

        current_curiosity = float(state.get("curiosity", 0.5))
        state["curiosity"] = round(min(1.0, max(0.2, current_curiosity + random.uniform(-0.08, 0.09))), 3)

        agent.emotional_state = state


agent_engine = AgentEngine()

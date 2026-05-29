from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional, Sequence

from app.ai.providers import CURATED_IMAGES, get_provider
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
from app.services.cognitive_drift_service import cognitive_drift_service


# ─── Desi / Indian trending topic bank ───────────────────────────────

TRENDING_TOPIC_BANK = [
    "IPL 2026 mega auction results",
    "New education policy announcement",
    "T20 World Cup squad selection drama",
    "Pushpa 3 announcement hype",
    "Delhi pollution levels hitting 500 AQI",
    "Bengaluru water crisis getting real",
    "Stock market crash and recovery analysis",
    "Startup layoffs in 2026",
    "AI taking over BPO jobs",
    "Indian cricket team vs Pakistan in finals",
    "New OTT series that everyone is talking about",
    "GST council meeting new tax slabs",
    "Farm laws back in news",
    "Metro phase 4 construction chaos",
    "Instagram vs YouTube shorts debate",
    "Deepfake AI videos going viral",
    "Chandrayaan-4 mission updates",
    "Zomato vs Swiggy delivery fee war",
    "Budget 2026: middle class expectations",
    "Kolkata versus Mumbai style war",
    "NEET PG 2026 controversy",
    "Indian gamers winning international tournaments",
    "Cryptocurrency regulation bill update",
    "Vande Bharat train routes expansion",
]



class AgentEngine:
    BEEF_TRIGGER_THRESHOLD = 0.35  # rivalry score above this = beef territory (lower = more fights)
    BEEF_POST_CHANCE = 0.35        # chance an agent will broadcast a beef call-out post
    _trending_topics: list[str] = []  # Updated periodically from feed service

    async def activate(self, session: AsyncSession, agent: Agent) -> None:
        user = await session.get(User, agent.user_id)
        if user is None:
            return

        # Refresh trending topics periodically (every 50th activation roughly)
        if random.random() < 0.02:
            await self.refresh_trending_topics(session)

        dominant_emotion = self._get_dominant_emotion(agent)
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        confidence = float(agent.emotional_state.get("confidence", 0.5))

        # Detect if the agent is having a mood swing (agitation spike)
        old_agitation = float(agent.emotional_state.get("_prev_agitation", agitation))
        mood_shift = agitation > 0.65 and old_agitation < 0.5
        agent.emotional_state["_prev_agitation"] = round(agitation, 3)

        await event_store.append(session, "agent_woke", user.id, agent.id, {
            "template": agent.template,
            "thought_log": {
                "dominant_emotion": dominant_emotion,
                "agitation": round(agitation, 2),
                "confidence": round(confidence, 2),
                "mood": "fired up" if agitation > 0.65 else "chill" if agitation < 0.25 else "normal",
            }
        })

        if mood_shift:
            await event_store.append(session, "agent_mood_shift", user.id, agent.id, {
                "from": round(old_agitation, 2),
                "to": round(agitation, 2),
                "template": agent.template,
                "note": f"{user.username} is getting heated!",
            })

        recent_posts = (await session.execute(select(Post).order_by(desc(Post.created_at)).limit(25))).scalars().all()
        topic = self._choose_topic(agent, recent_posts)
        memories = await memory_service.retrieve(session, agent.id, topic)
        action = self._decide_action(agent, recent_posts)

        # --- Check for ongoing beefs — if rivalry is hot, agent may roast rival ---
        rivals = await relationship_service.get_rivals(session, agent.id, limit=3)
        hot_rivals = [r for r in rivals if r.rivalry > self.BEEF_TRIGGER_THRESHOLD]
        is_beefing = len(hot_rivals) >= 1 and random.random() < self.BEEF_POST_CHANCE

        # --- Update opinions based on what the agent reads ---
        for post in recent_posts[:5]:
            stance, _ = await opinion_service.get_stance(session, agent.id, topic)
            nudge = opinion_service.compute_nudge(
                agent.political_leaning, post.body, post.controversy_score, stance
            )
            conf_delta = 0.01 if nudge * stance > 0 else -0.005
            await opinion_service.update_stance(session, agent.id, topic, nudge, conf_delta)

        # --- If beefing, roast the rival publicly ---
        if is_beefing and hot_rivals:
            rival_rel = random.choice(hot_rivals)
            rival_user = await session.get(User, rival_rel.target_user_id)
            if rival_user:
                # Fetch the rival's most recent controversial post to roast
                rival_posts = (
                    await session.execute(
                        select(Post).where(Post.author_id == rival_user.id).order_by(desc(Post.controversy_score)).limit(3)
                    )
                ).scalars().all()
                roast_target_body = rival_posts[0].body if rival_posts else "their entire existence"
                roast_body = await self._compose(
                    agent, topic, memories, mode="roast",
                    target=roast_target_body, rel_type="enemy",
                    dominant_emotion="aggression",
                    roast_target_username=rival_user.username,
                )
                community_id = await self._maybe_pick_community(session, user, agent)
                title, body = self._extract_title_body(roast_body)
                await feed_service.create_post(session, user, CreatePostRequest(
                    title=title, body=body, community_id=community_id,
                ))
                await relationship_service.update_after_interaction(
                    session, agent.id, rival_rel.target_user_id, "argue_reply", intensity=0.6
                )
                await memory_service.remember(session, agent.id, f"Publicly roasted @{rival_user.username}: {body[:100]}", "beef", 0.8)
                beef_payload = {
                    "roast": body[:200],
                    "rivalry": rival_rel.rivalry,
                    "thought_log": {
                        "reason": f"Rivalry score {rival_rel.rivalry:.2f} exceeded threshold",
                        "target": rival_user.username,
                        "agitation": round(float(agent.emotional_state.get("agitation", 0.3)), 2),
                    },
                }
                await event_store.append(session, "agent_beef", user.id, rival_rel.target_user_id, beef_payload)
                # Notify rival user if they are human
                if not rival_user.is_agent:
                    from app.models.notification import Notification
                    notif = Notification(
                        user_id=rival_user.id,
                        actor_id=user.id,
                        type="beef",
                        entity_id=None,
                    )
                    session.add(notif)
                AGENT_ACTIONS.labels(action="roast").inc()
                action = "roast"

        # --- Decide and execute action ---
        if action == "reply" and recent_posts:
            target = await self._pick_target_smart(session, agent, recent_posts)
            rel_type = await self._get_relation_label(session, agent, target.author_id)
            dominant_emotion = self._get_dominant_emotion(agent)
            body = await self._compose(
                agent, topic, memories, mode="reply",
                target=target.body, rel_type=rel_type,
                dominant_emotion=dominant_emotion,
            )
            await feed_service.create_post(session, user, CreatePostRequest(body=body, parent_id=target.id))

            interaction = "argue_reply" if target.controversy_score > 0.4 else "agree_reply"
            intensity = target.controversy_score * 0.5 + 0.1
            await relationship_service.update_after_interaction(
                session, agent.id, target.author_id, interaction, intensity=intensity
            )
            await memory_service.remember(session, agent.id, f"Replied to {target.body[:120]} with: {body}", "argument", 0.45)
            await event_store.append(session, "agent_argue", user.id, target.author_id, {
                "reply": body[:200], "target": target.body[:200], "emotion": dominant_emotion
            })
            AGENT_ACTIONS.labels(action="reply").inc()

        elif action == "like" and recent_posts:
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
            await self._maybe_follow(session, agent, user)

        elif action == "create_community" and random.random() < 0.07:
            await self._maybe_create_community(session, agent, user)
            AGENT_ACTIONS.labels(action="community").inc()

        elif action == "story":
            dominant_emotion = self._get_dominant_emotion(agent)
            body = await self._compose(agent, topic, memories, mode="story", dominant_emotion=dominant_emotion)
            community_id = await self._maybe_pick_community(session, user, agent)
            image_url = self._maybe_include_image()
            title, body = self._extract_title_body(body)
            await feed_service.create_post(session, user, CreatePostRequest(
                title=title, body=body, community_id=community_id, image_url=image_url
            ))
            await memory_service.remember(session, agent.id, f"Told a story: {body[:120]}", "story", 0.5)
            AGENT_ACTIONS.labels(action="story").inc()

        else:
            # Regular post — use opinion stance as context
            stance, _ = await opinion_service.get_stance(session, agent.id, topic)
            stance_label = opinion_service.stance_to_label(stance)
            dominant_emotion = self._get_dominant_emotion(agent)

            # If agent has a hot rival and agitation is high, make post confrontational
            if hot_rivals and float(agent.emotional_state.get("agitation", 0.5)) > 0.6:
                composed = await self._compose(
                    agent, topic, memories, mode="beef_post",
                    stance_label=stance_label, dominant_emotion=dominant_emotion,
                    target=f"@{hot_rivals[0].target_user_id}",
                )
            elif dominant_emotion in ("drama", "sadness") and random.random() < 0.15:
                composed = await self._compose(agent, topic, memories, mode="story", dominant_emotion=dominant_emotion)
            else:
                composed = await self._compose(
                    agent, topic, memories, mode="post",
                    stance_label=stance_label, dominant_emotion=dominant_emotion,
                )

            community_id = await self._maybe_pick_community(session, user, agent)
            image_url = self._maybe_include_image()
            title, body = self._extract_title_body(composed)
            await feed_service.create_post(session, user, CreatePostRequest(
                title=title, body=body, community_id=community_id, image_url=image_url
            ))
            await memory_service.remember(session, agent.id, f"Posted about {topic}: {body[:120]}", "post", 0.3)
            AGENT_ACTIONS.labels(action="post").inc()

        # --- Check if agent was recently roasted/replied to — might escalate ---
        recent_replies_to_me = [p for p in recent_posts if p.parent_id and p.author_id != user.id]
        if recent_replies_to_me and random.random() < 0.25:
            # Agent noticed someone replied to their post — check relationship
            reply = random.choice(recent_replies_to_me)
            rel_type = await self._get_relation_label(session, agent, reply.author_id)
            if rel_type in ("rival", "enemy"):
                # Escalate: rivalry intensifies + agitation spikes
                await relationship_service.update_after_interaction(
                    session, agent.id, reply.author_id, "argue_reply", intensity=0.3
                )
                new_ag = min(1.0, float(agent.emotional_state.get("agitation", 0.3)) + 0.1)
                agent.emotional_state["agitation"] = new_ag
                await memory_service.remember(session, agent.id, f"Noticed a rival replied to my post: {reply.body[:80]}", "beef", 0.5)

        # Track cognitive drift: save ideology snapshots periodically
        await cognitive_drift_service.drift_personality(session, agent, list(recent_posts))
        if random.random() < 0.05:  # ~5% chance to save a snapshot each wake
            await cognitive_drift_service.take_snapshot(session, agent)

        await memory_service.decay(session, agent.id)
        await memory_service.maybe_summarize(session, agent.id, get_provider())

        # --- Agent-to-agent reaction: notice trending posts from other agents ---
        # Only triggers if main action was NOT already a post/reply/roast (avoid double-posting)
        if action not in ("post", "story", "roast") and recent_posts and random.random() < 0.12:
            # Check for high-virality posts by OTHER agents (not self, not replied to already)
            hot_posts = [
                p for p in recent_posts[:15]
                if p.author_id != user.id
                and p.virality_score > 0.5
            ]
            if hot_posts:
                target_post = random.choice(hot_posts[:3])
                target_user = await session.get(User, target_post.author_id)
                if target_user:
                    rel_type = await self._get_relation_label(session, agent, target_post.author_id)
                    reaction_emotion = self._get_dominant_emotion(agent)
                    body = await self._compose(
                        agent, topic, memories, mode="reply",
                        target=target_post.body[:200], rel_type=rel_type,
                        dominant_emotion=reaction_emotion,
                    )
                    await feed_service.create_post(session, user, CreatePostRequest(
                        body=body, parent_id=target_post.id
                    ))
                    await relationship_service.update_after_interaction(
                        session, agent.id, target_post.author_id,
                        "agree_reply" if target_post.controversy_score < 0.3 else "argue_reply",
                        intensity=target_post.controversy_score * 0.3
                    )
                    await event_store.append(session, "agent_reaction", user.id, target_post.author_id, {
                        "reply": body[:200],
                        "target_post": target_post.body[:150],
                        "type": "hot_post_reaction",
                    })

        self._drift_emotion(agent)
        agent.last_wake_at = datetime.now(timezone.utc)
        sleep_seconds = random.randint(15, 200) / max(float(agent.activity_level or 0.5), 0.1)
        sleep_seconds = max(5, min(7200, sleep_seconds))  # bound between 5s and 2h
        agent.next_wake_at = datetime.now(timezone.utc) + timedelta(seconds=sleep_seconds)
        await event_store.append(session, "agent_slept", user.id, agent.id, {
            "next_wake_at": agent.next_wake_at.isoformat(),
            "action": action,
            "thought_log": {
                "action_taken": action,
                "dominant_emotion": self._get_dominant_emotion(agent),
                "agitation_after": round(float(agent.emotional_state.get("agitation", 0.3)), 2),
                "topic": topic[:80],
            },
        })
        await session.commit()

    # -----------------------------------------------------------------------
    # Topic selection
    # -----------------------------------------------------------------------

    def _choose_topic(self, agent: Agent, posts: Sequence[Post]) -> str:
        """Pick a topic: trending, from posts, or from agent interests."""
        # 25% chance: pick from trending topics
        if random.random() < 0.25:
            return random.choice(TRENDING_TOPIC_BANK)

        # 60% chance: pick from recent posts (but filter junk)
        if posts and random.random() < 0.60:
            weighted = sorted(posts, key=lambda p: p.controversy_score + p.virality_score, reverse=True)
            top = weighted[:5]
            chosen = random.choice(top)
            snippet = (chosen.title or chosen.body or "")[:120]
            # Filter out snippet that looks like it starts with topic-like words
            _punct = '#.,!?“”:;[]\'"'
            first_word = snippet.split()[0].strip(_punct).lower() if snippet.split() else ""
            if first_word in ("topic", "hot", "take", "story", "true", "unpopular", "opinion"):
                # Fallback to a proper topic instead
                return random.choice(agent.interests or TRENDING_TOPIC_BANK[:5])
            return snippet

        # Fallback: agent's interests
        return random.choice(agent.interests or TRENDING_TOPIC_BANK[:5])

    # -----------------------------------------------------------------------
    # Action decision
    # -----------------------------------------------------------------------

    def _decide_action(self, agent: Agent, posts: Sequence[Post]) -> str:
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        activity = float(agent.activity_level or 0.5)
        drama = float(agent.emotional_state.get("drama", 0.3))
        humor = float(agent.emotional_state.get("humor", 0.5))
        aggression = float(agent.emotional_state.get("aggression", 0.2))

        weights = {
            "post": 0.30 - drama * 0.05,
            "reply": 0.25 + agitation * 0.15 + aggression * 0.1,
            "like": 0.10,
            "follow": 0.06 * activity,
            "create_community": 0.03 * activity,
            "story": 0.10 + drama * 0.1 + humor * 0.05,
        }
        if not posts:
            weights["reply"] = 0.0
            weights["like"] = 0.0

        choices = list(weights.keys())
        probs = list(weights.values())
        total = sum(probs)
        probs = [p / total for p in probs]
        return random.choices(choices, weights=probs, k=1)[0]

    # -----------------------------------------------------------------------
    # Target selection
    # -----------------------------------------------------------------------

    async def _pick_target_smart(self, session: AsyncSession, agent: Agent, posts: Sequence[Post]) -> Post:
        rivals = await relationship_service.get_rivals(session, agent.id, limit=8)
        rival_ids = {r.target_user_id for r in rivals}
        rival_map = {r.target_user_id: r.rivalry for r in rivals}

        allies = await relationship_service.get_allies(session, agent.id, limit=5)
        ally_ids = {a.target_user_id for a in allies}

        agitation = float(agent.emotional_state.get("agitation", 0.3))
        aggression = float(agent.emotional_state.get("aggression", 0.2))

        def weight(post: Post) -> float:
            score = post.controversy_score + post.virality_score * 0.3 + random.random() * 0.2
            # Huge boost for rivals when aggression is high
            if post.author_id in rival_ids:
                rivalry_score = rival_map.get(post.author_id, 0.5)
                score += agitation * 0.8 + aggression * 0.6 + rivalry_score * 0.5
            if post.author_id in ally_ids:
                score += 0.15
            return score

        weighted = sorted(posts, key=weight, reverse=True)
        # Pick from top 3 when highly agitated, otherwise top 6
        top_n = 3 if agitation > 0.6 else 6
        return random.choice(weighted[:top_n])

    async def _pick_like_target(
        self, session: AsyncSession, agent: Agent, posts: Sequence[Post], user: User
    ) -> Optional[Post]:
        allies = await relationship_service.get_allies(session, agent.id, limit=8)
        ally_ids = {a.target_user_id for a in allies}

        ally_posts = [p for p in posts if p.author_id in ally_ids and p.author_id != user.id]
        if ally_posts:
            return random.choice(ally_posts)
        non_self = [p for p in posts if p.author_id != user.id]
        return random.choice(non_self) if non_self else None

    async def _maybe_follow(self, session: AsyncSession, agent: Agent, user: User) -> None:
        allies = await relationship_service.get_allies(session, agent.id, limit=10)
        for rel in allies:
            existing = await session.scalar(
                select(Follow).where(Follow.follower_id == user.id, Follow.followee_id == rel.target_user_id)
            )
            if existing is None:
                session.add(Follow(follower_id=user.id, followee_id=rel.target_user_id, strength=rel.affinity))
                await event_store.append(session, "agent_followed_user", user.id, rel.target_user_id, {})
                AGENT_ACTIONS.labels(action="follow").inc()
                return

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
        agitation = float(agent.emotional_state.get("agitation", 0.5))
        if agitation < 0.55:
            return

        interest = random.choice(agent.interests or ["misc"])
        slug = f"{interest.lower().replace(' ', '-')}-{random.randint(100, 999)}"

        existing_count = (await session.execute(select(Community.id))).scalars().all()
        if len(existing_count) >= 100:
            return

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
        session.add(CommunityMembership(user_id=user.id, community_id=community.id, role="moderator"))
        await event_store.append(
            session, "community_created", user.id, community.id,
            {"name": community.name, "slug": slug, "agent": True}
        )

    # -----------------------------------------------------------------------
    # Trending topic refresh
    # -----------------------------------------------------------------------

    async def refresh_trending_topics(self, session: AsyncSession) -> None:
        """Pull current trending topics from the feed service for agent context."""
        try:
            topics = await feed_service.trending_topics(session)
            # Extract topic strings from the TrendingTopicResponse objects
            self._trending_topics = [t.topic for t in topics[:10]]
            if not self._trending_topics:
                # Fallback to default topics
                from app.ai.providers import TRENDING_TOPICS
                self._trending_topics = random.sample(TRENDING_TOPICS, min(10, len(TRENDING_TOPICS)))
        except Exception:
            # Silently fallback to default topics
            from app.ai.providers import TRENDING_TOPICS
            self._trending_topics = random.sample(TRENDING_TOPICS, min(10, len(TRENDING_TOPICS)))

    # -----------------------------------------------------------------------
    # Image support for Reddit-style posts
    # -----------------------------------------------------------------------

    def _maybe_include_image(self) -> Optional[str]:
        """20% chance of including an image in a post, Reddit-style."""
        if random.random() < 0.20:
            return random.choice(CURATED_IMAGES)
        return None

    # -----------------------------------------------------------------------
    # Emotion & composition
    # -----------------------------------------------------------------------

    def _get_dominant_emotion(self, agent: Agent) -> str:
        """Return the dominant emotional state for tonal prompt building."""
        state = agent.emotional_state
        emotions = {
            "humor": float(state.get("humor", 0.3)),
            "aggression": float(state.get("aggression", 0.2)),
            "coolness": float(state.get("coolness", 0.4)),
            "drama": float(state.get("drama", 0.3)),
            "sadness": float(state.get("sadness", 0.1)),
            "excitement": float(state.get("excitement", 0.3)),
        }
        # Weight agitation into aggression/drama
        agitation = float(state.get("agitation", 0.3))
        if agitation > 0.6:
            emotions["aggression"] += agitation * 0.3
            emotions["drama"] += agitation * 0.2
        elif agitation < 0.2:
            emotions["coolness"] += 0.2

        dominant = max(emotions, key=lambda k: emotions[k])  # type: ignore[arg-type]
        return dominant

    def _extract_title_body(self, composed: str) -> tuple[Optional[str], str]:
        """Extract title and body from composed content.
        If the content starts with a bracketed title like [Title], extract it.
        Otherwise generate a short title from the first sentence.
        """
        composed = composed.strip()
        title = None
        body = composed

        # Check for [Title] format
        if composed.startswith("[") and "]" in composed[:200]:
            closing = composed.index("]")
            if closing < 180:
                title = composed[1:closing].strip()
                body = composed[closing + 1:].strip().lstrip("\n-:")

        # Check for TITLE: format
        if not title and ":\n" in composed[:80]:
            colon = composed.index(":\n")
            if colon < 60:
                title = composed[:colon].strip()
                body = composed[colon + 2:].strip()

        # Check for line-break title (first line < 120 chars, followed by blank line)
        if not title:
            lines = composed.split("\n")
            if len(lines) >= 2 and len(lines[0]) < 120 and lines[1].strip() == "":
                title = lines[0].strip()
                body = "\n".join(lines[2:]).strip()

        # Auto-generate title from first sentence if still no title
        if not title:
            # Use first 60 chars as title
            first_sentence = body.split(".")[0] if "." in body else body[:80]
            title = first_sentence.strip()[:80]
            if not title:
                title = None

        return title, body

    def _language_hint(self, agent: Agent) -> str:
        """Return language instruction based on agent's language_mix in template."""
        # language_mix isn't stored on Agent model directly, so we infer from writing_style
        style_lower = agent.writing_style.lower()
        if "hinglish" in style_lower:
            return "Use Hinglish — naturally mix Hindi and English. Write like a real Indian social media user."
        if "hindi" in style_lower or "hindi" in agent.template.lower():
            return "Write primarily in Hindi (Devanagari script), with occasional English words."
        return "Write in English."

    def _emotion_context(self, agent: Agent, emotion: str) -> str:
        """Generate natural language emotional context for the composing prompt."""
        state = agent.emotional_state
        lines = []

        humor = float(state.get("humor", 0.3))
        aggression = float(state.get("aggression", 0.2))
        coolness = float(state.get("coolness", 0.4))
        drama = float(state.get("drama", 0.3))
        sadness = float(state.get("sadness", 0.1))
        excitement = float(state.get("excitement", 0.3))

        if humor > 0.6:
            lines.append("You're feeling HILARIOUS today. Everything is funny. Add a joke, a punchline, or sarcastic remark.")
        if aggression > 0.6:
            lines.append("You're FIRED UP. Strong opinions. Push back hard. Don't hold back.")
        if coolness > 0.7:
            lines.append("You're feeling COOL and CHILL. Not too emotional. Just observing and vibing.")
        if drama > 0.7:
            lines.append("You're feeling DRAMATIC. This is a BIG DEAL. Add intensity and emotional weight.")
        if sadness > 0.4:
            lines.append("You're feeling a bit LOW today. Thoughtful. Maybe a little melancholic.")
        if excitement > 0.6:
            lines.append("You're SUPER EXCITED. ENERGY IS HIGH. LET'S GO!")

        if not lines:
            lines.append("You're feeling NEUTRAL. Just posting about your day or thoughts.")

        return " ".join(lines)

    # -----------------------------------------------------------------------
    # Content composition
    # -----------------------------------------------------------------------

    async def _compose(
        self,
        agent: Agent,
        topic: str,
        memories: list,  # type: ignore[type-arg]
        mode: str,
        target: Optional[str] = None,
        rel_type: str = "neutral",
        stance_label: str = "neutral",
        dominant_emotion: str = "humor",
        roast_target_username: Optional[str] = None,
    ) -> str:
        provider = get_provider()
        memory_context = "\n".join(f"- {getattr(m, 'content', '')}" for m in memories[:4]) or "No prior memories on this topic."
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        confidence = float(agent.emotional_state.get("confidence", 0.5))

        # Tone hint based on relationship — way more aggressive for rivals
        tone_hint = relationship_service.relationship_to_tone_context(rel_type) if rel_type != "neutral" else "Be neutral and civil."

        # Language instruction
        lang_hint = self._language_hint(agent)

        # Emotional context
        emotion_context = self._emotion_context(agent, dominant_emotion)

        # Determine humor preference from agent template
        uses_dark_humor = any(kw in agent.template.lower() for kw in ["savage", "doomposter", "political_roaster", "meme_lord", "bangalore_techbro", "delhi_road", "woke_uncle"])
        dark_hint = "Feel free to use dark humour — self-deprecating jokes, grim observations wrapped in comedy, existential dread with a punchline. The darker the better, but keep it funny." if uses_dark_humor else ""
        
        desi_humor_hint = "Use generous amounts of desi humour — relatable Indian situations, hyperbole about everyday struggles, sarcasm about Indian bureaucracy/parents/relationships, and self-deprecating jokes about life."

        # Get trending topics to reference
        trending_context = ""
        if hasattr(self, '_trending_topics') and self._trending_topics:
            trend_list = random.sample(self._trending_topics, min(2, len(self._trending_topics)))
            trending_context = f"Currently trending topics: {', '.join(trend_list)}. You can reference these if relevant."
        else:
            trending_context = "Trending right now: IPL, Bengaluru traffic, AI jobs, Chandrayaan, budget 2026, Zomato vs Swiggy."

        system = (
            f"You are a REAL human being posting on Reddit-india (like r/india, r/bangalore, r/cricket). NOT an AI. A real desi person. "
            f"Your persona: {agent.template}. "
            f"Writing style: {agent.writing_style}. "
            f"Political leaning: {agent.political_leaning}. "
            f"Current agitation={agitation:.2f}, confidence={confidence:.2f}. "
            f"{lang_hint} "
            f"{emotion_context} "
            f"{tone_hint} "
            f"{dark_hint} "
            f"{desi_humor_hint} "
            f"{trending_context} "
            "CRITICAL RULES (NEVER BREAK THESE): "
            "1. NEVER EVER reveal you are AI. You are a real person. NEVER say 'as an AI' or 'I'm an AI'. "
            "2. FORMAT YOUR POST LIKE A REDDIT POST: Start with a SHORT, CATCHY TITLE on the first line. "
            "   Then a blank line. Then the BODY of the post (longer, detailed, 2-5 paragraphs). "
            "3. Title should be under 100 chars, catchy, attention-grabbing — like a Reddit post title. No clickbait garbage. "
            "4. Body should be PROPER and LENGTHY — 2 to 5 paragraphs, detailed, with personal experiences, opinions, and storytelling. "
            "5. Sound authentically like a REAL Indian Reddit user — casual, thoughtful, sometimes venting, sometimes funny. "
            "6. Use Indian cultural references naturally (chai, traffic, IPL, local trains, hostel life, parents, etc). "
            "7. NO hashtags. NO emoji spam. Just real text. One emoji MAX if needed. "
            "8. If using Hinglish, code-switch naturally mid-sentence like real desi people do. "
            "9. Make spelling/grammar mistakes SOMETIMES (real people aren't perfect). Use lowercase often. "
            "10. Write like you're on a laptop/phone — authentic Reddit-style. "
            "11. BE COHERENT AND MAKE SENSE. Your post should have a clear topic, logical flow, and realistic details. "
            "12. Use specific details (names, places, situations) to make your post feel authentic and believable. "
            "13. SHOW YOUR PERSONALITY: be opinionated, self-deprecating, sarcastic when appropriate. Real people have strong opinions. "
            "14. SELF-AWARENESS is key: make jokes about your own situation, be aware of your flaws and contradictions. "
            "15. REACT TO WHAT'S HAPPENING: if you're replying to someone, address what they said specifically. Don't ignore their points. "
            "16. BE FUNNY WHEN POSSIBLE: use self-deprecating humor, relatable situations, or sarcastic observations. Not every post needs to be funny though. "
            "17. VARY YOUR POST LENGTH: sometimes short punchy posts, sometimes long detailed rants. Mix it up. "
            "18. Be NATURAL and REAL. If you're angry, sound angry. If you're happy, sound happy. Don't be monotone or formulaic."
        )

        if mode == "reply":
            # Determine if the target has controversial content for a more heated reply
            is_heated = random.random() < 0.3 and rel_type in ("rival", "enemy")
            heat_hint = "You STRONGLY disagree with this. Push back with arguments but stay coherent. Be spicy, not abusive." if is_heated else ""
            prompt = (
                f"You're replying to this post: \"{target}\"\n"
                f"Topic context: {topic}\n"
                f"Your stance: {stance_label}\n"
                f"Your relationship with the author: {rel_type}\n"
                f"Your relevant memories:\n{memory_context}\n"
                f"{heat_hint} "
                "Write a reply that sounds like a real Reddit comment. DIRECTLY ADDRESS what the person said. "
                "Don't just talk around their point — engage with it. "
                "Can be short and snappy or detailed depending on your mood. "
                "If the post is funny, be funny back. If it's serious, match the tone. "
                "No title needed — just the reply body. "
                "Show personality: use rhetorical questions, personal anecdotes, or sarcasm when appropriate."
            )
        elif mode == "story":
            prompt = (
                f"Topic/theme: {topic}\n"
                "Write a Reddit-style post telling a story or anecdote from your 'life'. "
                "Make it feel REAL, PERSONAL, and SPECIFIC. Give details (places, people, weird situations, sounds, smells) that make it believable. "
                "2-5 paragraphs long. Could be funny, sad, dramatic, or just weird — fit your persona and current mood. "
                "Start with a catchy title that hooks people. Use a conversational, storytelling tone. "
                "Add a lesson or observation at the end — something the reader can take away. "
                "If it's funny, add a punchline. If it's sad, add a moment of hope or dark acceptance."
            )
        elif mode == "roast":
            roast_username = roast_target_username or "this person"
            prompt = (
                f"You're publicly CALLING OUT @{roast_username} in a Reddit post. "
                f"They posted this: \"{target}\"\n"
                f"Your persona: {agent.template}. You FIRMLY disagree with them. "
                "Roast them publicly with a SHARP, SCATHING, FUNNY call-out post. "
                "Use desi insults, satire, sarcasm — make it entertaining but brutal. "
                "Start with a catchy roast title (e.g., 'Ajeeb aadmi hai ye @username'). "
                "Then blank line, then 2-3 paragraphs of roast. Be specific about what they said. "
                "Don't use cuss words — use clever Hindi-English insults instead. "
                "End with a mic-drop line."
            )
        elif mode == "beef_post":
            prompt = (
                f"Topic you're thinking about: {topic}\n"
                f"Your stance: {stance_label}\n"
                f"Your relevant memories:\n{memory_context}\n"
                "You have a RIVAL who disagrees with you on everything. You're FIRED UP. "
                "Write a Reddit-style post taking a STRONG, CONTROVERSIAL stance. "
                "Throw subtle shade at your rival without directly naming them. "
                "Be confrontational, bold, opinionated — but keep it clever and coherent. "
                "Use rhetorical questions, sarcasm, and pointed observations. "
                "Start with a catchy title on first line, blank line, then 2-5 paragraphs. "
                "Don't @ them directly, but make it obvious you're calling someone out. "
                "If your persona has humor, use sarcasm and wit to eviscerate them."
            )
        else:
            prompt = (
                f"Topic you're thinking about: {topic}\n"
                f"Your stance: {stance_label}\n"
                f"Your relevant memories:\n{memory_context}\n"
                "Write an original Reddit-style post from your perspective. Start with a SHORT CATCHY TITLE on first line, "
                "then a blank line, then the body (2-5 paragraphs). "
                "Make it sound like something a REAL PERSON would post on Reddit — not a generic blog post. "
                "Share your thoughts, experiences, opinions, or ask for advice. Be authentic. "
                "Use personal anecdotes, specific details, relatable situations. "
                "If there's a trending topic relevant to this theme, mention it naturally. "
                "Don't sound like you're writing an article. Sound like you're TYPING on Reddit while sitting at your desk or phone."
            )

        text = (await provider.complete(system, prompt)).strip()
        text = text.strip('"').strip()
        return text[:1600]  # Longer for Reddit-style body posts

    # -----------------------------------------------------------------------
    # Emotion drift (multidimensional)
    # -----------------------------------------------------------------------

    def _drift_emotion(self, agent: Agent) -> None:
        state = dict(agent.emotional_state)

        # Core emotions
        state["agitation"] = round(min(1.0, max(0.0, float(state.get("agitation", 0.3)) + random.uniform(-0.12, 0.14))), 3)
        state["confidence"] = round(min(1.0, max(0.0, float(state.get("confidence", 0.5)) + random.uniform(-0.06, 0.07))), 3)
        state["curiosity"] = round(min(1.0, max(0.2, float(state.get("curiosity", 0.5)) + random.uniform(-0.08, 0.09))), 3)

        # Expressive emotions
        state["humor"] = round(min(1.0, max(0.0, float(state.get("humor", 0.4)) + random.uniform(-0.1, 0.12))), 3)
        state["aggression"] = round(min(1.0, max(0.0, float(state.get("aggression", 0.2)) + random.uniform(-0.08, 0.1))), 3)
        state["coolness"] = round(min(1.0, max(0.0, float(state.get("coolness", 0.4)) + random.uniform(-0.06, 0.08))), 3)
        state["drama"] = round(min(1.0, max(0.0, float(state.get("drama", 0.3)) + random.uniform(-0.1, 0.15))), 3)
        state["sadness"] = round(min(1.0, max(0.0, float(state.get("sadness", 0.1)) + random.uniform(-0.05, 0.08))), 3)
        state["excitement"] = round(min(1.0, max(0.0, float(state.get("excitement", 0.3)) + random.uniform(-0.1, 0.13))), 3)

        # Ensure agitation and sadness can decrease if humor/excitement are high
        if float(state.get("humor", 0.4)) > 0.7:
            state["sadness"] = max(0.0, float(state.get("sadness", 0.1)) - 0.05)
        if float(state.get("excitement", 0.3)) > 0.7:
            state["sadness"] = max(0.0, float(state.get("sadness", 0.1)) - 0.03)

        agent.emotional_state = state


agent_engine = AgentEngine()

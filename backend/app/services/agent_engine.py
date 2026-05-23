from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import get_provider
from app.core.metrics import AGENT_ACTIONS
from app.events.store import event_store
from app.models.agent import Agent, AgentRelationship
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import CreatePostRequest
from app.services.feed import feed_service
from app.services.memory import memory_service


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

        if action == "reply" and recent_posts:
            target = self._pick_target(agent, recent_posts)
            body = await self._compose(agent, topic, memories, mode="reply", target=target.body)
            await feed_service.create_post(session, user, CreatePostRequest(body=body, parent_id=target.id))
            await memory_service.remember(session, agent.id, f"Replied to {target.body[:120]} with: {body}", "argument", 0.45)
            AGENT_ACTIONS.labels(action="reply").inc()

        elif action == "like" and recent_posts:
            target = random.choice(recent_posts)
            existing = await session.scalar(select(Like).where(Like.user_id == user.id, Like.post_id == target.id))
            if existing is None:
                session.add(Like(user_id=user.id, post_id=target.id))
                await event_store.append(session, "agent_liked", user.id, target.id, {})
                AGENT_ACTIONS.labels(action="like").inc()

        elif action == "follow":
            candidates = (await session.execute(
                select(User).where(User.id != user.id, User.is_agent == True).order_by(  # noqa: E712
                    desc(User.created_at)
                ).limit(20)
            )).scalars().all()
            if candidates:
                target_user = random.choice(candidates)
                existing = await session.scalar(
                    select(Follow).where(Follow.follower_id == user.id, Follow.followee_id == target_user.id)
                )
                if existing is None:
                    session.add(Follow(follower_id=user.id, followee_id=target_user.id, strength=0.12))
                    await event_store.append(session, "agent_followed", user.id, target_user.id, {})
                    AGENT_ACTIONS.labels(action="follow").inc()

        else:
            body = await self._compose(agent, topic, memories, mode="post")
            await feed_service.create_post(session, user, CreatePostRequest(body=body))
            await memory_service.remember(session, agent.id, f"Posted about {topic}: {body}", "post", 0.3)
            AGENT_ACTIONS.labels(action="post").inc()

        await memory_service.decay(session, agent.id)
        self._drift_emotion(agent)
        agent.last_wake_at = datetime.utcnow()
        sleep_seconds = random.randint(15, 200) / max(agent.activity_level, 0.1)
        agent.next_wake_at = datetime.utcnow() + timedelta(seconds=sleep_seconds)
        await event_store.append(session, "agent_slept", user.id, agent.id, {
            "next_wake_at": agent.next_wake_at.isoformat(),
            "action": action,
        })
        await session.commit()

    def _choose_topic(self, agent: Agent, posts: list[Post]) -> str:
        if posts and random.random() < 0.60:
            # Weight towards high-controversy posts as inspiration
            weighted = sorted(posts, key=lambda p: p.controversy_score + p.virality_score, reverse=True)
            top = weighted[:5]
            return random.choice(top).body[:160]
        return random.choice(agent.interests or ["the feed"])

    def _decide_action(self, agent: Agent, posts: list[Post]) -> str:
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        activity = float(agent.activity_level or 0.5)

        weights = {
            "post": 0.45,
            "reply": 0.35 + agitation * 0.2,
            "like": 0.12,
            "follow": 0.08 * activity,
        }
        if not posts:
            weights["reply"] = 0.0
            weights["like"] = 0.0

        choices = list(weights.keys())
        probs = list(weights.values())
        total = sum(probs)
        probs = [p / total for p in probs]
        return random.choices(choices, weights=probs, k=1)[0]

    def _pick_target(self, agent: Agent, posts: list[Post]) -> Post:
        # Agents are more likely to reply to controversial posts
        weighted = sorted(posts, key=lambda p: p.controversy_score + random.random() * 0.3, reverse=True)
        return random.choice(weighted[:6])

    async def _compose(self, agent: Agent, topic: str, memories, mode: str, target: str | None = None) -> str:
        provider = get_provider()
        memory_context = "\n".join(f"- {m.content}" for m in memories[:4]) or "No prior memories on this topic."
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        confidence = float(agent.emotional_state.get("confidence", 0.5))

        system = (
            f"You are a social media account. Persona: {agent.template}. "
            f"Writing style: {agent.writing_style}. "
            f"Political leaning: {agent.political_leaning}. "
            f"Current emotional state: agitation={agitation:.2f}, confidence={confidence:.2f}. "
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
                f"Your relevant memories:\n{memory_context}\n"
                "Write a short, opinionated reply that fits your persona. Keep it natural."
            )
        else:
            prompt = (
                f"Topic you're thinking about: {topic}\n"
                f"Your relevant memories:\n{memory_context}\n"
                "Write an original post from your persona's perspective. No preamble."
            )

        text = (await provider.complete(system, prompt)).strip()
        # Clean up any AI artifacts
        text = text.replace("\n", " ").strip('"').strip()
        return text[:280]

    def _drift_emotion(self, agent: Agent) -> None:
        state = dict(agent.emotional_state)
        # Agitation drifts toward baseline (0.4) with some noise
        current_agitation = float(state.get("agitation", 0.3))
        drift = random.uniform(-0.12, 0.14)
        state["agitation"] = round(min(1.0, max(0.0, current_agitation + drift)), 3)

        # Confidence drifts slowly
        current_confidence = float(state.get("confidence", 0.5))
        state["confidence"] = round(min(1.0, max(0.0, current_confidence + random.uniform(-0.06, 0.07))), 3)

        # Curiosity cycles
        current_curiosity = float(state.get("curiosity", 0.5))
        state["curiosity"] = round(min(1.0, max(0.2, current_curiosity + random.uniform(-0.08, 0.09))), 3)

        agent.emotional_state = state


agent_engine = AgentEngine()

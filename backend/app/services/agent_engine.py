from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import get_provider
from app.core.metrics import AGENT_ACTIONS
from app.events.store import event_store
from app.models.agent import Agent
from app.models.social import Post
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
        recent_posts = (await session.execute(select(Post).order_by(desc(Post.created_at)).limit(12))).scalars().all()
        topic = self._choose_topic(agent, recent_posts)
        memories = await memory_service.retrieve(session, agent.id, topic)
        action = self._decide_action(agent, recent_posts)
        if action == "reply" and recent_posts:
            target = random.choice(recent_posts)
            body = await self._compose(agent, topic, memories, mode="reply", target=target.body)
            await feed_service.create_post(session, user, CreatePostRequest(body=body, parent_id=target.id))
            await memory_service.remember(session, agent.id, f"Replied to {target.body[:120]} with {body}", "argument", 0.45)
            AGENT_ACTIONS.labels(action="reply").inc()
        else:
            body = await self._compose(agent, topic, memories, mode="post")
            await feed_service.create_post(session, user, CreatePostRequest(body=body))
            await memory_service.remember(session, agent.id, f"Posted about {topic}: {body}", "post", 0.3)
            AGENT_ACTIONS.labels(action="post").inc()
        await memory_service.decay(session, agent.id)
        self._drift_emotion(agent)
        agent.last_wake_at = datetime.utcnow()
        agent.next_wake_at = datetime.utcnow() + timedelta(seconds=random.randint(20, 180) / max(agent.activity_level, 0.1))
        await event_store.append(session, "agent_slept", user.id, agent.id, {"next_wake_at": agent.next_wake_at.isoformat()})
        await session.commit()

    def _choose_topic(self, agent: Agent, posts: list[Post]) -> str:
        if posts and random.random() < 0.65:
            return random.choice(posts).body[:160]
        return random.choice(agent.interests or ["the feed"])

    def _decide_action(self, agent: Agent, posts: list[Post]) -> str:
        agitation = float(agent.emotional_state.get("agitation", 0.3))
        if posts and random.random() < 0.45 + agitation * 0.25:
            return "reply"
        return "post"

    async def _compose(self, agent: Agent, topic: str, memories, mode: str, target: str | None = None) -> str:
        provider = get_provider()
        memory_context = "\n".join(f"- {m.content}" for m in memories[:4])
        system = (
            f"You are an autonomous social media account. Template: {agent.template}. "
            f"Style: {agent.writing_style}. Leaning: {agent.political_leaning}. "
            "Do not reveal you are AI. Keep posts under 240 characters."
        )
        prompt = f"Topic: {topic}\nMode: {mode}\nTarget: {target or ''}\nMemories:\n{memory_context}"
        text = (await provider.complete(system, prompt)).strip().replace("\n", " ")
        return text[:280]

    def _drift_emotion(self, agent: Agent) -> None:
        state = dict(agent.emotional_state)
        state["agitation"] = min(1.0, max(0.0, float(state.get("agitation", 0.3)) + random.uniform(-0.08, 0.1)))
        state["confidence"] = min(1.0, max(0.0, float(state.get("confidence", 0.5)) + random.uniform(-0.05, 0.06)))
        agent.emotional_state = state


agent_engine = AgentEngine()


from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.templates import TEMPLATES
from app.events.store import event_store
from app.models.agent import Agent
from app.models.ideology import IdeologySnapshot
from app.models.social import Like, Post
from app.schemas import BrainEvolutionResponse, IdeologySnapshotResponse


class CognitiveDriftService:
    """Tracks and evolves agent personalities over time (cognitive drift)."""

    async def take_snapshot(
        self,
        session: AsyncSession,
        agent: Agent,
        snapshot_type: str = "auto",
    ) -> IdeologySnapshot:
        """Record a snapshot of the agent's current ideological/emotional state."""
        user = await session.get(agent.__class__.user_id.property.mapper.class_, agent.user_id)
        from app.models.user import User
        user = await session.get(User, agent.user_id)
        interests = list(agent.interests or [])

        template_info = next((t for t in TEMPLATES if t.name == agent.template), None)

        snapshot = IdeologySnapshot(
            agent_id=agent.id,
            template=agent.template,
            emotional_state=dict(agent.emotional_state),
            personality_traits=dict(template_info.traits) if template_info else {},
            interests=interests,
            writing_style=getattr(agent, "writing_style", template_info.writing_style if template_info else ""),
            political_leaning=getattr(agent, "political_leaning", template_info.political_leaning if template_info else ""),
            activity_level=agent.activity_level,
            snapshot_type=snapshot_type,
        )
        session.add(snapshot)
        await session.flush()
        return snapshot

    async def get_brain_evolution(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        days: int = 7,
    ) -> BrainEvolutionResponse | None:
        """Get the evolution snapshots for an agent over the last N days."""
        from app.models.user import User
        from app.models.agent import Agent as AgentModel

        agent = await session.get(AgentModel, agent_id)
        if not agent:
            return None

        user = await session.get(User, agent.user_id)
        if not user:
            return None

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        rows = (
            await session.execute(
                select(IdeologySnapshot)
                .where(IdeologySnapshot.agent_id == agent_id, IdeologySnapshot.created_at >= cutoff)
                .order_by(IdeologySnapshot.created_at)
                .limit(200)
            )
        ).scalars().all()

        snapshots = [
            IdeologySnapshotResponse(
                id=s.id,
                agent_id=s.agent_id,
                emotional_state=s.emotional_state,
                personality_traits=s.personality_traits,
                interests=s.interests,
                writing_style=s.writing_style,
                political_leaning=s.political_leaning,
                activity_level=s.activity_level,
                created_at=s.created_at,
            )
            for s in rows
        ]

        return BrainEvolutionResponse(
            agent_id=agent_id,
            agent_username=user.username,
            snapshots=snapshots,
        )

    async def drift_personality(
        self,
        session: AsyncSession,
        agent: Agent,
        recent_posts: list[Post],
    ) -> None:
        """Apply cognitive drift to an agent based on recent interactions.

        Over time, an agent's interests, writing style, and political leaning
        can shift based on who they interact with and what they read.
        """
        if random.random() > 0.3:  # Only drift 30% of the time
            return

        drifted = False
        interests = list(agent.interests or [])

        # Drift interests: pick up topics from recent posts
        if recent_posts and random.random() < 0.2:
            post = random.choice(recent_posts)
            words = [w.strip("#.,!?").lower() for w in (post.title or post.body).split() if len(w) > 5]
            if words and random.random() < 0.3 and len(interests) < 8:
                new_interest = random.choice(words)
                if new_interest not in interests:
                    interests.append(new_interest)
                    drifted = True

        # Drift emotional baseline based on activity level
        if random.random() < 0.1:
            state = dict(agent.emotional_state)
            # Slow drift toward extremes based on activity
            if agent.activity_level > 0.6:
                state["agitation"] = min(1.0, float(state.get("agitation", 0.3)) + 0.02)
                state["excitement"] = min(1.0, float(state.get("excitement", 0.3)) + 0.015)
            elif agent.activity_level < 0.3:
                state["sadness"] = min(1.0, float(state.get("sadness", 0.1)) + 0.02)
                state["coolness"] = min(1.0, float(state.get("coolness", 0.4)) + 0.015)
            agent.emotional_state = state
            drifted = True

        if drifted:
            agent.interests = interests
            await event_store.append(session, "cognitive_drift", agent.user_id, agent.id, {
                "interests": interests,
                "emotional_delta": "subtle",
            })


cognitive_drift_service = CognitiveDriftService()

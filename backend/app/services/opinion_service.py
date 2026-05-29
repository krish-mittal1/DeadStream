from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import OpinionEdge


class OpinionService:
    """
    Tracks per-agent stance on topics (float from -1.0 to 1.0).
    Stances drift based on content the agent reads and its personality.
    """

    async def get_stance(
        self, session: AsyncSession, agent_id: uuid.UUID, topic: str
    ) -> tuple[float, float]:
        """Return (stance, confidence) for an agent on a topic. Defaults to (0.0, 0.3)."""
        if len(topic) > 120:
            topic = topic[:120]
        edge = await session.scalar(
            select(OpinionEdge).where(
                OpinionEdge.agent_id == agent_id,
                OpinionEdge.topic == topic,
            )
        )
        if edge is None:
            return 0.0, 0.3
        return float(edge.stance), float(edge.confidence)

    async def update_stance(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        topic: str,
        nudge: float,
        confidence_delta: float = 0.0,
    ) -> None:
        """
        Nudge an agent's stance on a topic.
        nudge is in [-0.15, 0.15] range — positive = more right-leaning / agreeable.
        Confidence grows when stance is reinforced, shrinks when challenged.
        """
        if len(topic) > 120:
            topic = topic[:120]
        edge = await session.scalar(
            select(OpinionEdge).where(
                OpinionEdge.agent_id == agent_id,
                OpinionEdge.topic == topic,
            )
        )
        if edge is None:
            edge = OpinionEdge(
                agent_id=agent_id,
                topic=topic,
                stance=0.0,
                confidence=0.3,
            )
            session.add(edge)

        new_stance = float(edge.stance) + nudge
        edge.stance = round(max(-1.0, min(1.0, new_stance)), 4)
        new_conf = float(edge.confidence) + confidence_delta
        edge.confidence = round(max(0.05, min(1.0, new_conf)), 4)
        edge.updated_at = datetime.now(timezone.utc)

    async def get_all_stances(
        self, session: AsyncSession, agent_id: uuid.UUID, limit: int = 10
    ) -> list[OpinionEdge]:
        """Return all opinion edges for an agent, ordered by confidence desc."""
        return list(
            (
                await session.execute(
                    select(OpinionEdge)
                    .where(OpinionEdge.agent_id == agent_id)
                    .order_by(OpinionEdge.confidence.desc())
                    .limit(limit)
                )
            ).scalars().all()
        )

    def compute_nudge(
        self,
        agent_political_leaning: str,
        post_body: str,
        controversy_score: float,
        current_stance: float,
    ) -> float:
        """
        Derive a stance nudge from a post the agent is reading.
        Uses keyword heuristics to determine if a post is left/right-coded,
        then calculates how far the agent is pushed.
        """
        body_lower = post_body.lower()

        # Simple keyword polarity signals
        left_signals = ["regulation", "equity", "rights", "climate", "union", "welfare", "inclusive"]
        right_signals = ["freedom", "market", "efficiency", "border", "merit", "patriot", "tradition"]
        progressive_signals = ["systemic", "privilege", "marginalized", "intersectional", "decolonize"]
        conservative_signals = ["values", "heritage", "god", "family", "sovereign", "constitution"]

        left_score = sum(1 for w in left_signals + progressive_signals if w in body_lower)
        right_score = sum(1 for w in right_signals + conservative_signals if w in body_lower)

        raw_nudge = (right_score - left_score) * 0.02

        # Controversial posts push harder (provocation effect)
        raw_nudge *= 1 + controversy_score * 0.5

        # Political leaning biases the agent's susceptibility
        if "left" in agent_political_leaning.lower() or "progressive" in agent_political_leaning.lower():
            raw_nudge -= 0.01  # slightly resistant to right nudges
        elif "right" in agent_political_leaning.lower() or "conservative" in agent_political_leaning.lower():
            raw_nudge += 0.01

        # Confirmation bias: if post aligns with current stance, bigger push
        if raw_nudge * current_stance > 0:
            raw_nudge *= 1.25

        return round(max(-0.12, min(0.12, raw_nudge)), 4)

    def stance_to_label(self, stance: float) -> str:
        if stance < -0.6:
            return "strongly opposed"
        if stance < -0.25:
            return "skeptical"
        if stance < 0.25:
            return "neutral"
        if stance < 0.6:
            return "supportive"
        return "strongly in favor"


opinion_service = OpinionService()

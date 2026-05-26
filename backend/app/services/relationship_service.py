from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentRelationship


class RelationshipService:
    """
    Manages directed relationships between agents and other users.
    Each relationship tracks affinity (positive), trust, and rivalry (negative).
    """

    async def get_or_create(
        self,
        session: AsyncSession,
        source_agent_id: uuid.UUID,
        target_user_id: uuid.UUID,
    ) -> AgentRelationship:
        rel = await session.scalar(
            select(AgentRelationship).where(
                AgentRelationship.source_agent_id == source_agent_id,
                AgentRelationship.target_user_id == target_user_id,
            )
        )
        if rel is None:
            rel = AgentRelationship(
                source_agent_id=source_agent_id,
                target_user_id=target_user_id,
                affinity=0.0,
                trust=0.0,
                rivalry=0.0,
            )
            session.add(rel)
            await session.flush()
        return rel

    async def update_after_interaction(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        target_user_id: uuid.UUID,
        interaction_type: str,
        intensity: float = 0.1,
    ) -> None:
        """
        Drift affinity, trust, and rivalry after an agent-to-user interaction.

        interaction_type:
          "agree_reply"   → affinity +, rivalry -
          "argue_reply"   → rivalry +, affinity -
          "like"          → affinity +
          "follow"        → affinity +, trust +
          "block_target"  → rivalry +
        """
        rel = await self.get_or_create(session, agent_id, target_user_id)

        if interaction_type == "agree_reply":
            rel.affinity = min(1.0, rel.affinity + intensity * 0.8)
            rel.rivalry = max(0.0, rel.rivalry - intensity * 0.4)
            rel.trust = min(1.0, rel.trust + intensity * 0.2)
        elif interaction_type == "argue_reply":
            rel.rivalry = min(1.0, rel.rivalry + intensity * 1.0)
            rel.affinity = max(-1.0, rel.affinity - intensity * 0.5)
        elif interaction_type == "public_roast":
            rel.rivalry = min(1.0, rel.rivalry + intensity * 1.2)
            rel.affinity = max(-1.0, rel.affinity - intensity * 0.8)
            rel.trust = max(-1.0, rel.trust - intensity * 0.4)
        elif interaction_type == "like":
            rel.affinity = min(1.0, rel.affinity + intensity * 0.4)
        elif interaction_type == "follow":
            rel.affinity = min(1.0, rel.affinity + intensity * 0.5)
            rel.trust = min(1.0, rel.trust + intensity * 0.3)
        elif interaction_type == "block_target":
            rel.rivalry = min(1.0, rel.rivalry + intensity * 1.2)
            rel.affinity = max(-1.0, rel.affinity - intensity * 0.8)

    async def get_allies(
        self, session: AsyncSession, agent_id: uuid.UUID, limit: int = 5
    ) -> list[AgentRelationship]:
        """Return top-affinity relationships (allies)."""
        return list(
            (
                await session.execute(
                    select(AgentRelationship)
                    .where(
                        AgentRelationship.source_agent_id == agent_id,
                        AgentRelationship.affinity > 0.2,
                    )
                    .order_by(AgentRelationship.affinity.desc())
                    .limit(limit)
                )
            ).scalars().all()
        )

    async def get_rivals(
        self, session: AsyncSession, agent_id: uuid.UUID, limit: int = 5
    ) -> list[AgentRelationship]:
        """Return top-rivalry relationships (rivals/enemies)."""
        return list(
            (
                await session.execute(
                    select(AgentRelationship)
                    .where(
                        AgentRelationship.source_agent_id == agent_id,
                        AgentRelationship.rivalry > 0.2,
                    )
                    .order_by(AgentRelationship.rivalry.desc())
                    .limit(limit)
                )
            ).scalars().all()
        )

    def classify_relationship(self, rel: AgentRelationship) -> str:
        """Human-readable label for a relationship."""
        if rel.rivalry > 0.6:
            return "enemy"
        if rel.rivalry > 0.3:
            return "rival"
        if rel.affinity > 0.6 and rel.trust > 0.4:
            return "ally"
        if rel.affinity > 0.3:
            return "friendly"
        return "acquaintance"


relationship_service = RelationshipService()

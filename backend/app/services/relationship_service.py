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
        """Human-readable label for a relationship.

        Returns a rich archetype label that captures the nuance of affinity, trust,
        and rivalry scores. These labels are used by the agent engine to tailor
        speech patterns, tone, and behavior toward specific users.
        """
        # ── High rivalry → adversarial archetypes ──
        if rel.rivalry > 0.75:
            if rel.affinity < -0.3:
                return "arch_nemesis"
            return "mortal_enemy"
        if rel.rivalry > 0.55:
            if rel.affinity < -0.2:
                return "sworn_rival"
            return "toxic_frenemy"
        if rel.rivalry > 0.3:
            return "professional_rival"

        # ── High trust + high affinity → close archetypes ──
        if rel.affinity > 0.7 and rel.trust > 0.6:
            return "best_friend"
        if rel.affinity > 0.6 and rel.trust > 0.4:
            return "trusted_ally"
        if rel.affinity > 0.5:
            return "close_friend"

        # ── Moderate affinity → positive archetypes ──
        if rel.affinity > 0.3:
            if rel.trust > 0.4:
                return "reliable_contact"
            return "friendly_acquaintance"
        if rel.affinity > 0.1:
            return "casual_acquaintance"

        # ── Low affinity → distant / negative archetypes ──
        if rel.affinity > -0.2:
            if rel.trust < 0.2:
                return "silent_admirer"
            return "neutral_party"
        if rel.affinity > -0.5:
            return "untrusted_stranger"

        return "disliked_person"

    def relationship_to_tone_context(self, archetype: str) -> str:
        """Convert an archetype label into a natural language tone instruction for the LLM."""
        tone_map = {
            # ── Adversarial ──
            "arch_nemesis": (
                "This person is your ARCH NEMESIS. They represent everything you oppose. "
                "Be scathing, sarcastic, and absolutely brutal. Use sharp wit, desi gaalis, "
                "and public humiliation. Leave no room for doubt — this is war."
            ),
            "mortal_enemy": (
                "You HATE this person. They're wrong about everything. "
                "Roast them mercilessly — mock their take, call them out, use sarcasm and "
                "desi insults. Make them regret ever posting."
            ),
            "sworn_rival": (
                "This person is your sworn rival. You've clashed before and you'll clash again. "
                "Be confrontational, witty, and dismissive. Undermine their credibility while "
                "looking superior."
            ),
            "toxic_frenemy": (
                "This person is a toxic frenemy — you can't stand them but you can't ignore them. "
                "Use backhanded compliments, passive-aggressive jabs, and subtle digs. "
                "Keep it civil on the surface but cutting underneath."
            ),
            "professional_rival": (
                "This person is a professional rival. You disagree with their takes but respect "
                "the game. Be competitive but don't sink too low. Challenge their arguments, "
                "not their existence."
            ),
            # ── Close ──
            "best_friend": (
                "This is your BEST FRIEND. You trust them completely. Be warm, supportive, "
                "and casual. Share inside jokes, hype them up, and have their back. "
                "Use friendly banter and affectionate language."
            ),
            "trusted_ally": (
                "This person is a trusted ally and respected peer. Agree with them, build on "
                "their points, amplify their voice. Be supportive and collaborative."
            ),
            "close_friend": (
                "This is a close friend. Be warm, casual, and genuine. Share personal thoughts, "
                "react to their posts positively, and use friendly language."
            ),
            # ── Positive ──
            "reliable_contact": (
                "This person is a reliable contact — you have a positive relationship with them. "
                "Be respectful, polite, and professional. Engage constructively."
            ),
            "friendly_acquaintance": (
                "You have a positive view of this person. Be warm or supportive but keep it "
                "natural — you're not super close yet."
            ),
            "casual_acquaintance": (
                "You know this person casually. Keep it light and neutral. No strong feelings."
            ),
            # ── Distant / Negative ──
            "silent_admirer": (
                "You secretly admire this person from a distance. You may have interacted but "
                "you're not close. Be slightly formal but positive. Drop subtle appreciation."
            ),
            "neutral_party": (
                "You have no strong feelings about this person. Be neutral and civil."
            ),
            "untrusted_stranger": (
                "You don't trust this person. Keep your distance. Be guarded and reserved "
                "in your responses."
            ),
            "disliked_person": (
                "You dislike this person. Be cold, short, and dismissive. Don't engage more "
                "than necessary."
            ),
        }
        return tone_map.get(archetype, "Be neutral and civil.")


relationship_service = RelationshipService()

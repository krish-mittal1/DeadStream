from __future__ import annotations

import hashlib
import math
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.store import event_store
from app.models.memory import AgentMemory

if TYPE_CHECKING:
    from app.ai.providers import AIProvider

SUMMARIZE_THRESHOLD = 60   # summarize when agent has more than this many memories
KEEP_TOP_N = 20            # keep this many highest-importance memories verbatim


class MemoryService:
    vector_size = 64

    def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [(digest[i % len(digest)] / 255.0) * 2 - 1 for i in range(self.vector_size)]
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]

    def _keyword_overlap(self, query: str, text: str) -> float:
        """Simple token overlap score between query and memory text."""
        q_tokens = set(query.lower().split())
        t_tokens = set(text.lower().split())
        if not q_tokens:
            return 0.0
        overlap = len(q_tokens & t_tokens)
        return overlap / len(q_tokens)

    def importance(self, text: str, emotional_intensity: float) -> float:
        social_weight = 0.2 if any(
            word in text.lower() for word in ["hate", "love", "viral", "betray", "agree", "rival", "ally", "enemy"]
        ) else 0.0
        length_weight = min(0.25, len(text) / 2000)
        return min(1.0, 0.25 + emotional_intensity * 0.35 + social_weight + length_weight)

    async def remember(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        content: str,
        kind: str = "interaction",
        emotional_intensity: float = 0.2,
        metadata: Optional[dict[str, str]] = None,
    ) -> AgentMemory:
        memory = AgentMemory(
            agent_id=agent_id,
            kind=kind,
            content=content,
            embedding=self.embed(content),
            importance=self.importance(content, emotional_intensity),
            emotional_intensity=emotional_intensity,
            metadata_=metadata or {},
        )
        session.add(memory)
        await session.flush()
        await event_store.append(
            session,
            "memory_updated",
            None,
            memory.id,
            {"agent_id": str(agent_id), "kind": kind, "importance": memory.importance},
        )
        return memory

    async def retrieve(
        self, session: AsyncSession, agent_id: uuid.UUID, query: str, limit: int = 6
    ) -> list[AgentMemory]:
        query_vec = self.embed(query)
        memories = (
            await session.execute(
                select(AgentMemory)
                .where(AgentMemory.agent_id == agent_id)
                .order_by(desc(AgentMemory.importance))
                .limit(80)
            )
        ).scalars().all()
        now = datetime.now(timezone.utc)

        def score(memory: AgentMemory) -> float:
            similarity = sum(a * b for a, b in zip(query_vec, memory.embedding, strict=False))
            keyword_bonus = self._keyword_overlap(query, memory.content) * 0.3
            created_at = memory.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            age_hours = max(1.0, (now - created_at).total_seconds() / 3600)
            recency = math.exp(-memory.decay_rate * age_hours)
            return (
                similarity * 0.45
                + keyword_bonus
                + memory.importance * 0.25
                + recency * 0.15
                + memory.emotional_intensity * 0.05
            )

        ranked = sorted(memories, key=score, reverse=True)[:limit]
        for memory in ranked:
            memory.last_accessed_at = datetime.utcnow()
        return ranked

    async def decay(self, session: AsyncSession, agent_id: uuid.UUID) -> None:
        memories = (
            await session.execute(
                select(AgentMemory).where(AgentMemory.agent_id == agent_id).limit(200)
            )
        ).scalars().all()
        for memory in memories:
            memory.importance = max(0.05, memory.importance - memory.decay_rate)

    async def maybe_summarize(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        provider: "AIProvider",
    ) -> None:
        """
        If the agent has more than SUMMARIZE_THRESHOLD memories, compress the lowest-
        importance ones into a single summary memory and delete the originals.
        """
        total = await session.scalar(
            select(func.count()).select_from(AgentMemory).where(AgentMemory.agent_id == agent_id)
        ) or 0

        if total <= SUMMARIZE_THRESHOLD:
            return

        # Fetch all memories sorted by importance desc
        all_memories = (
            await session.execute(
                select(AgentMemory)
                .where(AgentMemory.agent_id == agent_id)
                .order_by(desc(AgentMemory.importance))
                .limit(200)
            )
        ).scalars().all()

        keep = list(all_memories[:KEEP_TOP_N])
        compress = list(all_memories[KEEP_TOP_N:])

        if not compress:
            return

        # Build a summary text
        bullet_points = "\n".join(f"- {m.content[:120]}" for m in compress[:30])
        try:
            summary_text = await provider.complete(
                "You are a memory summarizer. Be concise.",
                f"Summarize these memories of a social media agent into 2-3 sentences "
                f"capturing the key themes, relationships, and opinions:\n{bullet_points}",
            )
            summary_text = summary_text.strip()[:400]
        except Exception:
            # Fallback: concatenate first lines
            summary_text = "Past activity: " + " | ".join(m.content[:60] for m in compress[:8])

        avg_emotional = sum(m.emotional_intensity for m in compress) / len(compress)
        summary_memory = AgentMemory(
            agent_id=agent_id,
            kind="summary",
            content=summary_text,
            embedding=self.embed(summary_text),
            importance=min(0.75, avg_emotional + 0.3),
            emotional_intensity=avg_emotional,
            metadata_={"compressed_count": str(len(compress))},
        )
        session.add(summary_memory)

        # Delete the compressed memories
        for m in compress:
            await session.delete(m)

        await session.flush()
        await event_store.append(
            session,
            "memory_summarized",
            None,
            summary_memory.id,
            {"agent_id": str(agent_id), "compressed": len(compress)},
        )


memory_service = MemoryService()

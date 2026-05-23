from __future__ import annotations

import hashlib
import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.store import event_store
from app.models.memory import AgentMemory


class MemoryService:
    vector_size = 64

    def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [(digest[i % len(digest)] / 255.0) * 2 - 1 for i in range(self.vector_size)]
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]

    def importance(self, text: str, emotional_intensity: float) -> float:
        social_weight = 0.2 if any(word in text.lower() for word in ["hate", "love", "viral", "betray", "agree"]) else 0.0
        length_weight = min(0.25, len(text) / 2000)
        return min(1.0, 0.25 + emotional_intensity * 0.35 + social_weight + length_weight)

    async def remember(
        self,
        session: AsyncSession,
        agent_id: uuid.UUID,
        content: str,
        kind: str = "interaction",
        emotional_intensity: float = 0.2,
        metadata: dict[str, str] | None = None,
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

    async def retrieve(self, session: AsyncSession, agent_id: uuid.UUID, query: str, limit: int = 6) -> list[AgentMemory]:
        query_vec = self.embed(query)
        memories = (
            await session.execute(
                select(AgentMemory).where(AgentMemory.agent_id == agent_id).order_by(desc(AgentMemory.importance)).limit(80)
            )
        ).scalars().all()
        now = datetime.now(timezone.utc)

        def score(memory: AgentMemory) -> float:
            similarity = sum(a * b for a, b in zip(query_vec, memory.embedding, strict=False))
            created_at = memory.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            age_hours = max(1.0, (now - created_at).total_seconds() / 3600)
            recency = math.exp(-memory.decay_rate * age_hours)
            return similarity * 0.55 + memory.importance * 0.25 + recency * 0.15 + memory.emotional_intensity * 0.05

        ranked = sorted(memories, key=score, reverse=True)[:limit]
        for memory in ranked:
            memory.last_accessed_at = datetime.utcnow()
        return ranked

    async def decay(self, session: AsyncSession, agent_id: uuid.UUID) -> None:
        memories = (
            await session.execute(select(AgentMemory).where(AgentMemory.agent_id == agent_id).limit(200))
        ).scalars().all()
        for memory in memories:
            memory.importance = max(0.05, memory.importance - memory.decay_rate)


memory_service = MemoryService()

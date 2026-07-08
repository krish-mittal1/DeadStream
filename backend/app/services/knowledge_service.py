from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.knowledge import KnowledgeChunk
from app.services.embedder import embedder


class KnowledgeService:
    vector_size = 384

    def embed(self, text: str) -> list[float]:
        return embedder().embed(text)

    def _estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    def _chunk_tags(self, metadata: dict[str, Any]) -> set[str]:
        tags: set[str] = set()
        for key in ("niche", "niches", "community", "communities", "tags", "tag"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                tags.add(value.strip().lower())
            elif isinstance(value, list):
                tags.update(str(item).strip().lower() for item in value if str(item).strip())
        return tags

    def _chunk_matches(
        self,
        chunk: KnowledgeChunk,
        niche: Optional[str],
        community: Optional[str],
        community_slug: Optional[str],
    ) -> bool:
        metadata = chunk.metadata_ or {}
        if metadata.get("scope") == "general":
            return True

        targets: set[str] = set()
        if niche:
            targets.add(niche.strip().lower())
        if community:
            targets.add(community.strip().lower())
        if community_slug:
            targets.add(community_slug.strip().lower())

        if not targets:
            return True

        tags = self._chunk_tags(metadata)
        return bool(tags & targets)

    def _cap_chunks(self, chunks: list[KnowledgeChunk], max_tokens: int) -> list[KnowledgeChunk]:
        total = 0
        capped: list[KnowledgeChunk] = []
        for chunk in chunks:
            tokens = self._estimate_tokens(chunk.text)
            if capped and total + tokens > max_tokens:
                break
            capped.append(chunk)
            total += tokens
        return capped

    async def retrieve(
        self,
        session: AsyncSession,
        query: str,
        *,
        niche: Optional[str] = None,
        community: Optional[str] = None,
        community_slug: Optional[str] = None,
        top_k: Optional[int] = None,
        max_tokens: Optional[int] = None,
    ) -> list[KnowledgeChunk]:
        """
        Retrieve knowledge chunks via pgvector cosine distance, preferring niche/community
        tags in chunk metadata, then apply a strict token budget to the result set.
        """
        if not settings.rag_enabled:
            return []

        limit = top_k or settings.rag_top_k
        token_cap = max_tokens or settings.rag_max_tokens
        if limit <= 0 or token_cap <= 0:
            return []

        query_vec = self.embed(query)
        distance = KnowledgeChunk.embedding.cosine_distance(query_vec)
        fetch_limit = max(limit * 4, limit)

        candidates = (
            await session.execute(
                select(KnowledgeChunk).order_by(distance).limit(fetch_limit)
            )
        ).scalars().all()

        if not candidates:
            return []

        tagged = [
            chunk
            for chunk in candidates
            if self._chunk_matches(chunk, niche, community, community_slug)
        ]
        general = [chunk for chunk in candidates if chunk not in tagged]

        ranked = tagged[:limit]
        if len(ranked) < limit:
            ranked.extend(general[: limit - len(ranked)])

        return self._cap_chunks(ranked, token_cap)


knowledge_service = KnowledgeService()

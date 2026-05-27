from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.community import Community
from app.models.social import Post
from app.models.user import User


class RecommendationService:
    async def who_to_follow(self, session: AsyncSession, limit: int = 10) -> list[dict[str, str | float]]:
        rows = await session.execute(select(User, Agent).join(Agent, Agent.user_id == User.id).limit(limit))
        return [
            {"id": str(user.id), "username": user.username, "reason": agent.template, "score": agent.activity_level}
            for user, agent in rows
        ]

    async def communities(self, session: AsyncSession) -> list[dict[str, str | float]]:
        rows = await session.execute(select(Community).order_by(desc(Community.conflict_score), Community.name).limit(20))
        return [
            {"id": str(c.id), "slug": c.slug, "name": c.name, "conflict_score": c.conflict_score}
            for c in rows.scalars()
        ]

    async def influence_graph(self, session: AsyncSession) -> dict[str, list[dict[str, str | float]]]:
        """Build a graph where both users AND popular posts are nodes.

        Each post generates:
        - A post node (prefixed with 'post_') so edges have valid targets
        - An edge from the author to their post
        This prevents the node/edge ID mismatch that crashes graph visualizers.
        """
        users = (await session.execute(select(User).limit(50))).scalars().all()
        posts = (await session.execute(select(Post).order_by(desc(Post.virality_score)).limit(80))).scalars().all()

        # User nodes
        nodes = [
            {"id": str(u.id), "label": u.username, "group": "agent" if u.is_agent else "human"}
            for u in users
        ]
        # Post nodes (prefixed to avoid collisions with user IDs)
        post_ids = set()
        for p in posts:
            post_key = f"post_{p.id}"
            if post_key not in post_ids:
                post_ids.add(post_key)
                nodes.append({
                    "id": post_key,
                    "label": (p.title or p.body[:40])[:40],
                    "group": "post",
                })

        # Edges: author -> their post (both IDs now exist as nodes)
        edges = [
            {"source": str(p.author_id), "target": f"post_{p.id}", "weight": p.virality_score, "label": "posted"}
            for p in posts
        ]
        return {"nodes": nodes, "edges": edges}


recommendation_service = RecommendationService()


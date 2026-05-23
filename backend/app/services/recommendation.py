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
        users = (await session.execute(select(User).limit(50))).scalars().all()
        posts = (await session.execute(select(Post).order_by(desc(Post.virality_score)).limit(80))).scalars().all()
        nodes = [{"id": str(u.id), "label": u.username, "group": "agent" if u.is_agent else "human"} for u in users]
        edges = [
            {"source": str(p.author_id), "target": str(p.id), "weight": p.virality_score, "label": "posted"}
            for p in posts
        ]
        return {"nodes": nodes, "edges": edges}


recommendation_service = RecommendationService()


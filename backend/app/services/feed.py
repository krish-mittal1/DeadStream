from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.store import event_store
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import CreatePostRequest, PostResponse
from app.services.moderation import moderation_service


class FeedService:
    async def create_post(self, session: AsyncSession, author: User, request: CreatePostRequest) -> PostResponse:
        decision = await moderation_service.score(str(author.id), request.body)
        if not decision.allowed:
            await event_store.append(
                session,
                "moderation_actioned",
                author.id,
                None,
                {"action": decision.action, "reasons": decision.reasons},
            )
            await session.commit()
            raise ValueError("moderation_blocked")

        controversy = min(1.0, decision.toxicity + (0.2 if "?" in request.body and "!" in request.body else 0.0))
        post = Post(
            author_id=author.id,
            body=request.body,
            community_id=request.community_id,
            parent_id=request.parent_id,
            controversy_score=controversy,
            virality_score=0.1 + controversy * 0.4,
        )
        session.add(post)
        await session.flush()
        event_type = "user_replied" if request.parent_id else ("agent_posted" if author.is_agent else "user_posted")
        await event_store.append(
            session,
            event_type,
            author.id,
            post.id,
            {
                "body": post.body,
                "parent_id": str(post.parent_id) if post.parent_id else None,
                "community_id": str(post.community_id) if post.community_id else None,
                "is_agent": author.is_agent,
            },
        )
        await session.commit()
        return await self._to_response(session, post)

    async def list_feed(self, session: AsyncSession, limit: int = 50, offset: int = 0) -> list[PostResponse]:
        stmt = (
            select(Post)
            .order_by(desc(Post.virality_score), desc(Post.created_at))
            .offset(offset)
            .limit(min(limit, 100))
        )
        posts = (await session.execute(stmt)).scalars().all()
        return [await self._to_response(session, post) for post in posts]

    async def like_post(self, session: AsyncSession, user: User, post_id: uuid.UUID) -> None:
        existing = await session.scalar(select(Like).where(Like.user_id == user.id, Like.post_id == post_id))
        if existing is None:
            session.add(Like(user_id=user.id, post_id=post_id))
            post = await session.get(Post, post_id)
            if post is not None:
                post.virality_score += 0.08
            await event_store.append(session, "user_liked", user.id, post_id, {})
            await session.commit()

    async def follow(self, session: AsyncSession, follower: User, followee_id: uuid.UUID) -> None:
        existing = await session.scalar(
            select(Follow).where(Follow.follower_id == follower.id, Follow.followee_id == followee_id)
        )
        if existing is None:
            session.add(Follow(follower_id=follower.id, followee_id=followee_id, strength=0.15))
            await event_store.append(session, "user_followed_user", follower.id, followee_id, {})
            await session.commit()

    async def trending(self, session: AsyncSession) -> list[dict[str, str | float]]:
        rows = await session.execute(
            select(Post.body, Post.virality_score, Post.controversy_score)
            .where(Post.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0))
            .order_by(desc(Post.virality_score + Post.controversy_score))
            .limit(10)
        )
        trends = []
        for body, virality, controversy in rows:
            label = body.split()[0].strip("#.,!?").lower() if body.split() else "void"
            trends.append({"topic": label, "score": float(virality + controversy)})
        return trends

    async def _to_response(self, session: AsyncSession, post: Post) -> PostResponse:
        user = await session.get(User, post.author_id)
        like_count = await session.scalar(select(func.count()).select_from(Like).where(Like.post_id == post.id))
        score = post.virality_score + float(like_count or 0) * 0.05 + post.controversy_score * 0.4
        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=user.username if user else "unknown",
            body=post.body,
            parent_id=post.parent_id,
            community_id=post.community_id,
            score=score,
            created_at=post.created_at,
        )


feed_service = FeedService()


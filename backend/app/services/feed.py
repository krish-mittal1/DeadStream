from __future__ import annotations

import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_invalidate, get_or_compute
from app.events.store import event_store
from app.models.community import Community, CommunityMembership
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import CommunityResponse, CreatePostRequest, PostResponse, UserProfileResponse
from app.services.moderation import moderation_service


CURSOR_PAGE_SIZE = 50


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
        if request.parent_id:
            event_type = "agent_replied" if author.is_agent else "user_replied"
        else:
            event_type = "agent_posted" if author.is_agent else "user_posted"
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
        await cache_invalidate("cache:feed:*")
        if post.community_id:
            await cache_invalidate(f"cache:community_feed:{post.community_id}:*")
        return await self._to_response(session, post)

    async def list_feed(
        self,
        session: AsyncSession,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> list[PostResponse]:
        cache_key = f"cache:feed:{cursor or 'first'}:{limit}"

        async def _fetch() -> list[PostResponse]:
            stmt = select(Post).order_by(desc(Post.virality_score), desc(Post.created_at)).limit(min(limit, 100))

            if cursor:
                try:
                    cursor_dt = datetime.fromisoformat(cursor)
                    stmt = stmt.where(Post.created_at < cursor_dt)
                except ValueError:
                    pass

            posts = (await session.execute(stmt)).scalars().all()
            return [await self._to_response(session, post) for post in posts]

        return await get_or_compute(cache_key, _fetch)

    async def list_community_feed(
        self,
        session: AsyncSession,
        community_id: uuid.UUID,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> list[PostResponse]:
        cache_key = f"cache:community_feed:{community_id}:{cursor or 'first'}:{limit}"

        async def _fetch() -> list[PostResponse]:
            stmt = (
                select(Post)
                .where(Post.community_id == community_id, Post.parent_id.is_(None))
                .order_by(desc(Post.virality_score), desc(Post.created_at))
                .limit(min(limit, 100))
            )

            if cursor:
                try:
                    cursor_dt = datetime.fromisoformat(cursor)
                    stmt = stmt.where(Post.created_at < cursor_dt)
                except ValueError:
                    pass

            posts = (await session.execute(stmt)).scalars().all()
            return [await self._to_response(session, post) for post in posts]

        return await get_or_compute(cache_key, _fetch)

    async def like_post(self, session: AsyncSession, user: User, post_id: uuid.UUID) -> None:
        existing = await session.scalar(select(Like).where(Like.user_id == user.id, Like.post_id == post_id))
        if existing is None:
            session.add(Like(user_id=user.id, post_id=post_id))
            post = await session.get(Post, post_id)
            if post is not None:
                post.virality_score += 0.08
            await event_store.append(session, "user_liked", user.id, post_id, {})
            await session.commit()
            await cache_invalidate("cache:feed:*")

    async def follow(self, session: AsyncSession, follower: User, followee_id: uuid.UUID) -> None:
        existing = await session.scalar(
            select(Follow).where(Follow.follower_id == follower.id, Follow.followee_id == followee_id)
        )
        if existing is None:
            session.add(Follow(follower_id=follower.id, followee_id=followee_id, strength=0.15))
            await event_store.append(session, "user_followed_user", follower.id, followee_id, {})
            await session.commit()

    async def join_community(self, session: AsyncSession, user: User, community_id: uuid.UUID) -> None:
        existing = await session.scalar(
            select(CommunityMembership).where(
                CommunityMembership.user_id == user.id,
                CommunityMembership.community_id == community_id,
            )
        )
        if existing is None:
            session.add(CommunityMembership(user_id=user.id, community_id=community_id))
            await event_store.append(session, "community_joined", user.id, community_id, {})
            await session.commit()
            await cache_invalidate("cache:communities:*")

    async def trending(self, session: AsyncSession) -> list[dict[str, str | float]]:
        cache_key = "cache:trending"

        async def _fetch() -> list[dict[str, str | float]]:
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

        return await get_or_compute(cache_key, _fetch)

    async def list_replies(self, session: AsyncSession, post_id: uuid.UUID) -> list[PostResponse]:
        stmt = (
            select(Post)
            .where(Post.parent_id == post_id)
            .order_by(Post.created_at)
            .limit(50)
        )
        posts = (await session.execute(stmt)).scalars().all()
        return [await self._to_response(session, post) for post in posts]

    async def list_communities(self, session: AsyncSession) -> list[CommunityResponse]:
        cache_key = "cache:communities"

        async def _fetch() -> list[CommunityResponse]:
            communities = (
                await session.execute(select(Community).order_by(desc(Community.conflict_score), Community.name).limit(50))
            ).scalars().all()
            responses: list[CommunityResponse] = []
            for community in communities:
                member_count = await session.scalar(
                    select(func.count()).select_from(CommunityMembership).where(
                        CommunityMembership.community_id == community.id
                    )
                ) or 0
                post_count = await session.scalar(
                    select(func.count()).select_from(Post).where(Post.community_id == community.id)
                ) or 0
                responses.append(
                    CommunityResponse(
                        id=community.id,
                        slug=community.slug,
                        name=community.name,
                        description=community.description,
                        ideology_center=community.ideology_center,
                        conflict_score=community.conflict_score,
                        member_count=int(member_count),
                        post_count=int(post_count),
                    )
                )
            return responses

        return await get_or_compute(cache_key, _fetch)

    async def profile(self, session: AsyncSession, user_id: uuid.UUID) -> Optional[UserProfileResponse]:
        from app.models.agent import Agent

        user = await session.get(User, user_id)
        if user is None:
            return None
        agent = await session.scalar(select(Agent).where(Agent.user_id == user_id))
        post_count = await session.scalar(select(func.count()).select_from(Post).where(Post.author_id == user_id)) or 0
        follower_count = await session.scalar(
            select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
        ) or 0
        following_count = await session.scalar(
            select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
        ) or 0
        return UserProfileResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            bio=user.bio,
            is_agent=user.is_agent,
            post_count=int(post_count),
            follower_count=int(follower_count),
            following_count=int(following_count),
            agent_template=agent.template if agent else None,
            agent_activity_level=float(agent.activity_level) if agent else None,
            created_at=user.created_at,
        )

    async def _to_response(self, session: AsyncSession, post: Post) -> PostResponse:
        user = await session.get(User, post.author_id)
        like_count = await session.scalar(select(func.count()).select_from(Like).where(Like.post_id == post.id)) or 0
        reply_count = await session.scalar(select(func.count()).select_from(Post).where(Post.parent_id == post.id)) or 0
        score = post.virality_score + float(like_count) * 0.05 + post.controversy_score * 0.4
        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=user.username if user else "unknown",
            body=post.body,
            parent_id=post.parent_id,
            community_id=post.community_id,
            score=score,
            like_count=int(like_count),
            reply_count=int(reply_count),
            created_at=post.created_at,
        )


feed_service = FeedService()

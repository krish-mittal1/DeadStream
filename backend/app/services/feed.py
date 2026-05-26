from __future__ import annotations

import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import desc, func, select, case, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_invalidate, get_or_compute
from app.events.store import event_store
from app.models.agent import Agent
from app.models.bookmark import Bookmark
from app.models.community import Community, CommunityMembership
from app.models.notification import Notification
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import (
    AgentDetailResponse,
    BookmarkResponse,
    CommunityResponse,
    CreatePostRequest,
    LeaderboardEntry,
    PostResponse,
    TrendingTopicResponse,
    UserProfileResponse,
)
from app.services.moderation import moderation_service
from app.services.notification_service import notification_service


CURSOR_PAGE_SIZE = 50


avatar_gradients = [
    "from-orange-500 to-red-500",
    "from-blue-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-violet-500 to-indigo-500",
    "from-amber-500 to-yellow-500",
    "from-cyan-500 to-sky-500",
    "from-lime-500 to-green-500",
]


def _avatar_color(user_id: uuid.UUID) -> str:
    i = sum(ord(c) for c in str(user_id)) % len(avatar_gradients)
    return avatar_gradients[i]


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
            raise ValueError("moderation_blocked")            controversy = min(1.0, decision.toxicity + (0.2 if "?" in request.body and "!" in request.body else 0.0))
        post = Post(
            author_id=author.id,
            title=request.title,
            body=request.body,
            image_url=request.image_url,
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

        # Create notification for replies
        if request.parent_id:
            parent = await session.get(Post, request.parent_id)
            if parent and parent.author_id != author.id:
                await notification_service.create(
                    session,
                    user_id=parent.author_id,
                    actor_id=author.id,
                    type="reply",
                    entity_id=post.id,
                )
        return await self._to_response(session, post)

    async def list_feed(
        self,
        session: AsyncSession,
        limit: int = 50,
        cursor: Optional[str] = None,
        sort: str = "hot",
    ) -> list[PostResponse]:
        cache_key = f"cache:feed:{sort}:{cursor or 'first'}:{limit}"

        async def _fetch() -> list[PostResponse]:
            stmt = select(Post)

            # Apply sorting
            if sort == "new":
                stmt = stmt.order_by(desc(Post.created_at))
            elif sort == "top":
                stmt = stmt.order_by(desc(func.length(Post.body)))
            elif sort == "controversial":
                stmt = stmt.order_by(desc(Post.controversy_score), desc(Post.created_at))
            else:  # hot (default)
                stmt = stmt.order_by(desc(Post.virality_score), desc(Post.created_at))

            stmt = stmt.limit(min(limit, 100))

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

    async def agent_detail(self, session: AsyncSession, agent_id: uuid.UUID) -> Optional[AgentDetailResponse]:
        from app.models.agent import Agent

        agent = await session.get(Agent, agent_id)
        if agent is None:
            return None
        user = await session.get(User, agent.user_id)
        if user is None:
            return None
        post_count = await session.scalar(
            select(func.count()).select_from(Post).where(Post.author_id == user.id)
        ) or 0
        like_subq = select(Like.id).join(Post, Like.post_id == Post.id).where(Post.author_id == user.id).subquery()
        like_count = await session.scalar(select(func.count()).select_from(like_subq)) or 0
        follower_count = await session.scalar(
            select(func.count()).select_from(Follow).where(Follow.followee_id == user.id)
        ) or 0
        from app.agents.templates import TEMPLATES
        template_info = next((t for t in TEMPLATES if t.name == agent.template), None)
        return AgentDetailResponse(
            id=agent.id,
            username=user.username,
            display_name=user.display_name or user.username,
            template=agent.template,
            interests=template_info.interests if template_info else [],
            writing_style=template_info.writing_style if template_info else "",
            political_leaning=template_info.political_leaning if template_info else "",
            emotional_state=agent.emotional_state,
            personality_traits=template_info.traits if template_info else {},
            activity_level=agent.activity_level,
            post_count=int(post_count),
            like_count=int(like_count),
            follower_count=int(follower_count),
            created_at=user.created_at,
        )

    async def list_bookmarks(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PostResponse]:
        stmt = (
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.user_id == user_id)
            .order_by(desc(Bookmark.created_at))
            .offset(offset)
            .limit(limit)
        )
        posts = (await session.execute(stmt)).scalars().all()
        return [await self._to_response(session, post) for post in posts]

    async def bookmark_post(
        self, session: AsyncSession, user_id: uuid.UUID, post_id: uuid.UUID
    ) -> BookmarkResponse:
        existing = await session.scalar(
            select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.post_id == post_id)
        )
        if existing:
            return BookmarkResponse(id=existing.id, post_id=existing.post_id, created_at=existing.created_at)
        bookmark = Bookmark(user_id=user_id, post_id=post_id)
        session.add(bookmark)
        await session.flush()
        await session.commit()
        await cache_invalidate("cache:bookmarks:*")
        return BookmarkResponse(id=bookmark.id, post_id=bookmark.post_id, created_at=bookmark.created_at)

    async def remove_bookmark(
        self, session: AsyncSession, user_id: uuid.UUID, post_id: uuid.UUID
    ) -> None:
        await session.execute(
            Bookmark.__table__.delete().where(
                Bookmark.user_id == user_id, Bookmark.post_id == post_id
            )
        )
        await session.commit()
        await cache_invalidate("cache:bookmarks:*")

    async def is_bookmarked(
        self, session: AsyncSession, user_id: uuid.UUID, post_id: uuid.UUID
    ) -> bool:
        existing = await session.scalar(
            select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.post_id == post_id)
        )
        return existing is not None

    async def trending_topics(self, session: AsyncSession) -> list[TrendingTopicResponse]:
        cache_key = "cache:trending_topics"

        async def _fetch() -> list[TrendingTopicResponse]:
            from datetime import timedelta
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            rows = await session.execute(
                select(Post.title, Post.body, Post.virality_score, Post.controversy_score)
                .where(Post.created_at >= cutoff)
                .order_by(desc(Post.virality_score + Post.controversy_score))
                .limit(20)
            )
            topics: dict[str, dict] = {}
            for title, body, virality, controversy in rows:
                text = title or body or ""
                words = [w.strip("#.,!?").lower() for w in text.split() if len(w) > 3]
                for word in words[:3]:
                    if word not in topics:
                        topics[word] = {"score": 0.0, "count": 0}
                    topics[word]["score"] += float(virality) + float(controversy) * 0.5
                    topics[word]["count"] += 1
            sorted_topics = sorted(topics.items(), key=lambda x: x[1]["score"], reverse=True)[:15]
            return [
                TrendingTopicResponse(topic=t, score=round(d["score"], 2), post_count=d["count"])
                for t, d in sorted_topics
            ]

        return await get_or_compute(cache_key, _fetch)

    async def leaderboard(
        self, session: AsyncSession, sort: str = "activity", limit: int = 20
    ) -> list[LeaderboardEntry]:
        from app.models.agent import Agent

        stmt = select(Agent, User).join(User, Agent.user_id == User.id).limit(limit)
        rows = (await session.execute(stmt)).all()

        entries = []
        for agent, user in rows:
            post_count = await session.scalar(
                select(func.count()).select_from(Post).where(Post.author_id == user.id)
            ) or 0
            like_subq = select(Like.id).join(Post, Like.post_id == Post.id).where(Post.author_id == user.id).subquery()
            like_count = await session.scalar(select(func.count()).select_from(like_subq)) or 0
            score = (
                agent.activity_level * 100
                + int(post_count) * 2
                + int(like_count) * 5
            )
            entries.append(
                LeaderboardEntry(
                    id=user.id,
                    username=user.username,
                    display_name=user.display_name or user.username,
                    score=score,
                    post_count=int(post_count),
                    like_count=int(like_count),
                    avatar_gradient=_avatar_color(user.id),
                )
            )

        if sort == "posts":
            entries.sort(key=lambda e: e.post_count, reverse=True)
        elif sort == "likes":
            entries.sort(key=lambda e: e.like_count, reverse=True)
        else:
            entries.sort(key=lambda e: e.score, reverse=True)

        return entries[:limit]

    async def _to_response(self, session: AsyncSession, post: Post) -> PostResponse:
        user = await session.get(User, post.author_id)
        like_count = await session.scalar(select(func.count()).select_from(Like).where(Like.post_id == post.id)) or 0
        reply_count = await session.scalar(select(func.count()).select_from(Post).where(Post.parent_id == post.id)) or 0
        score = post.virality_score + float(like_count) * 0.05 + post.controversy_score * 0.4
        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=user.username if user else "unknown",
            title=post.title,
            body=post.body,
            image_url=post.image_url,
            parent_id=post.parent_id,
            community_id=post.community_id,
            score=score,
            like_count=int(like_count),
            reply_count=int(reply_count),
            created_at=post.created_at,
        )


feed_service = FeedService()

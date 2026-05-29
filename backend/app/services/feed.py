from __future__ import annotations

import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_invalidate, get_or_compute
from app.events.store import event_store
from app.models.agent import Agent
from app.models.bookmark import Bookmark
from app.models.community import Community, CommunityMembership
# from app.models.notification import Notification
from app.models.social import Follow, Like, Post
from app.models.user import User
from app.schemas import (
    AgentDetailResponse,
    BookmarkResponse,
    CommunityDetailResponse,
    CommunityResponse,
    CreatePostRequest,
    LeaderboardEntry,
    PostResponse,
    TrendingTopicResponse,
    UserProfileResponse,
)
from app.services.moderation import moderation_service
from app.services.notification_service import notification_service
# from app.models.ideology import IdeologySnapshot
from app.schemas import PostTreeResponse


CURSOR_PAGE_SIZE = 50

# ── Feed algorithm settings (mutable, set via admin) ──────────────

feed_algorithm: str = "hot"  # hot | outrage | polarization | calm | discovery


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
        controversy = min(1.0, decision.toxicity + (0.2 if "?" in request.body and "!" in request.body else 0.0))
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
        cache_key = f"cache:feed:{feed_algorithm}:{cursor or 'first'}:{limit}"

        async def _fetch() -> list[PostResponse]:
            global feed_algorithm  # noqa: PLW0602
            stmt = select(Post)

            # Apply algorithm-based sorting
            if feed_algorithm == "outrage":
                # Boost controversial + high-agitation posts — polarization maximizer
                stmt = stmt.order_by(
                    desc(Post.controversy_score + Post.virality_score * 1.5),
                    desc(Post.created_at),
                )
            elif feed_algorithm == "polarization":
                # Amplify the most divisive content — create echo chambers
                stmt = stmt.order_by(
                    desc(Post.controversy_score * 2.0 + Post.virality_score * 0.5),
                    desc(Post.created_at),
                )
            elif feed_algorithm == "calm":
                # Suppress controversial, boost positive, low-agitation content
                stmt = stmt.order_by(Post.controversy_score, desc(Post.virality_score), desc(Post.created_at))
            elif feed_algorithm == "discovery":
                # Mix of new + random high-virality — exploration mode
                stmt = stmt.order_by(
                    desc(func.random() * Post.virality_score * 1.2),
                    desc(Post.created_at),
                )
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
            if not posts:
                return []

            # Batch-fetch users, like counts, and reply counts in 3 queries total
            author_ids = list({p.author_id for p in posts})
            post_ids = [p.id for p in posts]

            user_rows = await session.execute(
                select(User).where(User.id.in_(author_ids))
            )
            user_map: dict[uuid.UUID, User] = {u.id: u for u in user_rows.scalars().all()}

            like_rows = await session.execute(
                select(Like.post_id, func.count())
                .where(Like.post_id.in_(post_ids))
                .group_by(Like.post_id)
            )
            like_map: dict[uuid.UUID, int] = dict(like_rows.all())  # type: ignore[arg-type]

            reply_rows = await session.execute(
                select(Post.parent_id, func.count())
                .where(Post.parent_id.in_(post_ids))
                .group_by(Post.parent_id)
            )
            reply_map: dict[uuid.UUID, int] = dict(reply_rows.all())  # type: ignore[arg-type]

            return [
                PostResponse(
                    id=post.id,
                    author_id=post.author_id,
                    author_username=getattr(user_map.get(post.author_id), "username", "unknown"),
                    author_display_name=getattr(user_map.get(post.author_id), "display_name", None) or getattr(user_map.get(post.author_id), "username", "unknown"),
                    is_agent=getattr(user_map.get(post.author_id), "is_agent", False),
                    title=post.title,
                    body=post.body,
                    image_url=post.image_url,
                    parent_id=post.parent_id,
                    community_id=post.community_id,
                    score=post.virality_score + float(like_map.get(post.id, 0)) * 0.05 + post.controversy_score * 0.4,
                    like_count=int(like_map.get(post.id, 0)),
                    reply_count=int(reply_map.get(post.id, 0)),
                    created_at=post.created_at,
                )
                for post in posts
            ]

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
            return await self._batch_to_response(session, list(posts))

        return await get_or_compute(cache_key, _fetch)

    async def like_post(self, session: AsyncSession, user: User, post_id: uuid.UUID) -> int:
        """Like a post. Returns the updated like_count."""
        existing = await session.scalar(select(Like).where(Like.user_id == user.id, Like.post_id == post_id))
        if existing is None:
            session.add(Like(user_id=user.id, post_id=post_id))
            post = await session.get(Post, post_id)
            if post is not None:
                post.virality_score += 0.08
                # Notify post author if they are not the liker
                if post.author_id != user.id:
                    await notification_service.create(
                        session,
                        user_id=post.author_id,
                        actor_id=user.id,
                        type="like",
                        entity_id=post_id,
                    )
            await event_store.append(session, "user_liked", user.id, post_id, {})
            await session.commit()
            await cache_invalidate("cache:feed:*")
        like_count = await session.scalar(select(func.count()).select_from(Like).where(Like.post_id == post_id)) or 0
        return int(like_count)

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
                select(Post.title, Post.body, Post.virality_score, Post.controversy_score)
                .where(Post.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0))
                .order_by(desc(Post.virality_score + Post.controversy_score))
                .limit(15)
            )
            # Predefined topic keywords we look for in post content
            TOPIC_KEYWORDS = [
                "zomato", "swiggy", "ipl", "cricket", "bollywood", "chai", "traffic",
                "startup", "layoff", "ai", "climate", "pollution", "gst", "budget",
                "crypto", "stock", "metro", "bangalore", "delhi", "mumbai", "kolkata",
                "instagram", "youtube", "netflix", "ott", "prime", "relationship",
                "dating", "parents", "college", "exam", "job", "salary", "rent",
                "inflation", "food", "diet", "fitness", "gym", "travel", "goa",
                "memes", "troll", "politics", "election", "modi", "chandrayaan",
                "vaccine", "covaxin", "wfh", "remote", "office", "corporate",
                "work-life", "mental", "health", "anxiety", "depression", "therapy",
                "university", "whatsapp", "instagram", "snapchat", "linkedin",
                "night", "sleep", "insomnia", "chai-sutta", "beer", "party",
                "wedding", "shaadi", "rishta", "arranged", "love", "breakup",
                "reddit", "twitter", "x", "trending", "viral", "influencer",
            ]

            # Topics that should never appear as trends (junk words)
            STOP_WORDS = {
                "the", "a", "an", "this", "that", "these", "those", "it", "is", "was",
                "are", "were", "be", "been", "being", "have", "has", "had", "do", "does",
                "did", "will", "would", "could", "should", "may", "might", "shall",
                "can", "need", "dare", "to", "of", "in", "for", "on", "with", "at",
                "by", "from", "as", "into", "through", "during", "before", "after",
                "above", "below", "between", "out", "off", "over", "under", "again",
                "further", "then", "once", "here", "there", "when", "where", "why",
                "how", "all", "each", "every", "both", "few", "more", "most", "other",
                "some", "such", "no", "nor", "not", "only", "own", "same", "so",
                "than", "too", "very", "just", "because", "but", "and", "or", "if",
                "about", "really", "actually", "literally", "basically", "honestly",
                "like", "just", "also", "even", "still", "already", "yet", "now",
                "topic", "hot", "take", "unpopular", "opinion", "story", "true",
                "guys", "bro", "bhai", "yaar", "log", "people", "someone", "everyone",
                "nobody", "something", "anything", "nothing", "everything", "okay",
            }

            trends: dict[str, float] = {}
            for title, body, virality, controversy in rows:
                text = (title or "") + " " + (body or "")
                words = [
                    w.strip("#.,!?():;\"'[]").lower() for w in text.split()
                    if len(w.strip("#.,!?():;\"'[]")) > 3
                ]
                # Score: count word frequency, weighted by virality+controversy
                weight = float(virality + controversy) + 0.1
                for word in words:
                    if word in STOP_WORDS:
                        continue
                    # Boost predefined topic keywords
                    boost = 3.0 if word in TOPIC_KEYWORDS else 1.0
                    trends[word] = trends.get(word, 0.0) + weight * boost

            sorted_trends = sorted(trends.items(), key=lambda x: x[1], reverse=True)[:10]
            return [{"topic": t, "score": round(s, 2)} for t, s in sorted_trends]

        return await get_or_compute(cache_key, _fetch)

    async def list_replies(self, session: AsyncSession, post_id: uuid.UUID) -> list[PostResponse]:
        stmt = (
            select(Post)
            .where(Post.parent_id == post_id)
            .order_by(Post.created_at)
            .limit(50)
        )
        posts = (await session.execute(stmt)).scalars().all()
        return await self._batch_to_response(session, list(posts))

    async def list_communities(self, session: AsyncSession) -> list[CommunityResponse]:
        cache_key = "cache:communities"

        async def _fetch() -> list[CommunityResponse]:
            communities = (
                await session.execute(select(Community).order_by(desc(Community.conflict_score), Community.name).limit(50))
            ).scalars().all()

            if not communities:
                return []

            # Batch-fetch counts in 2 queries instead of N*2
            community_ids = [c.id for c in communities]
            member_rows = await session.execute(
                select(CommunityMembership.community_id, func.count())
                .where(CommunityMembership.community_id.in_(community_ids))
                .group_by(CommunityMembership.community_id)
            )
            member_count_map: dict[uuid.UUID, int] = dict(member_rows.all())  # type: ignore[arg-type]
            post_rows = await session.execute(
                select(Post.community_id, func.count())
                .where(Post.community_id.in_(community_ids))
                .group_by(Post.community_id)
            )
            post_count_map: dict[uuid.UUID, int] = dict(post_rows.all())  # type: ignore[arg-type]

            responses: list[CommunityResponse] = []
            for community in communities:
                responses.append(
                    CommunityResponse(
                        id=community.id,
                        slug=community.slug,
                        name=community.name,
                        description=community.description,
                        ideology_center=community.ideology_center,
                        conflict_score=community.conflict_score,
                        member_count=int(member_count_map.get(community.id, 0)),
                        post_count=int(post_count_map.get(community.id, 0)),
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
        like_count = await session.scalar(select(func.count(Like.id)).join(Post, Like.post_id == Post.id).where(Post.author_id == user.id)) or 0

        return UserProfileResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            bio=user.bio,
            is_agent=user.is_agent,
            post_count=int(post_count),
            like_count=int(like_count),
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
        like_count = await session.scalar(select(func.count(Like.id)).join(Post, Like.post_id == Post.id).where(Post.author_id == user.id)) or 0
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
        return await self._batch_to_response(session, list(posts))

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
        bm = await session.scalar(
            select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.post_id == post_id)
        )
        if bm:
            await session.delete(bm)
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

            TOPIC_KEYWORDS = [
                "zomato", "swiggy", "ipl", "cricket", "bollywood", "chai", "traffic",
                "startup", "layoff", "ai", "climate", "pollution", "gst", "budget",
                "crypto", "stock", "metro", "bangalore", "delhi", "mumbai", "kolkata",
                "instagram", "youtube", "netflix", "ott", "relationship",
                "dating", "college", "exam", "job", "salary", "rent",
                "inflation", "food", "fitness", "gym", "travel", "goa",
                "memes", "politics", "election", "chandrayaan",
                "wfh", "remote", "corporate", "mental", "health",
                "whatsapp", "linkedin", "wedding", "love", "breakup",
                "reddit", "viral", "influencer", "movie", "series",
                "upgrade", "policy", "scheme", "yojana", "india",
                "dosa", "idli", "paratha", "samosa", "biryani",
                "railway", "bus", "flight", "petrol", "diesel",
            ]

            STOP_WORDS = {
                "the", "a", "an", "this", "that", "these", "those", "it", "is", "was",
                "are", "were", "be", "been", "have", "has", "had", "do", "does",
                "did", "will", "would", "could", "should", "may", "might", "shall",
                "can", "to", "of", "in", "for", "on", "with", "at",
                "by", "from", "as", "into", "through", "during", "before", "after",
                "above", "below", "between", "out", "off", "over", "under", "again",
                "further", "then", "once", "here", "there", "when", "where", "why",
                "how", "all", "each", "every", "both", "few", "more", "most", "other",
                "some", "such", "no", "nor", "not", "only", "own", "same", "so",
                "than", "too", "very", "just", "because", "but", "and", "or", "if",
                "about", "really", "actually", "literally", "basically", "honestly",
                "like", "just", "also", "even", "still", "already", "yet", "now",
                "topic", "hot", "take", "unpopular", "opinion", "story", "true",
                "guys", "bro", "bhai", "yaar", "log", "people", "everyone",
                "nobody", "something", "anything", "nothing", "everything", "okay",
                "without", "think", "know", "said", "tell", "see", "come", "go",
            }

            topics: dict[str, dict[str, float | int]] = {}
            for title, body, virality, controversy in rows:
                text = (title or "") + " " + (body or "")
                words = [
                    w.strip("#.,!?():;\"'[]").lower() for w in text.split()
                    if len(w.strip("#.,!?():;\"'[]")) > 3 and w.strip("#.,!?():;\"'[]").lower() not in STOP_WORDS
                ]
                weight = float(virality) + float(controversy) * 0.5 + 0.1
                for word in words:
                    boost = 3.0 if word in TOPIC_KEYWORDS else 1.0
                    if word not in topics:
                        topics[word] = {"score": 0.0, "count": 0}
                    topics[word]["score"] += weight * boost
                    topics[word]["count"] += 1

            sorted_topics = sorted(topics.items(), key=lambda x: x[1]["score"], reverse=True)[:15]
            return [
                TrendingTopicResponse(topic=t, score=round(d["score"], 2), post_count=int(d["count"]))
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

        if not rows:
            return entries

        # Batch-fetch post and like counts in 2 queries instead of N*2
        user_ids = [user.id for _, user in rows]
        post_count_rows = await session.execute(
            select(Post.author_id, func.count())
            .where(Post.author_id.in_(user_ids))
            .group_by(Post.author_id)
        )
        post_count_map: dict[uuid.UUID, int] = dict(post_count_rows.all())  # type: ignore[arg-type]
        like_count_rows = await session.execute(
            select(Post.author_id, func.count(Like.id))
            .outerjoin(Like, Like.post_id == Post.id)
            .where(Post.author_id.in_(user_ids))
            .group_by(Post.author_id)
        )
        like_count_map: dict[uuid.UUID, int] = dict(like_count_rows.all())  # type: ignore[arg-type]

        for agent, user in rows:
            post_count = int(post_count_map.get(user.id, 0))
            like_count = int(like_count_map.get(user.id, 0))
            score = (
                agent.activity_level * 100
                + post_count * 2
                + like_count * 5
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

    async def list_user_posts(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 30,
        offset: int = 0,
    ) -> list[PostResponse]:
        """Return top-level posts (no replies) by a specific user, newest first."""
        stmt = (
            select(Post)
            .where(Post.author_id == user_id, Post.parent_id.is_(None))
            .order_by(desc(Post.created_at))
            .offset(offset)
            .limit(limit)
        )
        posts = (await session.execute(stmt)).scalars().all()
        return await self._batch_to_response(session, list(posts))

    async def _batch_to_response(
        self, session: AsyncSession, posts: list[Post]
    ) -> list[PostResponse]:
        """Batch-fetch users, like counts, and reply counts for a list of posts.
        Replaces N*3 queries (per-post _to_response) with 3 queries total."""
        if not posts:
            return []

        author_ids = list({p.author_id for p in posts})
        post_ids = [p.id for p in posts]

        user_rows = await session.execute(
            select(User).where(User.id.in_(author_ids))
        )
        user_map: dict[uuid.UUID, User] = {u.id: u for u in user_rows.scalars().all()}

        like_rows = await session.execute(
            select(Like.post_id, func.count())
            .where(Like.post_id.in_(post_ids))
            .group_by(Like.post_id)
        )
        like_map: dict[uuid.UUID, int] = dict(like_rows.all())  # type: ignore[arg-type]

        reply_rows = await session.execute(
            select(Post.parent_id, func.count())
            .where(Post.parent_id.in_(post_ids))
            .group_by(Post.parent_id)
        )
        reply_map: dict[uuid.UUID, int] = dict(reply_rows.all())  # type: ignore[arg-type]

        results = []
        for post in posts:
            user = user_map.get(post.author_id)
            like_count = int(like_map.get(post.id, 0))
            reply_count = int(reply_map.get(post.id, 0))
            results.append(
                PostResponse(
                    id=post.id,
                    author_id=post.author_id,
                    author_username=user.username if user else "unknown",
                    author_display_name=getattr(user, 'display_name', None) or (user.username if user else "unknown"),
                    is_agent=user.is_agent if user else False,
                    title=post.title,
                    body=post.body,
                    image_url=post.image_url,
                    parent_id=post.parent_id,
                    community_id=post.community_id,
                    score=post.virality_score + float(like_count) * 0.05 + post.controversy_score * 0.4,
                    like_count=int(like_count),
                    reply_count=int(reply_count),
                    created_at=post.created_at,
                )
            )
        return results

    async def _to_response(self, session: AsyncSession, post: Post) -> PostResponse:
        user = await session.get(User, post.author_id)
        like_count = await session.scalar(select(func.count()).select_from(Like).where(Like.post_id == post.id)) or 0
        reply_count = await session.scalar(select(func.count()).select_from(Post).where(Post.parent_id == post.id)) or 0
        score = post.virality_score + float(like_count) * 0.05 + post.controversy_score * 0.4
        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=user.username if user else "unknown",
            author_display_name=getattr(user, 'display_name', None) or (user.username if user else "unknown"),
            is_agent=user.is_agent if user else False,
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


    # ── Faction Polarization ────────────────────────────────────────

    async def get_faction_graph(
        self, session: AsyncSession
    ) -> dict[str, object]:
        """Compute the faction polarization graph based on agent relationships."""
        from app.models.agent import AgentRelationship

        agents = (await session.execute(select(Agent).limit(100))).scalars().all()
        users = {}
        for agent in agents:
            user = await session.get(User, agent.user_id)
            if user:
                users[agent.id] = user

        # Assign factions based on agitation and community membership
        alpha_faction = set()
        beta_faction = set()
        neutral_faction = set()

        for agent in agents:
            ag = float(agent.emotional_state.get("agitation", 0.3))
            aggr = float(agent.emotional_state.get("aggression", 0.2))
            exc = float(agent.emotional_state.get("excitement", 0.3))
            combo = ag * 0.5 + aggr * 0.3 + exc * 0.2
            if combo > 0.55:
                alpha_faction.add(agent.id)
            elif combo < 0.3:
                beta_faction.add(agent.id)
            else:
                neutral_faction.add(agent.id)

        # Get relationships for edges
        rels = (await session.execute(select(AgentRelationship).limit(300))).scalars().all()

        nodes = []
        agent_ids = set(a.id for a in agents)

        for agent in agents:
            user = users.get(agent.id)
            if not user:
                continue
            ag = float(agent.emotional_state.get("agitation", 0.3))
            faction = (
                "alpha" if agent.id in alpha_faction
                else "beta" if agent.id in beta_faction
                else "neutral"
            )
            influence = min(1.0, ag + agent.activity_level * 0.5)
            nodes.append({
                "id": str(agent.id),
                "username": user.username,
                "faction": faction,
                "agitation": round(ag, 2),
                "influence": round(influence, 2),
            })

        edges = []
        seen_edges = set()
        for rel in rels:
            if rel.source_agent_id not in agent_ids or rel.target_user_id not in {u.id for u in users.values()}:
                continue
            source_user = users.get(rel.source_agent_id)
            if not source_user:
                continue
            key = (str(rel.source_agent_id), str(rel.target_user_id))
            if key in seen_edges:
                continue
            seen_edges.add(key)
            edges.append({
                "source": str(rel.source_agent_id),
                "target": str(rel.target_user_id),
                "weight": round(rel.rivalry if rel.rivalry else rel.affinity, 2),
                "type": "interaction",
            })

        # Compute polarization index
        total = len(nodes) or 1
        polar_idx = round((len(alpha_faction) * len(beta_faction)) / (total * total) * 10, 2)

        return {
            "nodes": nodes,
            "edges": edges,
            "polarization_index": polar_idx,
            "alpha_size": len(alpha_faction),
            "beta_size": len(beta_faction),
        }

    @classmethod
    def set_algorithm(cls, algorithm: str) -> None:
        global feed_algorithm
        valid = {"hot", "outrage", "polarization", "calm", "discovery"}
        if algorithm not in valid:
            raise ValueError(f"Invalid algorithm: {algorithm}. Valid: {valid}")
        feed_algorithm = algorithm

    @classmethod
    def get_algorithm(cls) -> str:
        global feed_algorithm
        return feed_algorithm

    async def get_comment_tree(
        self,
        session: AsyncSession,
        post_id: uuid.UUID,
        max_depth: int = 5,
    ) -> Optional[PostTreeResponse]:
        """Return a post and its nested comment tree up to max_depth deep."""
        from app.schemas import PostTreeResponse

        post = await session.get(Post, post_id)
        if not post:
            return None

        async def _fetch_children(parent_id: uuid.UUID, depth: int) -> list[PostTreeResponse]:
            if depth <= 0:
                return []
            children = (
                await session.execute(
                    select(Post)
                    .where(Post.parent_id == parent_id)
                    .order_by(Post.created_at)
                    .limit(50)
                )
            ).scalars().all()

            if not children:
                return []

            # Batch-fetch users for all children at this depth level
            author_ids = list({child.author_id for child in children})
            user_rows = await session.execute(
                select(User).where(User.id.in_(author_ids))
            )
            user_map: dict[uuid.UUID, User] = {u.id: u for u in user_rows.scalars().all()}

            # Batch-fetch like counts
            child_ids = [child.id for child in children]
            like_rows = await session.execute(
                select(Like.post_id, func.count())
                .where(Like.post_id.in_(child_ids))
                .group_by(Like.post_id)
            )
            like_map: dict[uuid.UUID, int] = dict(like_rows.all())  # type: ignore[arg-type]

            # Batch-fetch reply counts
            reply_rows = await session.execute(
                select(Post.parent_id, func.count())
                .where(Post.parent_id.in_(child_ids))
                .group_by(Post.parent_id)
            )
            reply_map: dict[uuid.UUID, int] = dict(reply_rows.all())  # type: ignore[arg-type]

            result = []
            for child in children:
                user = user_map.get(child.author_id)
                like_count = int(like_map.get(child.id, 0))
                reply_count = int(reply_map.get(child.id, 0))
                grand_children = await _fetch_children(child.id, depth - 1)
                result.append(
                    PostTreeResponse(
                        id=child.id,
                        author_id=child.author_id,
                        author_username=user.username if user else "unknown",
                        author_display_name=getattr(user, 'display_name', None) or (user.username if user else "unknown"),
                        is_agent=user.is_agent if user else False,
                        title=child.title,
                        body=child.body,
                        image_url=child.image_url,
                        parent_id=child.parent_id,
                        community_id=child.community_id,
                        score=child.virality_score + float(like_count) * 0.05 + child.controversy_score * 0.4,
                        like_count=like_count,
                        reply_count=reply_count,
                        created_at=child.created_at,
                        children=grand_children,
                    )
                )
            return result

        user = await session.get(User, post.author_id)
        like_count = await session.scalar(
            select(func.count()).select_from(Like).where(Like.post_id == post.id)
        ) or 0
        reply_count = await session.scalar(
            select(func.count()).select_from(Post).where(Post.parent_id == post.id)
        ) or 0
        children = await _fetch_children(post.id, max_depth)

        return PostTreeResponse(
            id=post.id,
            author_id=post.author_id,
            author_username=user.username if user else "unknown",
            author_display_name=getattr(user, 'display_name', None) or (user.username if user else "unknown"),
            is_agent=user.is_agent if user else False,
            title=post.title,
            body=post.body,
            image_url=post.image_url,
            parent_id=post.parent_id,
            community_id=post.community_id,
            score=post.virality_score + float(like_count) * 0.05 + post.controversy_score * 0.4,
            like_count=int(like_count),
            reply_count=int(reply_count),
            created_at=post.created_at,
            children=children,
        )

    async def community_detail(
        self, session: AsyncSession, community_id: uuid.UUID
    ) -> Optional[CommunityDetailResponse]:
        """Get detailed info about a community, including election status."""
        from app.models.community import CommunityElection
        community = await session.get(Community, community_id)
        if not community:
            return None

        member_count = await session.scalar(
            select(func.count()).select_from(CommunityMembership).where(
                CommunityMembership.community_id == community.id
            )
        ) or 0
        post_count = await session.scalar(
            select(func.count()).select_from(Post).where(Post.community_id == community.id)
        ) or 0

        moderator_username = None
        if community.moderator_id:
            mod_user = await session.get(User, community.moderator_id)
            if mod_user:
                moderator_username = mod_user.username

        election_active = await session.scalar(
            select(CommunityElection).where(
                CommunityElection.community_id == community.id,
                CommunityElection.status == "active",
            ).limit(1)
        ) is not None

        return CommunityDetailResponse(
            id=community.id,
            slug=community.slug,
            name=community.name,
            description=community.description,
            ideology_center=community.ideology_center,
            conflict_score=community.conflict_score,
            is_dynamic=community.is_dynamic,
            moderator_id=community.moderator_id,
            moderator_username=moderator_username,
            member_count=int(member_count),
            post_count=int(post_count),
            election_active=election_active,
            created_at=community.created_at,
        )


feed_service = FeedService()

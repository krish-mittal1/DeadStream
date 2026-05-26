from __future__ import annotations

import uuid

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db.session import get_session
from app.events.store import event_store
from app.models.agent import Agent
from app.models.bookmark import Bookmark
from app.models.notification import Notification
from app.models.user import User
from app.schemas import (
    AgentDetailResponse,
    AgentProfile,
    AuthResponse,
    BookmarkResponse,
    CommunityResponse,
    CreatePostRequest,
    LeaderboardEntry,
    LoginRequest,
    NotificationResponse,
    PostResponse,
    RegisterRequest,
    TrendingTopicResponse,
    UserProfileResponse,
)
from app.core.exceptions import AppError
from app.services.auth import auth_service
from app.services.feed import feed_service
from app.services.notification_service import notification_service
from app.services.recommendation import recommendation_service

api_router = APIRouter()


@api_router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict:
    """Comprehensive health check that verifies database, Redis, and cache connectivity."""
    from app.core.cache import cache_health

    db_ok = False
    try:
        await session.execute(select(1))
        db_ok = True
    except Exception:
        pass

    redis_ok = False
    try:
        redis_ok = await cache_health()
    except Exception:
        pass

    overall = db_ok and redis_ok
    return {
        "status": "ok" if overall else "degraded",
        "database": db_ok,
        "redis": redis_ok,
        "version": "0.1.0",
    }


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    try:
        return await auth_service.register(session, request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    try:
        return await auth_service.login(session, request)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@api_router.get("/feed", response_model=list[PostResponse])
async def feed(
    cursor: Optional[str] = Query(default=None, description="Opaque cursor for pagination"),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("hot", description="Sort: hot, new, top, controversial"),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    return await feed_service.list_feed(session, limit, cursor=cursor, sort=sort)


@api_router.post("/posts", response_model=PostResponse)
async def create_post(
    request: CreatePostRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> PostResponse:
    try:
        return await feed_service.create_post(session, user, request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api_router.post("/posts/{post_id}/like")
async def like_post(
    post_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await feed_service.like_post(session, user, post_id)
    return {"status": "ok"}


@api_router.post("/users/{followee_id}/follow")
async def follow_user(
    followee_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await feed_service.follow(session, user, followee_id)
    return {"status": "ok"}


@api_router.get("/trends")
async def trends(session: AsyncSession = Depends(get_session)):
    return await feed_service.trending(session)


@api_router.get("/agents", response_model=list[AgentProfile])
async def agents(session: AsyncSession = Depends(get_session)) -> list[AgentProfile]:
    rows = await session.execute(select(Agent, User).join(User, Agent.user_id == User.id).limit(500))
    return [
        AgentProfile(
            id=agent.id,
            username=user.username,
            template=agent.template,
            emotional_state=agent.emotional_state,
            activity_level=agent.activity_level,
            next_wake_at=agent.next_wake_at,
        )
        for agent, user in rows
    ]


@api_router.get("/events")
async def events(
    cursor: Optional[str] = Query(default=None, description="Opaque cursor for pagination"),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    rows = await event_store.replay(session, limit)
    return [e.model_dump(mode="json") for e in rows]


@api_router.get("/recommendations/follow")
async def follow_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.who_to_follow(session)


@api_router.get("/recommendations/communities")
async def community_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.communities(session)


@api_router.get("/communities", response_model=list[CommunityResponse])
async def communities(session: AsyncSession = Depends(get_session)) -> list[CommunityResponse]:
    return await feed_service.list_communities(session)


@api_router.get("/communities/{community_id}/feed", response_model=list[PostResponse])
async def community_feed(
    community_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    return await feed_service.list_community_feed(session, community_id, limit, offset)


@api_router.post("/communities/{community_id}/join")
async def join_community(
    community_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await feed_service.join_community(session, user, community_id)
    return {"status": "ok"}



@api_router.get("/admin/influence-graph")
async def influence_graph(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.influence_graph(session)


@api_router.get("/posts/{post_id}/replies", response_model=list[PostResponse])
async def post_replies(post_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> list[PostResponse]:
    return await feed_service.list_replies(session, post_id)


@api_router.get("/users/{user_id}/profile")
async def user_profile(user_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> UserProfileResponse:
    profile = await feed_service.profile(session, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="user_not_found")
    return profile


# ── Agent Detail ────────────────────────────────────────────────────

@api_router.get("/agents/{agent_id}", response_model=AgentDetailResponse)
async def agent_detail(agent_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> AgentDetailResponse:
    detail = await feed_service.agent_detail(session, agent_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="agent_not_found")
    return detail


# ── Notifications ────────────────────────────────────────────────────

@api_router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationResponse]:
    return await notification_service.list_notifications(session, user.id, limit, offset)


@api_router.get("/notifications/unread-count")
async def unread_notification_count(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    count = await notification_service.unread_count(session, user.id)
    return {"count": count}


@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await notification_service.mark_read(session, notification_id, user.id)
    return {"status": "ok"}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await notification_service.mark_all_read(session, user.id)
    return {"status": "ok"}


# ── Bookmarks ────────────────────────────────────────────────────────

@api_router.get("/bookmarks", response_model=list[PostResponse])
async def list_bookmarks(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    return await feed_service.list_bookmarks(session, user.id, limit, offset)


@api_router.post("/bookmarks", response_model=BookmarkResponse)
async def bookmark_post(
    post_id: uuid.UUID = Query(..., description="Post ID to bookmark"),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> BookmarkResponse:
    return await feed_service.bookmark_post(session, user.id, post_id)


@api_router.delete("/bookmarks/{post_id}")
async def remove_bookmark(
    post_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await feed_service.remove_bookmark(session, user.id, post_id)
    return {"status": "ok"}

@api_router.get("/bookmarks/check/{post_id}")
async def check_bookmark(
    post_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    is_bookmarked = await feed_service.is_bookmarked(session, user.id, post_id)
    return {"bookmarked": is_bookmarked}


# ── Trending & Leaderboard ───────────────────────────────────────────

@api_router.get("/trending", response_model=list[TrendingTopicResponse])
async def trending_topics(
    session: AsyncSession = Depends(get_session),
) -> list[TrendingTopicResponse]:
    return await feed_service.trending_topics(session)


@api_router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    sort: str = Query("activity", description="Sort: activity, posts, likes"),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    return await feed_service.leaderboard(session, sort, limit)

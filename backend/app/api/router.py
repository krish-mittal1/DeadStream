from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.db.session import get_session
from app.events.store import event_store
from app.models.agent import Agent
from app.models.user import User
from app.schemas import AgentProfile, AuthResponse, CreatePostRequest, LoginRequest, PostResponse, RegisterRequest
from app.services.auth import auth_service
from app.services.feed import feed_service
from app.services.recommendation import recommendation_service

api_router = APIRouter()


@api_router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    try:
        return await auth_service.register(session, request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    try:
        return await auth_service.login(session, request)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@api_router.get("/feed", response_model=list[PostResponse])
async def feed(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    return await feed_service.list_feed(session, limit, offset)


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
    rows = await session.execute(select(Agent, User).join(User, Agent.user_id == User.id).limit(100))
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
async def events(limit: int = Query(100, ge=1, le=500), session: AsyncSession = Depends(get_session)):
    return await event_store.replay(session, limit)


@api_router.get("/recommendations/follow")
async def follow_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.who_to_follow(session)


@api_router.get("/recommendations/communities")
async def community_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.communities(session)


@api_router.get("/admin/influence-graph")
async def influence_graph(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.influence_graph(session)


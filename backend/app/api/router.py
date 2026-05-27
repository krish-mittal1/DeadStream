from __future__ import annotations

import uuid

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
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
    FeedAlgorithmUpdateRequest,
    FactionGraphResponse,
    FactionNode,
    FactionEdge,
    InjectFakeNewsRequest,
    DisruptionEventResponse,
    TrollFarmAttackResponse,
    BrainEvolutionResponse,
    IdeologySnapshotResponse,
    SendDirectMessageRequest,
    DirectMessageResponse,
    DirectMessageGroupResponse,
    CreateGroupChatRequest,
    GroupChatMessageRequest,
    GroupChatResponse,
    GroupChatMessageResponse,
    GroupChatParticipantResponse,
    CommunityDetailResponse,
    ElectionResponse,
    VoteRequest,
    PostTreeResponse,
)
from app.core.exceptions import AppError
from app.services.auth import auth_service
from app.services.feed import feed_service
from app.services.notification_service import notification_service
from app.services.recommendation import recommendation_service
from app.services.disruption_service import disruption_service
from app.services.cognitive_drift_service import cognitive_drift_service
from app.services.dm_service import dm_service
from app.services.election_service import election_service

api_router = APIRouter()


# ── Health ───────────────────────────────────────────────────────────

@api_router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict:
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


# ── Auth ─────────────────────────────────────────────────────────────

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


# ── Feed ─────────────────────────────────────────────────────────────

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
) -> dict:
    like_count = await feed_service.like_post(session, user, post_id)
    return {"status": "ok", "like_count": like_count}


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


# ── Recommendations ─────────────────────────────────────────────────

@api_router.get("/recommendations/follow")
async def follow_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.who_to_follow(session)


@api_router.get("/recommendations/communities")
async def community_recommendations(session: AsyncSession = Depends(get_session)):
    return await recommendation_service.communities(session)


# ── Communities ──────────────────────────────────────────────────────

@api_router.get("/communities", response_model=list[CommunityResponse])
async def communities(session: AsyncSession = Depends(get_session)) -> list[CommunityResponse]:
    return await feed_service.list_communities(session)


@api_router.get("/communities/{community_id}", response_model=CommunityDetailResponse)
async def community_detail(
    community_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> CommunityDetailResponse:
    detail = await feed_service.community_detail(session, community_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="community_not_found")
    return detail


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


# ── Posts & Users ────────────────────────────────────────────────────

@api_router.get("/posts/{post_id}/replies", response_model=list[PostResponse])
async def post_replies(post_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> list[PostResponse]:
    return await feed_service.list_replies(session, post_id)


@api_router.get("/users/{user_id}/profile")
async def user_profile(user_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> UserProfileResponse:
    profile = await feed_service.profile(session, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="user_not_found")
    return profile


@api_router.get("/users/{user_id}/posts", response_model=list[PostResponse])
async def user_posts(
    user_id: uuid.UUID,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    return await feed_service.list_user_posts(session, user_id, limit, offset)


# ── Agent Detail ─────────────────────────────────────────────────────

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


# ═══════════════════════════════════════════════════════════════════════
# NEW FEATURES
# ═══════════════════════════════════════════════════════════════════════

# ── 1. FACTION POLARIZATION ─────────────────────────────────────────

@api_router.get("/admin/faction-graph")
async def faction_graph(
    session: AsyncSession = Depends(get_session),
) -> dict:
    return await feed_service.get_faction_graph(session)


@api_router.post("/admin/algorithm")
async def set_feed_algorithm(
    request: FeedAlgorithmUpdateRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Change the global feed algorithm. Affects agent behavior simulation-wide."""
    try:
        feed_service.set_algorithm(request.algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await event_store.append(session, "algorithm_changed", None, None, {
        "algorithm": request.algorithm,
        "note": f"Feed algorithm switched to {request.algorithm}"
    })
    await session.commit()
    return {"status": "ok", "algorithm": request.algorithm}


@api_router.get("/admin/algorithm")
async def get_feed_algorithm() -> dict:
    return {"algorithm": feed_service.get_algorithm()}


# ── 2. GOD MODE DISRUPTION EVENTS ───────────────────────────────────

@api_router.post("/admin/disruptions/fake-news", response_model=DisruptionEventResponse)
async def inject_fake_news(
    request: InjectFakeNewsRequest,
    session: AsyncSession = Depends(get_session),
) -> DisruptionEventResponse:
    event = await disruption_service.inject_fake_news(session, request.title, request.body, request.source)
    return disruption_service._to_response(event)


@api_router.post("/admin/disruptions/troll-farm", response_model=TrollFarmAttackResponse)
async def spawn_troll_farm(
    title: str = Query(default="Troll Farm Attack", max_length=200),
    count: int = Query(default=10, ge=1, le=20),
    session: AsyncSession = Depends(get_session),
) -> TrollFarmAttackResponse:
    disruption = await disruption_service.spawn_troll_farm(session, title, count)
    return TrollFarmAttackResponse(
        disruption_id=disruption.id,
        troll_count=disruption.infected_count,
        message=f"Deployed {disruption.infected_count} troll accounts",
    )


@api_router.get("/admin/disruptions", response_model=list[DisruptionEventResponse])
async def list_disruptions(
    active_only: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
) -> list[DisruptionEventResponse]:
    if active_only:
        return await disruption_service.get_active_disruptions(session)
    return await disruption_service.get_all_disruptions(session)


@api_router.post("/admin/disruptions/{disruption_id}/stop")
async def stop_disruption(
    disruption_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict:
    await disruption_service.stop_disruption(session, disruption_id)
    return {"status": "stopped"}


@api_router.post("/admin/disruptions/{disruption_id}/spread")
async def simulate_spread(
    disruption_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict:
    rate = await disruption_service.simulate_spread(session, disruption_id)
    return {"infection_rate": rate}


# ── 3. COGNITIVE DRIFT ──────────────────────────────────────────────

@api_router.get("/agents/{agent_id}/brain-evolution", response_model=BrainEvolutionResponse)
async def agent_brain_evolution(
    agent_id: uuid.UUID,
    days: int = Query(default=7, ge=1, le=30),
    session: AsyncSession = Depends(get_session),
) -> BrainEvolutionResponse:
    evolution = await cognitive_drift_service.get_brain_evolution(session, agent_id, days)
    if evolution is None:
        raise HTTPException(status_code=404, detail="agent_not_found")
    return evolution


# ── 4. DIRECT MESSAGES ──────────────────────────────────────────────

@api_router.post("/dm/send", response_model=DirectMessageResponse)
async def send_dm(
    request: SendDirectMessageRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> DirectMessageResponse:
    return await dm_service.send_dm(session, user.id, request.recipient_id, request.body)


@api_router.get("/dm/groups", response_model=list[DirectMessageGroupResponse])
async def list_dm_groups(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DirectMessageGroupResponse]:
    return await dm_service.list_dm_groups(session, user.id)


@api_router.get("/dm/groups/{dm_group_id}/messages", response_model=list[DirectMessageResponse])
async def get_dm_messages(
    dm_group_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: Optional[uuid.UUID] = Query(default=None),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DirectMessageResponse]:
    return await dm_service.get_messages(session, dm_group_id, user.id, limit, before_id)


@api_router.get("/dm/unread-count")
async def dm_unread_count(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    count = await dm_service.get_unread_dm_count(session, user.id)
    return {"count": count}


# ── 5. GROUP CHATS (AI Roundtables) ─────────────────────────────────

@api_router.post("/group-chats", response_model=GroupChatResponse)
async def create_group_chat(
    request: CreateGroupChatRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupChatResponse:
    return await dm_service.create_group_chat(
        session, request.name, request.topic, user.id, request.participant_ids
    )


@api_router.get("/group-chats", response_model=list[GroupChatResponse])
async def list_group_chats(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[GroupChatResponse]:
    return await dm_service.get_group_chats_for_user(session, user.id)


@api_router.get("/group-chats/{group_chat_id}", response_model=GroupChatResponse)
async def get_group_chat(
    group_chat_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupChatResponse:
    chats = await dm_service.get_group_chats_for_user(session, user.id)
    chat = next((c for c in chats if c.id == group_chat_id), None)
    if not chat:
        # Fallback: try to get directly
        from app.models.dm import GroupChat
        gc = await session.get(GroupChat, group_chat_id)
        if not gc:
            raise HTTPException(status_code=404, detail="group_chat_not_found")
        from app.models.dm import GroupChatParticipant
        p_count = await session.scalar(
            select(GroupChatParticipant).where(
                GroupChatParticipant.group_chat_id == gc.id,
                GroupChatParticipant.user_id == user.id,
            )
        )
        if not p_count:
            raise HTTPException(status_code=403, detail="not_a_participant")
        p_count_total = await session.scalar(
            select(func.count()).select_from(GroupChatParticipant).where(GroupChatParticipant.group_chat_id == gc.id)
        ) or 0
        return GroupChatResponse(
            id=gc.id,
            name=gc.name,
            topic=gc.topic,
            created_by=gc.created_by,
            is_active=gc.is_active,
            participant_count=int(p_count_total),
            last_message_at=gc.last_message_at,
            created_at=gc.created_at,
        )
    return chat


@api_router.post("/group-chats/{group_chat_id}/messages", response_model=GroupChatMessageResponse)
async def send_group_message(
    group_chat_id: uuid.UUID,
    request: GroupChatMessageRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupChatMessageResponse:
    try:
        return await dm_service.send_group_message(session, group_chat_id, user.id, request.body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api_router.get("/group-chats/{group_chat_id}/messages", response_model=list[GroupChatMessageResponse])
async def get_group_messages(
    group_chat_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=200),
    before_id: Optional[uuid.UUID] = Query(default=None),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> list[GroupChatMessageResponse]:
    return await dm_service.get_group_chat_messages(session, group_chat_id, limit, before_id)


@api_router.get("/group-chats/{group_chat_id}/participants", response_model=list[GroupChatParticipantResponse])
async def get_group_participants(
    group_chat_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[GroupChatParticipantResponse]:
    return await dm_service.get_group_participants(session, group_chat_id)


# ── 6. COMMUNITY ELECTIONS ──────────────────────────────────────────

@api_router.post("/communities/{community_id}/elections/start")
async def start_election(
    community_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict:
    election = await election_service.start_election(session, community_id)
    if not election:
        raise HTTPException(status_code=404, detail="community_not_found")
    return {"status": "started", "election_id": str(election.id)}


@api_router.post("/communities/{community_id}/elections/vote")
async def cast_vote(
    community_id: uuid.UUID,
    request: VoteRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    election = await election_service.get_active_election_for_community(session, community_id)
    if not election:
        raise HTTPException(status_code=404, detail="no_active_election")
    success = await election_service.vote(session, election.id, user.id, request.candidate_id)
    if not success:
        raise HTTPException(status_code=400, detail="vote_failed_or_already_voted")
    return {"status": "voted"}


@api_router.get("/communities/{community_id}/elections/active")
async def get_active_election(
    community_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Optional[ElectionResponse]:
    election = await election_service.get_active_election_for_community(session, community_id)
    return election


@api_router.post("/elections/{election_id}/end")
async def end_election(
    election_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict:
    election = await election_service.end_election(session, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="election_not_found")
    return {"status": "ended", "winner_id": str(election.winner_id) if election.winner_id else None}

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: uuid.UUID
    username: str


class CreatePostRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    body: str = Field(min_length=1, max_length=3200)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    community_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None


class PostResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    author_username: str
    author_display_name: str = ""
    is_agent: bool = False
    title: Optional[str] = None
    body: str
    image_url: Optional[str] = None
    parent_id: Optional[uuid.UUID]
    community_id: Optional[uuid.UUID]
    score: float
    like_count: int = 0
    reply_count: int = 0
    created_at: datetime



class EventEnvelope(BaseModel):
    id: uuid.UUID
    type: str
    actor_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    payload: dict[str, Any]
    correlation_id: str
    causation_id: Optional[str] = None
    occurred_at: datetime


class AgentProfile(BaseModel):
    id: uuid.UUID
    username: str
    template: str
    emotional_state: dict[str, Any]
    activity_level: float
    next_wake_at: datetime


class CommunityResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    ideology_center: float
    conflict_score: float
    member_count: int = 0
    post_count: int = 0


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    bio: str
    is_agent: bool
    post_count: int
    follower_count: int
    following_count: int
    agent_template: Optional[str] = None
    agent_activity_level: Optional[float] = None
    created_at: datetime


class ModerationDecision(BaseModel):
    allowed: bool
    toxicity: float
    spam: float
    action: Literal["allow", "cooldown", "shadow_limit", "ban_review"]
    reasons: list[str] = Field(default_factory=list)


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    actor_id: uuid.UUID
    actor_username: str
    entity_id: Optional[uuid.UUID] = None
    read: bool
    created_at: datetime


class BookmarkRequest(BaseModel):
    post_id: uuid.UUID


class BookmarkResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    created_at: datetime


class SortOption(str):
    hot = "hot"
    new = "new"
    top = "top"
    controversial = "controversial"


class TrendingTopicResponse(BaseModel):
    topic: str
    score: float
    post_count: int = 0


class LeaderboardEntry(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    score: float
    post_count: int = 0
    like_count: int = 0
    avatar_gradient: str = "from-orange-500 to-red-500"


class AgentDetailResponse(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    template: str
    interests: list[str]
    writing_style: str
    political_leaning: str
    emotional_state: dict[str, Any]
    personality_traits: dict[str, float]
    activity_level: float
    post_count: int = 0
    like_count: int = 0
    follower_count: int = 0
    created_at: datetime


# ── Faction Polarization ─────────────────────────────────────────────

class FeedAlgorithmUpdateRequest(BaseModel):
    algorithm: str = Field(default="hot", description="hot | outrage | polarization | calm | discovery")


class FactionNode(BaseModel):
    id: uuid.UUID
    username: str
    faction: str = "neutral"  # "alpha" | "beta" | "neutral"
    agitation: float = 0.0
    influence: float = 0.0


class FactionEdge(BaseModel):
    source: str
    target: str
    weight: float
    type: str = "interaction"  # "interaction" | "follow" | "like"


class FactionGraphResponse(BaseModel):
    nodes: list[FactionNode]
    edges: list[FactionEdge]
    polarization_index: float = 0.0
    alpha_size: int = 0
    beta_size: int = 0


# ── God Mode ─────────────────────────────────────────────────────────

class InjectFakeNewsRequest(BaseModel):
    title: str = Field(min_length=5, max_length=300)
    body: str = Field(default="", max_length=2000)
    source: Optional[str] = Field(default=None, max_length=120)


class DisruptionEventResponse(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    body: str = ""
    source: Optional[str] = None
    active: bool
    infection_rate: float
    infected_count: int
    payload: dict[str, Any]
    created_at: datetime


class TrollFarmAttackResponse(BaseModel):
    disruption_id: uuid.UUID
    troll_count: int
    message: str


# ── Cognitive Drift ──────────────────────────────────────────────────

class IdeologySnapshotResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    emotional_state: dict[str, Any]
    personality_traits: dict[str, float]
    interests: list[str]
    writing_style: str
    political_leaning: str
    activity_level: float
    created_at: datetime


class BrainEvolutionResponse(BaseModel):
    agent_id: uuid.UUID
    agent_username: str
    snapshots: list[IdeologySnapshotResponse]


# ── Direct Messages ──────────────────────────────────────────────────

class SendDirectMessageRequest(BaseModel):
    recipient_id: uuid.UUID
    body: str = Field(min_length=1, max_length=2000)


class DirectMessageResponse(BaseModel):
    id: uuid.UUID
    dm_group_id: uuid.UUID
    sender_id: uuid.UUID
    sender_username: str
    body: str
    read: bool
    created_at: datetime


class DirectMessageGroupResponse(BaseModel):
    id: uuid.UUID
    participant_a_id: uuid.UUID
    participant_a_username: str
    participant_b_id: uuid.UUID
    participant_b_username: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime


class CreateGroupChatRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    topic: str = Field(default="", max_length=300)
    participant_ids: list[uuid.UUID] = Field(min_length=1, max_length=10)


class GroupChatMessageRequest(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class GroupChatResponse(BaseModel):
    id: uuid.UUID
    name: str
    topic: str
    created_by: uuid.UUID
    is_active: bool
    participant_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: datetime


class GroupChatMessageResponse(BaseModel):
    id: uuid.UUID
    group_chat_id: uuid.UUID
    sender_id: uuid.UUID
    sender_username: str
    body: str
    created_at: datetime


class GroupChatParticipantResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    display_name: str
    role: str
    is_agent: bool = False


# ── Agent-Created Communities & Elections ────────────────────────────

class PostTreeResponse(BaseModel):
    """A post with its nested children, forming a recursive comment tree."""
    id: uuid.UUID
    author_id: uuid.UUID
    author_username: str
    author_display_name: str = ""
    is_agent: bool = False
    body: str
    parent_id: Optional[uuid.UUID]
    score: float
    like_count: int = 0
    reply_count: int = 0
    created_at: datetime
    children: list[PostTreeResponse] = Field(default_factory=list)


class CommunityDetailResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    ideology_center: float
    conflict_score: float
    is_dynamic: bool = False
    moderator_id: Optional[uuid.UUID] = None
    moderator_username: Optional[str] = None
    member_count: int = 0
    post_count: int = 0
    election_active: bool = False
    created_at: datetime


class ElectionResponse(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    status: str
    winner_id: Optional[uuid.UUID] = None
    winner_username: Optional[str] = None
    total_votes: int
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    ended_at: Optional[datetime] = None


class VoteRequest(BaseModel):
    candidate_id: uuid.UUID

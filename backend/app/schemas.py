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

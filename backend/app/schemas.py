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
    body: str = Field(min_length=1, max_length=1200)
    community_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None


class PostResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    author_username: str
    body: str
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

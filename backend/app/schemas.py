from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

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
    community_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None


class PostResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    author_username: str
    body: str
    parent_id: uuid.UUID | None
    community_id: uuid.UUID | None
    score: float
    created_at: datetime


class EventEnvelope(BaseModel):
    id: uuid.UUID
    type: str
    actor_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    payload: dict[str, Any]
    correlation_id: str
    causation_id: str | None = None
    occurred_at: datetime


class AgentProfile(BaseModel):
    id: uuid.UUID
    username: str
    template: str
    emotional_state: dict[str, Any]
    activity_level: float
    next_wake_at: datetime


class ModerationDecision(BaseModel):
    allowed: bool
    toxicity: float
    spam: float
    action: Literal["allow", "cooldown", "shadow_limit", "ban_review"]
    reasons: list[str] = Field(default_factory=list)


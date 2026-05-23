from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    template: Mapped[str] = mapped_column(String(80), index=True)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    writing_style: Mapped[str] = mapped_column(String(255))
    political_leaning: Mapped[str] = mapped_column(String(120))
    emotional_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    personality_traits: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    activity_level: Mapped[float] = mapped_column(Float, default=0.5)
    active_hours: Mapped[list[int]] = mapped_column(JSON, default=list)
    next_wake_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    last_wake_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentRelationship(Base):
    __tablename__ = "agent_relationships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), index=True)
    target_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    affinity: Mapped[float] = mapped_column(Float, default=0.0)
    trust: Mapped[float] = mapped_column(Float, default=0.0)
    rivalry: Mapped[float] = mapped_column(Float, default=0.0)


class OpinionEdge(Base):
    __tablename__ = "opinion_edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), index=True)
    topic: Mapped[str] = mapped_column(String(120), index=True)
    stance: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


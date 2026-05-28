from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DisruptionEvent(Base):
    """A god-mode disruption event like fake news or a troll farm attack."""

    __tablename__ = "disruption_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(40), index=True)  # "fake_news" | "troll_farm"
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)  # original rumor source
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    infection_rate: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0 how far it's spread
    infected_count: Mapped[int] = mapped_column(default=0)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("ix_disruption_active", "kind", "active"),)


class TrollFaction(Base):
    """A temporary troll faction spawned by a God Mode troll farm attack."""

    __tablename__ = "troll_factions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    disruption_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disruption_events.id"), index=True)
    agent_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    username: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(120), default="")
    aggression: Mapped[float] = mapped_column(Float, default=0.8)
    posts_made: Mapped[int] = mapped_column(default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

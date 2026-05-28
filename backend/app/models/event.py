from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(80), index=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    correlation_id: Mapped[str] = mapped_column(String(120), index=True)
    causation_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_events_replay", "occurred_at", "type"),
        UniqueConstraint("correlation_id", name="uq_events_correlation_id"),
    )

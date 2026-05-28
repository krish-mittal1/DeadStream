from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class IdeologySnapshot(Base):
    """Weekly snapshot of an agent's ideological/emotional/trait state for tracking cognitive drift."""

    __tablename__ = "ideology_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), index=True)
    template: Mapped[str] = mapped_column(String(80))
    emotional_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    personality_traits: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    writing_style: Mapped[str] = mapped_column(String(255), default="")
    political_leaning: Mapped[str] = mapped_column(String(120), default="")
    activity_level: Mapped[float] = mapped_column(Float, default=0.5)
    snapshot_type: Mapped[str] = mapped_column(String(40), default="auto")  # "auto" | "manual"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (Index("ix_ideology_agent_time", "agent_id", "created_at"),)

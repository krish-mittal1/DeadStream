from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CommunityVibeProfile(Base):
    __tablename__ = "community_vibe_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    community_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), index=True
    )

    key: Mapped[str] = mapped_column(String(80), default="default")
    summary: Mapped[str] = mapped_column(Text, default="")
    profile: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    __table_args__ = (UniqueConstraint("community_id", "key", name="uq_community_vibe_key"),)


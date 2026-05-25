from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)   # recipient
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))               # who triggered it
    type: Mapped[str] = mapped_column(String(40))                                     # "reply" | "like" | "follow"
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)               # post_id or followee user_id
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "read"),
    )

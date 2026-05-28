from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DirectMessageGroup(Base):
    """A DM thread between two users (human to human, human to AI, or AI to AI)."""

    __tablename__ = "dm_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_a: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    participant_b: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("participant_a", "participant_b", name="uq_dm_pair"),)


class DirectMessage(Base):
    """A single message within a DM group."""

    __tablename__ = "direct_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    dm_group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dm_groups.id"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (Index("ix_dm_group_chrono", "dm_group_id", "created_at"),)


class GroupChat(Base):
    """A group chat room for AI roundtable debates."""

    __tablename__ = "group_chats"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    topic: Mapped[str] = mapped_column(String(300), default="")
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class GroupChatParticipant(Base):
    """A participant in a group chat."""

    __tablename__ = "group_chat_participants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("group_chats.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(40), default="participant")  # "participant" | "moderator"
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("group_chat_id", "user_id", name="uq_gc_participant"),)


class GroupChatMessage(Base):
    """A message in a group chat."""

    __tablename__ = "group_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("group_chats.id"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (Index("ix_gc_message_chrono", "group_chat_id", "created_at"),)

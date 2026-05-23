from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    community_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("communities.id"), nullable=True, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("posts.id"), nullable=True, index=True)
    body: Mapped[str] = mapped_column(Text)
    controversy_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    virality_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    __table_args__ = (Index("ix_posts_feed_rank", "created_at", "virality_score", "controversy_score"),)


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Follow(Base):
    __tablename__ = "follows"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    follower_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    followee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    strength: Mapped[float] = mapped_column(Float, default=0.1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Community(Base):
    __tablename__ = "communities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    ideology_center: Mapped[float] = mapped_column(Float, default=0.0)
    conflict_score: Mapped[float] = mapped_column(Float, default=0.0)
    moderator_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_dynamic: Mapped[bool] = mapped_column(default=False)  # dynamically spawned by agents
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CommunityMembership(Base):
    __tablename__ = "community_memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    community_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("communities.id"), index=True)
    role: Mapped[str] = mapped_column(String(40), default="member")  # "member" | "moderator" | "admin"
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("user_id", "community_id", name="uq_community_membership"),)


class CommunityElection(Base):
    """An election for choosing a community moderator."""

    __tablename__ = "community_elections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    community_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("communities.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="active")  # "active" | "completed" | "cancelled"
    winner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    total_votes: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CommunityElectionVote(Base):
    """A vote in a community election."""

    __tablename__ = "community_election_votes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    election_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("community_elections.id"), index=True)
    voter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("election_id", "voter_id", name="uq_election_vote"),)

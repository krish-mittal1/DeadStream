from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.store import event_store
from app.models.community import Community, CommunityElection, CommunityElectionVote, CommunityMembership
from app.models.user import User
from app.schemas import ElectionResponse


class ElectionService:
    async def start_election(
        self,
        session: AsyncSession,
        community_id: uuid.UUID,
    ) -> CommunityElection | None:
        """Start a moderator election for a community."""
        community = await session.get(Community, community_id)
        if not community:
            return None

        # Check for existing active election
        existing = await session.scalar(
            select(CommunityElection).where(
                CommunityElection.community_id == community_id,
                CommunityElection.status == "active",
            )
        )
        if existing:
            return existing

        election = CommunityElection(
            community_id=community_id,
            status="active",
        )
        session.add(election)
        await session.flush()
        await event_store.append(session, "election_started", None, community_id, {
            "community_slug": community.slug,
        })
        await session.commit()
        return election

    async def vote(
        self,
        session: AsyncSession,
        election_id: uuid.UUID,
        voter_id: uuid.UUID,
        candidate_id: uuid.UUID,
    ) -> bool:
        """Cast a vote in an election. Returns True if successful."""
        election = await session.get(CommunityElection, election_id)
        if not election or election.status != "active":
            return False

        # Ensure voter is a member of the community
        membership = await session.scalar(
            select(CommunityMembership).where(
                CommunityMembership.user_id == voter_id,
                CommunityMembership.community_id == election.community_id,
            )
        )
        if not membership:
            return False

        # Ensure candidate is a member
        candidate_membership = await session.scalar(
            select(CommunityMembership).where(
                CommunityMembership.user_id == candidate_id,
                CommunityMembership.community_id == election.community_id,
            )
        )
        if not candidate_membership:
            return False

        # Check if already voted
        existing = await session.scalar(
            select(CommunityElectionVote).where(
                CommunityElectionVote.election_id == election_id,
                CommunityElectionVote.voter_id == voter_id,
            )
        )
        if existing:
            return False

        vote = CommunityElectionVote(
            election_id=election_id,
            voter_id=voter_id,
            candidate_id=candidate_id,
        )
        session.add(vote)
        election.total_votes += 1
        await session.flush()

        await event_store.append(session, "election_vote_cast", voter_id, candidate_id, {
            "election_id": str(election_id),
        })
        await session.commit()
        return True

    async def end_election(
        self,
        session: AsyncSession,
        election_id: uuid.UUID,
    ) -> CommunityElection | None:
        """End an election and set the winner as community moderator."""
        election = await session.get(CommunityElection, election_id)
        if not election or election.status != "active":
            return None

        # Tally votes
        vote_counts = (
            await session.execute(
                select(CommunityElectionVote.candidate_id, func.count())
                .where(CommunityElectionVote.election_id == election_id)
                .group_by(CommunityElectionVote.candidate_id)
                .order_by(desc(func.count()))
                .limit(1)
            )
        ).first()

        if vote_counts:
            winner_id, _ = vote_counts
            election.winner_id = winner_id
            election.status = "completed"
            election.ended_at = datetime.now(timezone.utc)

            # Set winner as moderator
            community = await session.get(Community, election.community_id)
            if community:
                community.moderator_id = winner_id
                # Update membership role
                await session.execute(
                    CommunityMembership.__table__.update()
                    .where(
                        CommunityMembership.community_id == community.id,
                        CommunityMembership.user_id == winner_id,
                    )
                    .values(role="moderator")
                )

            await event_store.append(session, "election_completed", winner_id, election.community_id, {
                "total_votes": election.total_votes,
            })
        else:
            election.status = "cancelled"
            election.ended_at = datetime.now(timezone.utc)

        await session.commit()
        return election

    async def get_election(
        self,
        session: AsyncSession,
        election_id: uuid.UUID,
    ) -> ElectionResponse | None:
        """Get election details with candidates."""
        election = await session.get(CommunityElection, election_id)
        if not election:
            return None

        # Get votes grouped by candidate
        vote_rows = (
            await session.execute(
                select(CommunityElectionVote.candidate_id, func.count())
                .where(CommunityElectionVote.election_id == election_id)
                .group_by(CommunityElectionVote.candidate_id)
                .order_by(desc(func.count()))
            )
        ).all()

        candidates = []
        if vote_rows:
            # Batch-fetch all candidate users in one query instead of N
            candidate_ids = [candidate_id for candidate_id, _ in vote_rows]
            user_rows = await session.execute(
                select(User).where(User.id.in_(candidate_ids))
            )
            user_map = {u.id: u for u in user_rows.scalars().all()}
            for candidate_id, vote_count in vote_rows:
                user = user_map.get(candidate_id)
                candidates.append({
                    "user_id": str(candidate_id),
                    "username": user.username if user else "unknown",
                    "display_name": user.display_name if user and user.display_name else (user.username if user else "unknown"),
                    "votes": vote_count,
                })

        winner_username = None
        if election.winner_id:
            winner = await session.get(User, election.winner_id)
            winner_username = winner.username if winner else None

        return ElectionResponse(
            id=election.id,
            community_id=election.community_id,
            status=election.status,
            winner_id=election.winner_id,
            winner_username=winner_username,
            total_votes=election.total_votes,
            candidates=candidates,
            created_at=election.created_at,
            ended_at=election.ended_at,
        )

    async def get_active_election_for_community(
        self,
        session: AsyncSession,
        community_id: uuid.UUID,
    ) -> ElectionResponse | None:
        """Get the active election for a community, if any."""
        election = await session.scalar(
            select(CommunityElection).where(
                CommunityElection.community_id == community_id,
                CommunityElection.status == "active",
            )
        )
        if not election:
            return None
        return await self.get_election(session, election.id)


election_service = ElectionService()

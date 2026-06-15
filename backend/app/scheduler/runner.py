from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.core.metrics import SCHEDULER_TICK
from app.db.session import SessionLocal
from app.models.agent import Agent
from app.services.agent_engine import agent_engine

logger = get_logger(__name__)


class AgentScheduler:
    """Orchestrates periodic agent activation with per-agent rate limiting.

    Tracks action counts per agent per rolling minute window to prevent
    any single agent from monopolizing the scheduler.
    """

    def __init__(self) -> None:
        self._running = False
        self._locks: set[str] = set()
        # Rate limiting: {agent_id: [timestamp, ...]} — rolling window
        self._action_log: dict[str, list[datetime]] = defaultdict(list)

    async def run_forever(self) -> None:
        self._running = True
        while self._running:
            with SCHEDULER_TICK.time():
                await self.tick()
            await asyncio.sleep(settings.scheduler_tick_seconds)

    def _check_rate_limit(self, agent_id: str) -> bool:
        """Return True if agent is allowed to act (under the rate limit)."""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=60)
        # Prune old entries
        timestamps = [t for t in self._action_log[agent_id] if t > window_start]
        self._action_log[agent_id] = timestamps
        return len(timestamps) < settings.agent_rate_limit_per_minute

    def _record_action(self, agent_id: str) -> None:
        self._action_log[agent_id].append(datetime.now(timezone.utc))

    async def tick(self) -> None:
        async with SessionLocal() as session:
            # Use FOR UPDATE SKIP LOCKED to atomically claim agents across
            # multiple scheduler containers (horizontal scaling).
            # This prevents duplicate activations when running >1 backend.
            due = (
                await session.execute(
                    select(Agent)
                    .where(Agent.next_wake_at <= datetime.now(timezone.utc))
                    .order_by(Agent.next_wake_at)
                    .limit(settings.max_agent_actions_per_tick)
                    .with_for_update(skip_locked=True)
                )
            ).scalars().all()
            agent_ids = []
            for agent in due:
                key = str(agent.id)
                if not self._check_rate_limit(key):
                    logger.debug("agent_rate_limited", agent_id=key)
                    continue
                # Claim the agent by pushing its next wake time into the future,
                # ensuring no other scheduler process grabs it while we work.
                agent.next_wake_at = datetime.now(timezone.utc) + timedelta(minutes=5)
                agent_ids.append(agent.id)
            await session.commit()

        # Process each claimed agent in its own isolated database session
        for agent_id in agent_ids:
            key = str(agent_id)
            async with SessionLocal() as agent_session:
                try:
                    db_agent = await agent_session.get(Agent, agent_id)
                    if db_agent:
                        await agent_engine.activate(agent_session, db_agent)
                        self._record_action(key)
                except Exception as exc:
                    await agent_session.rollback()
                    logger.warning("agent_activation_failed", agent_id=key, error=str(exc))


scheduler = AgentScheduler()


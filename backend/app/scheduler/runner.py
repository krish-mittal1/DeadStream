from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

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
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=60)
        # Prune old entries
        timestamps = [t for t in self._action_log[agent_id] if t > window_start]
        self._action_log[agent_id] = timestamps
        return len(timestamps) < settings.agent_rate_limit_per_minute

    def _record_action(self, agent_id: str) -> None:
        self._action_log[agent_id].append(datetime.utcnow())

    async def tick(self) -> None:
        async with SessionLocal() as session:
            due = (
                await session.execute(
                    select(Agent)
                    .where(Agent.next_wake_at <= datetime.utcnow())
                    .order_by(Agent.next_wake_at)
                    .limit(settings.max_agent_actions_per_tick)
                )
            ).scalars().all()
            for agent in due:
                key = str(agent.id)
                if key in self._locks:
                    continue
                if not self._check_rate_limit(key):
                    logger.debug("agent_rate_limited", agent_id=key)
                    continue
                self._locks.add(key)
                try:
                    await agent_engine.activate(session, agent)
                    self._record_action(key)
                except Exception as exc:
                    await session.rollback()
                    logger.warning("agent_activation_failed", agent_id=key, error=str(exc))
                finally:
                    self._locks.discard(key)


scheduler = AgentScheduler()


from __future__ import annotations

import asyncio
from datetime import datetime

from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.core.metrics import SCHEDULER_TICK
from app.db.session import SessionLocal
from app.models.agent import Agent
from app.services.agent_engine import agent_engine

logger = get_logger(__name__)


class AgentScheduler:
    def __init__(self) -> None:
        self._running = False
        self._locks: set[str] = set()

    async def run_forever(self) -> None:
        self._running = True
        while self._running:
            with SCHEDULER_TICK.time():
                await self.tick()
            await asyncio.sleep(settings.scheduler_tick_seconds)

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
                self._locks.add(key)
                try:
                    await agent_engine.activate(session, agent)
                except Exception as exc:
                    await session.rollback()
                    logger.warning("agent_activation_failed", agent_id=key, error=str(exc))
                finally:
                    self._locks.discard(key)


scheduler = AgentScheduler()


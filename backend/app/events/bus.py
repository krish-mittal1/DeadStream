from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EventBus:
    def __init__(self) -> None:
        self._redis: redis.Redis | None = None

    async def connect(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        try:
            client = await self.connect()
            encoded = json.dumps(payload, default=str)
            await client.publish("events:live", encoded)  # type: ignore[union-attr]
            await client.xadd("events:stream", {"event": encoded}, maxlen=1_000_000, approximate=True)
        except Exception as exc:
            logger.warning("redis_publish_failed", error=str(exc), event_type=event_type)


event_bus = EventBus()


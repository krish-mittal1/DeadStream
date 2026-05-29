from __future__ import annotations

import json
from typing import Any, Optional

from pydantic import BaseModel
import redis.asyncio as redis

from app.core.config import settings

# Shared Redis client for cache operations (separate from the event bus connection)
_cache_redis: Optional[redis.Redis] = None


async def _get_cache() -> redis.Redis:
    global _cache_redis
    if _cache_redis is None:
        _cache_redis = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=3)
    return _cache_redis


def _make_cache_key(prefix: str, *parts: str | int) -> str:  # type: ignore[unused-function]
    return f"cache:{prefix}:" + ":".join(str(p) for p in parts)


def _jsonable(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    return value


async def cache_get(key: str) -> Any | None:
    """Get a cached value. Returns deserialized JSON or None on miss/error."""
    try:
        client = await _get_cache()
        raw = await client.get(key)
        if raw is not None:
            return json.loads(raw)
    except Exception:
        pass
    return None


async def cache_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """Store a value in cache with optional TTL (defaults to settings.cache_ttl_seconds)."""
    try:
        client = await _get_cache()
        ttl = ttl if ttl is not None else settings.cache_ttl_seconds
        await client.setex(key, ttl, json.dumps(_jsonable(value), default=str))
    except Exception:
        pass


async def cache_invalidate(pattern: str) -> None:
    """Invalidate all keys matching a glob pattern (e.g. 'cache:feed:*')."""
    try:
        client = await _get_cache()
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)  # type: ignore[union-attr]
            if keys:
                await client.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        pass


async def cache_health() -> bool:
    """Check if the cache server is reachable."""
    try:
        client = await _get_cache()
        return await client.ping()  # type: ignore[union-attr]
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Convenience wrappers for common patterns
# ---------------------------------------------------------------------------

async def get_or_compute(
    key: str,
    compute_func,  # type: ignore[arg-type]
    ttl: Optional[int] = None,
) -> Any:
    """Get from cache or compute and store."""
    cached = await cache_get(key)
    if cached is not None:
        return cached
    value = await compute_func()
    await cache_set(key, value, ttl)
    return value

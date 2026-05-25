from __future__ import annotations

import asyncio
import json
from typing import Optional

import redis.asyncio as redis
import socketio

from app.core.config import settings
from app.core.logging import get_logger
from app.core.metrics import ACTIVE_WS

logger = get_logger(__name__)
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.cors_origins)
_listener_task: Optional[asyncio.Task[None]] = None


@sio.event
async def connect(sid, environ, auth):  # type: ignore[no-untyped-def]
    ACTIVE_WS.inc()
    await sio.enter_room(sid, "global-feed")
    await sio.emit("presence", {"sid": sid, "status": "online"}, room="global-feed")


@sio.event
async def disconnect(sid):  # type: ignore[no-untyped-def]
    ACTIVE_WS.dec()
    await sio.emit("presence", {"sid": sid, "status": "offline"}, room="global-feed")


@sio.event
async def subscribe(sid, data):  # type: ignore[no-untyped-def]
    room = data.get("room", "global-feed")
    await sio.enter_room(sid, room)
    await sio.emit("subscribed", {"room": room}, to=sid)


@sio.event
async def typing(sid, data):  # type: ignore[no-untyped-def]
    await sio.emit("typing", data, room=data.get("room", "global-feed"), skip_sid=sid)


async def redis_listener() -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe("events:live")
    async for message in pubsub.listen():
        if message.get("type") != "message":
            continue
        try:
            payload = json.loads(message["data"])
            await sio.emit("event", payload, room="global-feed")
            if payload.get("type", "").endswith("posted") or payload.get("type") == "user_replied":
                await sio.emit("feed:new", payload, room="global-feed")
        except Exception as exc:
            logger.warning("socket_fanout_failed", error=str(exc))


def start_realtime_listener() -> None:
    global _listener_task
    if _listener_task is None or _listener_task.done():
        _listener_task = asyncio.create_task(redis_listener(), name="redis-realtime-listener")


async def stop_realtime_listener() -> None:
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

import redis.asyncio as redis
import socketio

from app.core.config import settings
from app.core.logging import get_logger
from app.core.metrics import ACTIVE_WS

logger = get_logger(__name__)
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.cors_origins)
_listener_task: Optional[asyncio.Task[None]] = None
_pubsub: Any = None  # Track for cleanup


def user_room(user_id: str) -> str:
    return f"user:{user_id}"


@sio.event
async def connect(sid, environ, auth):  # type: ignore[no-untyped-def]
    ACTIVE_WS.inc()
    await sio.enter_room(sid, "global-feed")
    # Optional auth payload: { user_id: "..." } so DMs can target this socket
    user_id = None
    if isinstance(auth, dict):
        user_id = auth.get("user_id")
    if user_id:
        await sio.enter_room(sid, user_room(str(user_id)))
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
async def join_user(sid, data):  # type: ignore[no-untyped-def]
    """Join a user-specific room for DM fanout (client sends after login)."""
    user_id = data.get("user_id") if isinstance(data, dict) else None
    if not user_id:
        return
    room = user_room(str(user_id))
    await sio.enter_room(sid, room)
    await sio.emit("subscribed", {"room": room}, to=sid)


@sio.event
async def typing(sid, data):  # type: ignore[no-untyped-def]
    room = data.get("room", "global-feed") if isinstance(data, dict) else "global-feed"
    # Prefer user rooms for DM typing
    target_user = data.get("target_user_id") if isinstance(data, dict) else None
    if target_user:
        await sio.emit("dm:typing", data, room=user_room(str(target_user)), skip_sid=sid)
        return
    await sio.emit("typing", data, room=room, skip_sid=sid)


async def _fanout_dm(payload: dict[str, Any]) -> None:
    """Emit dm:new (and optional typing) to participant user rooms."""
    actor = payload.get("actor_id")
    subject = payload.get("subject_id")
    body_payload = payload.get("payload") or {}
    dm_group_id = body_payload.get("dm_group_id")
    event = {
        "type": "dm:new",
        "dm_group_id": dm_group_id,
        "actor_id": actor,
        "subject_id": subject,
        "body": body_payload.get("body"),
        "occurred_at": payload.get("occurred_at"),
    }
    rooms: list[str] = []
    if actor:
        rooms.append(user_room(str(actor)))
    if subject and str(subject) != str(actor):
        rooms.append(user_room(str(subject)))
    for room in rooms:
        await sio.emit("dm:new", event, room=room)
        # Hint typing cleared / message arrived for the recipient
        if subject and room == user_room(str(subject)):
            await sio.emit(
                "dm:typing",
                {"dm_group_id": dm_group_id, "user_id": actor, "typing": False},
                room=room,
            )


async def redis_listener() -> None:
    global _pubsub
    client: redis.Redis = redis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[attr-defined]
    _pubsub = client.pubsub()  # type: ignore[union-attr]
    await _pubsub.subscribe("events:live")  # type: ignore[union-attr]
    try:
        async for message in _pubsub.listen():  # type: ignore[union-attr]
            if message.get("type") != "message":
                continue
            try:
                payload = json.loads(message["data"])
                await sio.emit("event", payload, room="global-feed")
                event_type = payload.get("type", "")
                if event_type.endswith("posted") or event_type.endswith("replied"):
                    await sio.emit("feed:new", payload, room="global-feed")
                if event_type == "dm_sent":
                    await _fanout_dm(payload)
            except Exception as exc:
                logger.warning("socket_fanout_failed", error=str(exc))
    finally:
        # Ensure pubsub connection is cleaned up on cancellation or error
        try:
            if _pubsub is not None:
                await _pubsub.unsubscribe()
                await _pubsub.close()
        except Exception:
            pass
        _pubsub = None


def start_realtime_listener() -> None:
    global _listener_task
    if _listener_task is None or _listener_task.done():
        _listener_task = asyncio.create_task(redis_listener(), name="redis-realtime-listener")


async def stop_realtime_listener() -> None:
    global _pubsub
    # Cancel the listener task first
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass
    # Ensure pubsub is cleaned up (redundant with finally block, but safe)
    if _pubsub is not None:
        try:
            await _pubsub.unsubscribe()
            await _pubsub.close()
        except Exception:
            pass
        _pubsub = None

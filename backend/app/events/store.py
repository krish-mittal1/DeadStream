from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.metrics import EVENT_COUNT
from app.events.bus import event_bus
from app.models.event import Event
from app.schemas import EventEnvelope


class EventStore:
    async def append(
        self,
        session: AsyncSession,
        event_type: str,
        actor_id: uuid.UUID | None,
        subject_id: uuid.UUID | None,
        payload: dict[str, Any],
        correlation_id: str | None = None,
        causation_id: str | None = None,
    ) -> EventEnvelope:
        event = Event(
            type=event_type,
            actor_id=actor_id,
            subject_id=subject_id,
            payload=payload,
            correlation_id=correlation_id or str(uuid.uuid4()),
            causation_id=causation_id,
        )
        session.add(event)
        await session.flush()
        envelope = EventEnvelope.model_validate(
            {
                "id": event.id,
                "type": event.type,
                "actor_id": event.actor_id,
                "subject_id": event.subject_id,
                "payload": event.payload,
                "correlation_id": event.correlation_id,
                "causation_id": event.causation_id,
                "occurred_at": event.occurred_at,
            }
        )
        EVENT_COUNT.labels(type=event_type).inc()
        await event_bus.publish(event_type, envelope.model_dump(mode="json"))
        return envelope

    async def replay(self, session: AsyncSession, limit: int = 200) -> list[EventEnvelope]:
        rows = await session.execute(select(Event).order_by(Event.occurred_at.desc()).limit(limit))
        return [
            EventEnvelope(
                id=e.id,
                type=e.type,
                actor_id=e.actor_id,
                subject_id=e.subject_id,
                payload=e.payload,
                correlation_id=e.correlation_id,
                causation_id=e.causation_id,
                occurred_at=e.occurred_at,
            )
            for e in rows.scalars()
        ]


event_store = EventStore()

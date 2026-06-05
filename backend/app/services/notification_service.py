from __future__ import annotations

import uuid
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.schemas import NotificationResponse


class NotificationService:
    async def create(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        type: str,
        entity_id: uuid.UUID | None = None,
    ) -> None:
        """Create a notification for a user (e.g., like, reply, follow)."""
        notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=type,
            entity_id=entity_id,
        )
        session.add(notification)

    async def list_notifications(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[NotificationResponse]:
        """List notifications for a user, most recent first."""
        rows = (
            await session.execute(
                select(Notification, User)
                .join(User, Notification.actor_id == User.id)
                .where(Notification.user_id == user_id)
                .order_by(desc(Notification.created_at))
                .offset(offset)
                .limit(limit)
            )
        ).all()

        results = []
        for notif, actor in rows:
            results.append(
                NotificationResponse(
                    id=notif.id,
                    type=notif.type,
                    actor_id=notif.actor_id,
                    actor_username=actor.username,
                    entity_id=notif.entity_id,
                    read=notif.read,
                    created_at=notif.created_at,
                )
            )
        return results

    async def unread_count(self, session: AsyncSession, user_id: uuid.UUID) -> int:
        """Count unread notifications."""
        return (
            await session.scalar(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == user_id, Notification.read == False)  # noqa: E712
            )
        ) or 0  # noqa: E711

    async def mark_read(self, session: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Mark a single notification as read."""
        result = await session.execute(
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(read=True)
        )
        await session.commit()
        return getattr(result, "rowcount", 0) > 0

    async def mark_all_read(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        """Mark all notifications as read."""
        await session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read == False)  # noqa: E712
            .values(read=True)
        )
        await session.commit()


notification_service = NotificationService()

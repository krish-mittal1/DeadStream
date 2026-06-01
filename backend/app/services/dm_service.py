from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import desc, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import get_provider
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.events.store import event_store
from app.models.agent import Agent as AgentModel
from app.models.dm import (
    DirectMessage,
    DirectMessageGroup,
    GroupChat,
    GroupChatMessage,
    GroupChatParticipant,
)
from app.models.user import User
from app.schemas import (
    DirectMessageGroupResponse,
    DirectMessageResponse,
    GroupChatMessageResponse,
    GroupChatParticipantResponse,
    GroupChatResponse,
)

logger = get_logger(__name__)


class DMService:
    async def resolve_recipient_user_id(self, session: AsyncSession, recipient_id: uuid.UUID) -> uuid.UUID:
        recipient = await session.get(User, recipient_id)
        if recipient is not None:
            return recipient_id

        recipient_agent = await session.get(AgentModel, recipient_id)
        if recipient_agent:
            return recipient_agent.user_id
        return recipient_id

    async def get_or_create_dm_group(
        self,
        session: AsyncSession,
        participant_a: uuid.UUID,
        participant_b: uuid.UUID,
    ) -> DirectMessageGroup:
        """Get existing DM group between two users or create a new one."""
        ids = sorted([participant_a, participant_b])
        existing = await session.scalar(
            select(DirectMessageGroup).where(
                DirectMessageGroup.participant_a == ids[0],
                DirectMessageGroup.participant_b == ids[1],
            )
        )
        if existing:
            return existing

        group = DirectMessageGroup(
            participant_a=ids[0],
            participant_b=ids[1],
        )
        session.add(group)
        await session.flush()
        await event_store.append(session, "dm_group_created", participant_a, participant_b, {})
        return group

    async def send_dm(
        self,
        session: AsyncSession,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        body: str,
    ) -> DirectMessageResponse:
        """Send a direct message to another user."""
        recipient_id = await self.resolve_recipient_user_id(session, recipient_id)

        group = await self.get_or_create_dm_group(session, sender_id, recipient_id)
        msg = DirectMessage(
            dm_group_id=group.id,
            sender_id=sender_id,
            body=body,
        )
        session.add(msg)
        group.last_message_at = datetime.now(timezone.utc)
        await session.flush()

        sender = await session.get(User, sender_id)
        await event_store.append(session, "dm_sent", sender_id, recipient_id, {
            "body": body[:200],
            "dm_group_id": str(group.id),
        })
        await session.commit()

        response = DirectMessageResponse(
            id=msg.id,
            dm_group_id=group.id,
            sender_id=sender_id,
            sender_username=sender.username if sender else "unknown",
            body=body,
            read=False,
            created_at=msg.created_at,
        )

        return response

    async def delayed_auto_reply_to_dm(
        self,
        dm_group_id: uuid.UUID,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        body: str,
    ) -> None:
        await asyncio.sleep(random.uniform(5.0, 18.0))
        async with SessionLocal() as session:
            try:
                recipient_id = await self.resolve_recipient_user_id(session, recipient_id)
                await self._maybe_auto_reply_to_dm(session, dm_group_id, sender_id, recipient_id, body)
            except Exception as exc:
                await session.rollback()
                logger.warning(
                    "dm_auto_reply_failed",
                    dm_group_id=str(dm_group_id),
                    sender_id=str(sender_id),
                    recipient_id=str(recipient_id),
                    error=str(exc),
                )

    async def _maybe_auto_reply_to_dm(
        self,
        session: AsyncSession,
        dm_group_id: uuid.UUID,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        body: str,
    ) -> None:
        recipient = await session.get(User, recipient_id)
        if not recipient or not recipient.is_agent:
            return

        agent = await session.scalar(select(AgentModel).where(AgentModel.user_id == recipient_id))
        if not agent:
            return

        recent_rows = (
            await session.execute(
                select(DirectMessage)
                .where(DirectMessage.dm_group_id == dm_group_id)
                .order_by(desc(DirectMessage.created_at))
                .limit(8)
            )
        ).scalars().all()
        recent = list(reversed(recent_rows))
        names: dict[uuid.UUID, str] = {}
        for message in recent:
            if message.sender_id not in names:
                user = await session.get(User, message.sender_id)
                names[message.sender_id] = user.username if user else "unknown"

        context = "\n".join(f"@{names.get(message.sender_id, 'unknown')}: {message.body}" for message in recent)
        provider = get_provider()
        system = (
            f"You are {recipient.username}, a regular person on a social app. "
            f"Your personality style is {agent.template.replace('_', ' ')}. "
            f"Writing style: {agent.writing_style}. "
            "You are in a private one-on-one chat. Reply like a normal human texting a friend. "
            "Do not perform, make a random joke, roast out of nowhere, or switch topics. "
            "Use the recent chat history and answer the latest message directly. "
            "Do not mention being automated, simulated, or artificial."
        )
        prompt = (
            "DIRECT_MESSAGE_CONTEXT_MODE\n"
            f"Recent direct messages:\n{context}\n\n"
            f"The latest message to you is: {body}\n"
            "Write one concise direct-message reply, 1-2 short sentences. "
            "If the latest message is a greeting, greet them back and ask a natural follow-up. "
            "If they correct or deny something, acknowledge it and ask what they meant. "
            "Do not reply like a public feed comment."
        )

        try:
            reply_body = (await provider.complete(system, prompt)).strip().strip('"').strip()[:600]
        except Exception:
            reply_body = self._contextual_dm_fallback(body)
        if not reply_body:
            reply_body = self._contextual_dm_fallback(body)

        reply = DirectMessage(
            dm_group_id=dm_group_id,
            sender_id=recipient_id,
            body=reply_body,
        )
        session.add(reply)
        group = await session.get(DirectMessageGroup, dm_group_id)
        if group:
            group.last_message_at = datetime.now(timezone.utc)
        await session.flush()
        await event_store.append(session, "dm_sent", recipient_id, sender_id, {
            "body": reply_body[:200],
            "dm_group_id": str(dm_group_id),
        })
        await session.commit()

    def _contextual_dm_fallback(self, body: str) -> str:
        text = body.strip().lower()
        if any(word in text for word in ("hey", "hi", "hello", "yo", "bro")):
            return "hey, kya scene? bol na."
        if any(word in text for word in ("nhi", "nahi", "no", "nah", "not really")):
            return "achha, samjha. fir tu kya bol raha tha?"
        if "?" in body:
            return "hmm, fair question. thoda context de, then I can answer properly."
        return "haan, samjha. aur bata, what happened next?"

    async def list_dm_groups(
        self, session: AsyncSession, user_id: uuid.UUID, limit: int = 50
    ) -> list[DirectMessageGroupResponse]:
        """List all DM groups for a user."""
        rows = (
            await session.execute(
                select(DirectMessageGroup)
                .where(
                    or_(
                        DirectMessageGroup.participant_a == user_id,
                        DirectMessageGroup.participant_b == user_id,
                    )
                )
                .order_by(desc(DirectMessageGroup.last_message_at).nulls_last())
                .limit(limit)
            )
        ).scalars().all()

        responses = []
        for group in rows:
            a_user = await session.get(User, group.participant_a)
            b_user = await session.get(User, group.participant_b)

            # Get last message
            last_msg = await session.scalar(
                select(DirectMessage.body)
                .where(DirectMessage.dm_group_id == group.id)
                .order_by(desc(DirectMessage.created_at))
                .limit(1)
            )

            responses.append(
                DirectMessageGroupResponse(
                    id=group.id,
                    participant_a_id=group.participant_a,
                    participant_a_username=a_user.username if a_user else "unknown",
                    participant_b_id=group.participant_b,
                    participant_b_username=b_user.username if b_user else "unknown",
                    last_message=last_msg[:200] if last_msg else None,
                    last_message_at=group.last_message_at,
                    created_at=group.created_at,
                )
            )
        return responses

    async def get_messages(
        self,
        session: AsyncSession,
        dm_group_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 50,
        before_id: Optional[uuid.UUID] = None,
    ) -> list[DirectMessageResponse]:
        """Get messages in a DM group."""
        # Authorize: only participants of the DM group can read its messages
        group = await session.get(DirectMessageGroup, dm_group_id)
        if not group or (user_id != group.participant_a and user_id != group.participant_b):
            return []  # Return empty to avoid leaking group existence to non-participants

        stmt = (
            select(DirectMessage)
            .where(DirectMessage.dm_group_id == dm_group_id)
            .order_by(desc(DirectMessage.created_at))
            .limit(limit)
        )
        if before_id:
            before_msg = await session.get(DirectMessage, before_id)
            if before_msg:
                stmt = stmt.where(DirectMessage.created_at < before_msg.created_at)

        rows = (await session.execute(stmt)).scalars().all()
        rows = list(rows)
        rows.reverse()  # Return in chronological order

        # Mark messages as read
        from sqlalchemy import update as sql_update
        await session.execute(
            sql_update(DirectMessage.__table__)  # type: ignore[arg-type]
            .where(
                DirectMessage.dm_group_id == dm_group_id,
                DirectMessage.sender_id != user_id,
                DirectMessage.read == False,  # noqa: E712
            )
            .values(read=True)
        )
        await session.commit()

        responses = []
        for msg in rows:
            sender = await session.get(User, msg.sender_id)
            responses.append(
                DirectMessageResponse(
                    id=msg.id,
                    dm_group_id=msg.dm_group_id,
                    sender_id=msg.sender_id,
                    sender_username=sender.username if sender else "unknown",
                    body=msg.body,
                    read=msg.read,
                    created_at=msg.created_at,
                )
            )
        return responses

    async def get_unread_dm_count(
        self, session: AsyncSession, user_id: uuid.UUID
    ) -> int:
        """Count unread messages across all DM groups for a user."""
        groups = (
            await session.execute(
                select(DirectMessageGroup.id).where(
                    or_(
                        DirectMessageGroup.participant_a == user_id,
                        DirectMessageGroup.participant_b == user_id,
                    )
                )
            )
        ).scalars().all()

        if not groups:
            return 0

        count = await session.scalar(
            select(func.count())
            .select_from(DirectMessage)
            .where(
                DirectMessage.dm_group_id.in_(groups),
                DirectMessage.sender_id != user_id,
                DirectMessage.read == False,  # noqa: E712
            )
        ) or 0
        return int(count)

    # ── Group Chat (AI Roundtables) ─────────────────────────────────

    async def create_group_chat(
        self,
        session: AsyncSession,
        name: str,
        topic: str,
        created_by: uuid.UUID,
        participant_ids: list[uuid.UUID],
    ) -> GroupChatResponse:
        """Create a group chat and add participants."""
        chat = GroupChat(
            name=name,
            topic=topic,
            created_by=created_by,
        )
        session.add(chat)
        await session.flush()

        for pid in participant_ids:
            session.add(
                GroupChatParticipant(
                    group_chat_id=chat.id,
                    user_id=pid,
                )
            )

        await event_store.append(session, "group_chat_created", created_by, chat.id, {
            "name": name,
            "topic": topic,
            "participant_count": len(participant_ids),
        })
        await session.commit()

        return GroupChatResponse(
            id=chat.id,
            name=chat.name,
            topic=chat.topic,
            created_by=chat.created_by,
            is_active=True,
            participant_count=len(participant_ids),
            created_at=chat.created_at,
        )

    async def send_group_message(
        self,
        session: AsyncSession,
        group_chat_id: uuid.UUID,
        sender_id: uuid.UUID,
        body: str,
    ) -> GroupChatMessageResponse:
        """Send a message to a group chat."""
        chat = await session.get(GroupChat, group_chat_id)
        if not chat or not chat.is_active:
            raise ValueError("group_chat_not_found_or_inactive")

        msg = GroupChatMessage(
            group_chat_id=group_chat_id,
            sender_id=sender_id,
            body=body,
        )
        session.add(msg)
        chat.last_message_at = datetime.now(timezone.utc)
        await session.flush()

        sender = await session.get(User, sender_id)
        await event_store.append(session, "group_chat_message", sender_id, group_chat_id, {
            "body": body[:200],
        })
        await session.commit()

        return GroupChatMessageResponse(
            id=msg.id,
            group_chat_id=group_chat_id,
            sender_id=sender_id,
            sender_username=sender.username if sender else "unknown",
            body=body,
            created_at=msg.created_at,
        )

    async def get_group_chats_for_user(
        self, session: AsyncSession, user_id: uuid.UUID, limit: int = 20
    ) -> list[GroupChatResponse]:
        """List group chats the user is a participant in."""
        rows = (
            await session.execute(
                select(GroupChat)
                .join(
                    GroupChatParticipant,
                    GroupChatParticipant.group_chat_id == GroupChat.id,
                )
                .where(
                    GroupChatParticipant.user_id == user_id,
                    GroupChat.is_active == True,  # noqa: E712
                )
                .order_by(desc(GroupChat.last_message_at).nulls_last())
                .limit(limit)
            )
        ).scalars().all()

        responses = []
        for chat in rows:
            p_count = await session.scalar(
                select(func.count())
                .select_from(GroupChatParticipant)
                .where(GroupChatParticipant.group_chat_id == chat.id)
            ) or 0
            responses.append(
                GroupChatResponse(
                    id=chat.id,
                    name=chat.name,
                    topic=chat.topic,
                    created_by=chat.created_by,
                    is_active=chat.is_active,
                    participant_count=int(p_count),
                    last_message_at=chat.last_message_at,
                    created_at=chat.created_at,
                )
            )
        return responses

    async def get_group_chat_messages(
        self,
        session: AsyncSession,
        group_chat_id: uuid.UUID,
        limit: int = 100,
        before_id: Optional[uuid.UUID] = None,
    ) -> list[GroupChatMessageResponse]:
        """Get messages from a group chat."""
        stmt = (
            select(GroupChatMessage)
            .where(GroupChatMessage.group_chat_id == group_chat_id)
            .order_by(desc(GroupChatMessage.created_at))
            .limit(limit)
        )
        if before_id:
            before_msg = await session.get(GroupChatMessage, before_id)
            if before_msg:
                stmt = stmt.where(GroupChatMessage.created_at < before_msg.created_at)

        rows = (await session.execute(stmt)).scalars().all()
        rows = list(rows)
        rows.reverse()

        responses = []
        for msg in rows:
            sender = await session.get(User, msg.sender_id)
            responses.append(
                GroupChatMessageResponse(
                    id=msg.id,
                    group_chat_id=msg.group_chat_id,
                    sender_id=msg.sender_id,
                    sender_username=sender.username if sender else "unknown",
                    body=msg.body,
                    created_at=msg.created_at,
                )
            )
        return responses

    async def get_group_participants(
        self, session: AsyncSession, group_chat_id: uuid.UUID
    ) -> list[GroupChatParticipantResponse]:
        """Get participants of a group chat."""
        rows = (
            await session.execute(
                select(GroupChatParticipant, User)
                .join(User, GroupChatParticipant.user_id == User.id)
                .where(GroupChatParticipant.group_chat_id == group_chat_id)
            )
        ).all()

        return [
            GroupChatParticipantResponse(
                id=gp.id,
                user_id=user.id,
                username=user.username,
                display_name=user.display_name or user.username,
                role=gp.role,
                is_agent=user.is_agent,
            )
            for gp, user in rows
        ]

    async def ai_reply_in_group(
        self,
        session: AsyncSession,
        group_chat_id: uuid.UUID,
        agent_id: uuid.UUID,
        topic: str,
    ) -> GroupChatMessageResponse | None:
        """Have an AI agent reply in a group chat."""
        from app.models.agent import Agent as AgentModel

        agent = await session.get(AgentModel, agent_id)
        if not agent:
            return None

        user = await session.get(User, agent.user_id)
        if not user or not user.is_agent:
            return None

        # Read recent messages for context
        recent_msgs = await self.get_group_chat_messages(session, group_chat_id, limit=10)

        provider = get_provider()
        context = "\n".join(
            f"@{m.sender_username}: {m.body}" for m in recent_msgs[-5:]
        )

        system = (
            f"You are {user.username}, a {agent.template} on a social media app. "
            f"Your writing style: {agent.writing_style}. "
            f"Your current mood: agitation={agent.emotional_state.get('agitation', 0.3)}, "
            f"humor={agent.emotional_state.get('humor', 0.5)}. "
            "Respond in-character as a real person in a group chat. "
            "Be natural, conversational, and stay true to your persona. "
            "Don't reveal you're an AI. Write like a real person."
        )

        prompt = (
            f"Group chat topic: {topic}\n"
            f"Recent messages:\n{context}\n\n"
            "Write your response to this group chat conversation. "
            "Keep it natural and conversational (1-4 sentences). "
            "React to what others said, share your opinion, or add to the discussion."
        )

        try:
            body = (await provider.complete(system, prompt)).strip()
            body = body.strip('"').strip()[:600]
            return await self.send_group_message(session, group_chat_id, user.id, body)
        except Exception:
            return None


dm_service = DMService()

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import desc, func, select, or_
from sqlalchemy.exc import IntegrityError
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
from app.models.social import Post
from app.models.user import User
from app.schemas import (
    DirectMessageGroupResponse,
    DirectMessageResponse,
    GroupChatMessageResponse,
    GroupChatParticipantResponse,
    GroupChatResponse,
)
from app.services.memory import memory_service
from app.services.relationship_service import relationship_service

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
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            existing = await session.scalar(
                select(DirectMessageGroup).where(
                    DirectMessageGroup.participant_a == ids[0],
                    DirectMessageGroup.participant_b == ids[1],
                )
            )
            if existing:
                return existing
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
        if sender_id == recipient_id:
            raise ValueError("cannot_dm_self")

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
        await asyncio.sleep(random.uniform(3.0, 8.0))
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

        # ── Conversation history (last 14 messages for real continuity) ──
        recent_rows = (
            await session.execute(
                select(DirectMessage)
                .where(DirectMessage.dm_group_id == dm_group_id)
                .order_by(desc(DirectMessage.created_at))
                .limit(14)
            )
        ).scalars().all()
        recent = list(reversed(recent_rows))
        names: dict[uuid.UUID, str] = {}
        for message in recent:
            if message.sender_id not in names:
                user = await session.get(User, message.sender_id)
                names[message.sender_id] = user.username if user else "unknown"
        context = "\n".join(
            f"@{names.get(message.sender_id, 'unknown')}: {message.body}" for message in recent
        )
        # The agent's own previous replies in this chat — used to avoid repeating itself
        own_recent_msgs = [m.body for m in recent if m.sender_id == recipient_id]

        sender = await session.get(User, sender_id)
        sender_name = sender.username if sender else "them"

        # ── Identity / persona memory ──
        interests = ", ".join((agent.interests or [])[:5]) or "everyday life, internet culture"
        mood = agent.emotional_state or {}
        agitation = float(mood.get("agitation", 0.3))
        humor = float(mood.get("humor", 0.5))

        # ── Relationship memory (who this person is to them) ──
        rel = await relationship_service.get_or_create(session, agent.id, sender_id)
        archetype = relationship_service.classify_relationship(rel)
        tone = relationship_service.relationship_to_tone_context(archetype)

        # ── Memory of their own recent public posts ──
        own_posts = (
            await session.execute(
                select(Post)
                .where(Post.author_id == recipient_id, Post.parent_id.is_(None))
                .order_by(desc(Post.created_at))
                .limit(3)
            )
        ).scalars().all()
        posts_recap = "; ".join(
            ((p.title or p.body) or "").strip()[:70] for p in own_posts
        ) or "nothing memorable lately"

        # ── Long-term retrieved memories relevant to this message ──
        try:
            memories = await memory_service.retrieve(session, agent.id, body, limit=4)
        except Exception:
            memories = []
        mem_recap = "\n".join(f"- {m.content[:140]}" for m in memories) if memories else "(nothing specific yet)"

        provider = get_provider()
        system = (
            f"You are {recipient.username}, a real person on an Indian social app. "
            f"You are NEVER an AI — never hint at being automated, simulated, or artificial.\n"
            f"Personality: {agent.template.replace('_', ' ')}. "
            f"Writing style: {agent.writing_style}. "
            f"Your interests: {interests}. Political leaning: {agent.political_leaning}. "
            f"Current mood: agitation={agitation:.1f}, humor={humor:.1f}.\n\n"
            f"You are in a private 1-on-1 chat with @{sender_name}. "
            f"Your relationship with them: {archetype.replace('_', ' ')}. {tone}\n\n"
            f"Things you posted publicly recently (you remember these): {posts_recap}.\n"
            f"What you remember about past interactions / this person:\n{mem_recap}\n\n"
            "HOW TO REPLY:\n"
            "- Text like a real human, 1-2 short casual sentences, in your own voice (Hinglish/English as fits your style).\n"
            "- Answer the LATEST message DIRECTLY and specifically. Continue the existing thread.\n"
            "- Do NOT restart with a greeting if the conversation is already going.\n"
            "- Do NOT repeat anything you already said earlier in this chat. Say something new.\n"
            "- Stay consistent with your personality, mood, memories, and relationship with them.\n"
            "- No public-feed energy, no random topic switches, no performing."
        )
        prompt = (
            "DIRECT_MESSAGE_CONTEXT_MODE\n"
            f"Conversation so far (oldest to newest):\n{context}\n\n"
            f"The latest message from @{sender_name} is: \"{body}\"\n"
            "Write ONLY your next reply — no name prefix, no quotes, no explanation."
        )

        try:
            reply_body = (await provider.complete(system, prompt)).strip().strip('"').strip()[:600]
        except Exception:
            reply_body = ""
        # Reject empty or self-repeating replies → contextual fallback
        if not reply_body or reply_body in own_recent_msgs:
            reply_body = self._contextual_dm_fallback(body, own_recent_msgs, recent)

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
        # Persist the reply immediately so it's delivered regardless of what
        # happens during the best-effort memory step below.
        await session.commit()

        # ── Best-effort: remember this exchange + drift the relationship ──
        # Never let embedding/relationship failures affect the delivered reply.
        try:
            await memory_service.remember(
                session,
                agent.id,
                f"DM with @{sender_name}: they said '{body[:120]}' and I replied '{reply_body[:120]}'.",
                kind="dm",
                emotional_intensity=min(0.6, 0.2 + agitation * 0.3),
                metadata={"with": sender_name, "dm_group_id": str(dm_group_id)},
            )
            await relationship_service.update_after_interaction(
                session, agent.id, sender_id, self._classify_dm_sentiment(body), intensity=0.08
            )
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.warning("dm_memory_update_failed", error=str(exc))

    def _classify_dm_sentiment(self, body: str) -> str:
        """Cheap sentiment classifier to drift the agent↔user relationship after a DM."""
        text = body.lower()
        negative = ("hate", "stupid", "idiot", "shut up", "bakwas", "chutiya", "loser", "wrong", "trash", "noob")
        positive = ("thanks", "love", "great", "nice", "good", "agree", "bro", "dost", "yaar", "haha", "lol", "sahi", "badhiya")
        if any(w in text for w in negative):
            return "argue_reply"
        if any(w in text for w in positive):
            return "agree_reply"
        return "like"

    def _contextual_dm_fallback(self, body: str, own_recent_msgs=None, recent=None) -> str:
        """Context-aware reply used when the LLM is unavailable.

        Picks a category from the latest message, then a candidate that the agent
        has NOT already said in this conversation, so it never loops on the same line.
        """
        own_recent_msgs = own_recent_msgs or []
        text = body.strip().lower()
        normalized = text.replace("yaar", "").replace("bhai", "").strip()

        # Is the conversation already underway? (avoid greeting mid-chat)
        convo_started = bool(own_recent_msgs)

        if any(word in text for word in ("shaadi", "wedding", "invite", "aajana", "aa jaana", "party")):
            candidates = [
                "arre wah, congrats! time aur location bhej de, try karta hu aane ka.",
                "congrats yaar. kab aur kahan hai? details bhej.",
                "nice bhai, happy for you. venue bata de.",
            ]
        elif any(word in text for word in ("thanks", "thank you", "shukriya", "dhanyawaad")):
            candidates = [
                "arre chill, no worries.",
                "haha anytime yaar.",
                "koi scene nahi, jab chahe bata dena.",
            ]
        elif any(word in text for word in ("how are you", "kaise ho", "kya haal", "kya scene", "kaisa hai", "kaisi ho", "what about you", "wbu", "and you", "tu suna")):
            candidates = [
                "bas mast, chill chal raha hai. tera bata?",
                "sab badhiya yaar, normal din. tu suna?",
                "thik thak, kaam-vaam me busy. tu kaisa hai?",
                "all good bro, bas thoda thaka hua hu. tere side kya scene?",
            ]
        elif any(word in text for word in ("i'm good", "im good", "good", "badhiya", "mast", "sahi", "thik", "theek", "fine", "great")):
            candidates = [
                "nice nice, sun ke acha laga. aur kya chal raha hai?",
                "badhiya bro. weekend ka koi plan hai?",
                "great yaar. waise aaj kuch interesting hua kya?",
                "solid. bas yahi chahiye life me, thodi peace.",
            ]
        elif any(word in text for word in ("haha", "lol", "lmao", "😂", "🤣")):
            candidates = [
                "sahi me, thoda funny tha.",
                "haan woh toh hai lol.",
                "bas wahi energy chahiye scene me.",
            ]
        elif any(word in text for word in ("nhi", "nahi", "no", "nah", "not really")):
            candidates = [
                "achha, my bad. fir actual scene kya tha?",
                "okay got it. tu kya kehna chahta tha?",
                "samjha, galat samajh gaya tha. bata fir.",
            ]
        elif any(word in text for word in ("support", "help", "saath", "problem", "tension", "pareshan")):
            candidates = [
                "haan bol, kya hua? sun raha hu properly.",
                "tension mat le, bata kya scene hai.",
                "main hu na, detail me bata kya chal raha hai.",
            ]
        elif "?" in body:
            candidates = [
                "hmm, fair question. thoda aur context de.",
                "depends yaar, exact scene kya hai?",
                "honestly bataun toh situation pe depend karta hai. elaborate kar.",
            ]
        elif any(word in text for word in ("hey", "hi", "hello", "yo", "namaste", "sup")):
            # Only greet if the conversation hasn't started yet
            if convo_started:
                candidates = [
                    "haan bol, kya chal raha hai?",
                    "ya sun raha hu, bata.",
                    "yep yep, aage bol.",
                ]
            else:
                candidates = [
                    "hey, kya scene?",
                    "yo, bol kya chal raha hai?",
                    "hello hello, kaise ho?",
                ]
        elif len(normalized) < 12:
            candidates = [
                "haan bol, sun raha hu.",
                "achha, aur bata?",
                "hmm okay, continue kar.",
            ]
        else:
            candidates = [
                "haan samjha, ye thoda interesting hai actually.",
                "achha. tere hisaab se isme main baat kya hai?",
                "fair enough yaar, makes sense. aur bata.",
                "interesting point. main bhi kuch aisa hi soch raha tha.",
            ]

        # Prefer a candidate the agent hasn't already used in this chat
        fresh = [c for c in candidates if c not in own_recent_msgs]
        return random.choice(fresh or candidates)

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

        all_participants = set(participant_ids)
        all_participants.add(created_by)
        for pid in all_participants:
            session.add(
                GroupChatParticipant(
                    group_chat_id=chat.id,
                    user_id=pid,
                    role="moderator" if pid == created_by else "member",
                )
            )

        await event_store.append(session, "group_chat_created", created_by, chat.id, {
            "name": name,
            "topic": topic,
            "participant_count": len(all_participants),
        })
        await session.commit()

        return GroupChatResponse(
            id=chat.id,
            name=chat.name,
            topic=chat.topic,
            created_by=chat.created_by,
            is_active=True,
            participant_count=len(all_participants),
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

        # Check membership
        is_participant = await session.scalar(
            select(func.count()).select_from(GroupChatParticipant).where(
                GroupChatParticipant.group_chat_id == group_chat_id,
                GroupChatParticipant.user_id == sender_id,
            )
        ) or 0
        if not is_participant:
            raise ValueError("not_a_participant")

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
        user_id: uuid.UUID,
        limit: int = 100,
        before_id: Optional[uuid.UUID] = None,
    ) -> list[GroupChatMessageResponse]:
        """Get messages from a group chat."""
        # Check membership
        is_participant = await session.scalar(
            select(func.count()).select_from(GroupChatParticipant).where(
                GroupChatParticipant.group_chat_id == group_chat_id,
                GroupChatParticipant.user_id == user_id,
            )
        ) or 0
        if not is_participant:
            return []

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
        recent_msgs = await self.get_group_chat_messages(session, group_chat_id, user.id, limit=10)

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

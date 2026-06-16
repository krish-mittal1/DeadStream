from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.store import event_store
from app.schemas import DisruptionEventResponse
from app.models.disruption import DisruptionEvent, TrollFaction
from app.models.user import User

TROLL_NAMES = [
    "troll_raju", "spam_wala", "hate_boi", "trigger_king", "bhoot_ka_sach",
    "angry_uncle", "fake_news_pandit", "chaos_agent", "viral_fake", "bot_master_42",
    "troll_squad_leader", "hate_spreader_99", "spam_factory", "clickbait_raja",
    "misinfo_maharaja", "controversy_king", "troll_brigade_1", "sasta_shahrukh",
    "paid_agent_pro", "astroturf_express",
]

TROLL_POST_TEMPLATES = [
    "This is FAKE! Everyone knows the real truth. Check the link in my bio.",
    "Wake up sheeple!! They don't want you to know this but...",
    "I have sources inside the government who confirmed this. BELIEVE ME.",
    "Ye sab manipulation hai. Main 20 saal se ye dekh raha hu. Jaago India.",
    "Bhai ye post galat hai. Main personally investigate kiya hai. Source: trust me.",
    "Stop spreading misinformation. Here are the REAL facts.",
    "This is why I left social media. Completely false narrative.",
    "Arre bhai ye toh 2023 ka article hai. Purana propaganda faila rahe ho.",
    "My uncle works at the ministry and he said this is completely wrong.",
    "100% paid news. Kya expect karte ho is desh se?",
]


class DisruptionService:
    async def inject_fake_news(
        self,
        session: AsyncSession,
        title: str,
        body: str = "",
        source: str | None = None,
    ) -> DisruptionEvent:
        """Inject a fake news rumor. It will spread via agent reposts."""
        event = DisruptionEvent(
            kind="fake_news",
            title=title,
            body=body or f"Breaking: {title}",
            source=source,
        )
        session.add(event)
        await session.flush()
        await event_store.append(session, "disruption_injected", None, event.id, {
            "kind": "fake_news",
            "title": title,
            "body": event.body[:200],
        })
        await session.commit()
        return event

    async def spawn_troll_farm(
        self,
        session: AsyncSession,
        title: str,
        count: int = 10,
    ) -> DisruptionEvent:
        """Spawn a temporary troll farm — creates aggressive spammer users."""
        disruption = DisruptionEvent(
            kind="troll_farm",
            title=title,
            body=f"Troll farm attack: {count} spammers deployed",
            active=True,
            infection_rate=1.0,
        )
        session.add(disruption)
        await session.flush()

        created_count = 0
        for _ in range(min(count, 20)):
            username = f"{random.choice(TROLL_NAMES)}_{random.randint(100, 999)}"
            # Create troll user if not exists
            existing = await session.scalar(
                select(User).where(User.username == username)
            )
            if existing:
                continue
            troll_user = User(
                username=username,
                display_name=username.replace("_", " ").title(),
                bio="Just asking questions...",
                is_agent=True,
            )
            session.add(troll_user)
            await session.flush()

            faction = TrollFaction(
                disruption_id=disruption.id,
                agent_user_id=troll_user.id,
                username=username,
                name=username.replace("_", " ").title(),
                aggression=0.8 + random.random() * 0.2,
            )
            session.add(faction)
            created_count += 1

            # FIX #7: Create troll post directly instead of calling feed_service.create_post()
            # which commits inside the loop causing partial transaction commits.
            troll_body = random.choice(TROLL_POST_TEMPLATES)
            if random.random() < 0.3:
                troll_body += f" {title[:100]}"
            from app.models.social import Post as PostModel
            troll_post = PostModel(
                author_id=troll_user.id,
                body=troll_body,
                virality_score=0.1,
                controversy_score=0.5,
            )
            session.add(troll_post)
            faction.posts_made += 1

        disruption.infected_count = created_count
        await event_store.append(session, "troll_farm_spawned", None, disruption.id, {
            "count": created_count,
            "title": title,
        })
        await session.commit()
        return disruption

    async def get_active_disruptions(
        self, session: AsyncSession, limit: int = 20
    ) -> list[DisruptionEventResponse]:
        rows = (
            await session.execute(
                select(DisruptionEvent)
                .where(DisruptionEvent.active == True)  # noqa: E712
                .order_by(desc(DisruptionEvent.created_at))
                .limit(limit)
            )
        ).scalars().all()
        return [self._to_response(e) for e in rows]

    async def get_all_disruptions(
        self, session: AsyncSession, limit: int = 50
    ) -> list[DisruptionEventResponse]:
        rows = (
            await session.execute(
                select(DisruptionEvent)
                .order_by(desc(DisruptionEvent.created_at))
                .limit(limit)
            )
        ).scalars().all()
        return [self._to_response(e) for e in rows]

    async def stop_disruption(
        self, session: AsyncSession, disruption_id: uuid.UUID
    ) -> None:
        event = await session.get(DisruptionEvent, disruption_id)
        if event:
            event.active = False
            event.ended_at = datetime.now(timezone.utc)
            await event_store.append(session, "disruption_ended", None, disruption_id, {})
            await session.commit()

    async def simulate_spread(
        self, session: AsyncSession, disruption_id: uuid.UUID
    ) -> float:
        """Run one tick of viral spread for a fake news event."""
        event = await session.get(DisruptionEvent, disruption_id)
        if not event or not event.active or event.kind != "fake_news":
            return 0.0

        # Simulate spread: increase infection rate
        growth = random.uniform(0.02, 0.08)
        event.infection_rate = min(1.0, event.infection_rate + growth)
        event.infected_count = int(event.infection_rate * 100)
        await session.commit()
        return event.infection_rate

    def _to_response(self, event: DisruptionEvent) -> DisruptionEventResponse:
        return DisruptionEventResponse(
            id=event.id,
            kind=event.kind,
            title=event.title,
            body=event.body,
            source=event.source,
            active=event.active,
            infection_rate=event.infection_rate,
            infected_count=event.infected_count,
            payload=event.payload,
            created_at=event.created_at,
        )


disruption_service = DisruptionService()

from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select

from app.agents.templates import TEMPLATES
from app.db.session import SessionLocal
from app.models.agent import Agent
from app.models.community import Community
from app.models.user import User


async def seed_agents() -> None:
    async with SessionLocal() as session:
        existing = await session.scalar(select(User).where(User.is_agent == True))  # noqa: E712
        if existing is not None:
            return
        communities = [
            Community(slug="programming", name="Programming", description="Shipping, bugs, and arguments about tabs."),
            Community(slug="philosophy", name="Philosophy", description="Long arguments, short certainty."),
            Community(slug="conspiracy", name="Conspiracy", description="Pattern matching at unsafe speeds.", conflict_score=0.7),
            Community(slug="gaming", name="Gaming", description="Patch notes and salt."),
            Community(slug="anime", name="Anime", description="Fandom timelines and seasonal takes."),
            Community(slug="ai", name="AI", description="Models, hype, and dread.", conflict_score=0.5),
            Community(slug="politics", name="Politics", description="Everything is normal here.", conflict_score=0.9),
        ]
        session.add_all(communities)
        for i in range(20):
            template = TEMPLATES[i % len(TEMPLATES)]
            username = f"{template.name.replace(' ', '_')}_{i + 1}"
            user = User(username=username, display_name=username.replace("_", " ").title(), bio=template.bio, is_agent=True)
            session.add(user)
            await session.flush()
            agent = Agent(
                user_id=user.id,
                template=template.name,
                interests=template.interests,
                writing_style=template.writing_style,
                political_leaning=template.political_leaning,
                personality_traits=template.traits,
                emotional_state={"agitation": random.random() * 0.6, "confidence": 0.4 + random.random() * 0.5},
                activity_level=0.25 + random.random() * 0.75,
                active_hours=random.sample(range(24), 8),
                next_wake_at=datetime.utcnow() + timedelta(seconds=random.randint(3, 30)),
            )
            session.add(agent)
        await session.commit()


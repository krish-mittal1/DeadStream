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
            Community(slug="programming", name="Programming", description="Shipping, bugs, and arguments about tabs vs spaces."),
            Community(slug="philosophy", name="Philosophy", description="Long arguments, short certainty, infinite regress."),
            Community(slug="conspiracy", name="Conspiracy", description="Pattern matching at unsafe speeds.", conflict_score=0.7),
            Community(slug="gaming", name="Gaming", description="Patch notes, salt, and skill issue discourse."),
            Community(slug="anime", name="Anime", description="Fandom timelines and seasonal takes."),
            Community(slug="ai", name="AI", description="Models, hype, alignment dread, and vibe checks.", conflict_score=0.5),
            Community(slug="politics", name="Politics", description="Everything is normal here.", conflict_score=0.9),
            Community(slug="crypto", name="Crypto", description="Gm. Number go up. WAGMI.", conflict_score=0.4),
            Community(slug="science", name="Science", description="Peer-reviewed takes and citation wars."),
            Community(slug="lounge", name="Lounge", description="Random conversation, low stakes, high vibes."),
            Community(slug="sports", name="Sports", description="Hot takes, goat debates, and injury updates.", conflict_score=0.6),
            Community(slug="movies", name="Movies", description="Box office, hot takes, and spoiler discourse."),
            Community(slug="music", name="Music", description="Album drops, genre wars, and live set chaos."),
            Community(slug="fitness", name="Fitness", description="Gains, form checks, and supplement alpha."),
            Community(slug="food", name="Food", description="Reviews, recipes, and unhinged takes on pineapple pizza."),
            Community(slug="travel", name="Travel", description="Itineraries, flexes, and airport horror stories."),
            Community(slug="fashion", name="Fashion", description="Fits, drops, and silhouette discourse."),
            Community(slug="climate", name="Climate", description="Degrees, doom, and what's actually being done.", conflict_score=0.7),
            Community(slug="history", name="History", description="Takes on events you barely remember learning about."),
            Community(slug="mental-health", name="Mental Health", description="Coping, venting, solidarity, and therapy memes."),
        ]
        session.add_all(communities)

        for i in range(500):
            template = TEMPLATES[i % len(TEMPLATES)]
            suffix = i + 1
            username = f"{template.name.replace(' ', '_')}_{suffix}"
            user = User(
                username=username,
                display_name=username.replace("_", " ").title(),
                bio=template.bio,
                is_agent=True,
            )
            session.add(user)
            await session.flush()

            # Vary wake times to stagger initial activity bursts across ~10 minutes
            wake_seconds = random.randint(5, 600)
            agent = Agent(
                user_id=user.id,
                template=template.name,
                interests=template.interests,
                writing_style=template.writing_style,
                political_leaning=template.political_leaning,
                personality_traits=template.traits,
                emotional_state={
                    "agitation": round(random.random() * 0.6, 3),
                    "confidence": round(0.35 + random.random() * 0.55, 3),
                    "curiosity": round(0.3 + random.random() * 0.5, 3),
                },
                activity_level=round(0.2 + random.random() * 0.8, 3),
                active_hours=sorted(random.sample(range(24), random.randint(6, 10))),
                next_wake_at=datetime.utcnow() + timedelta(seconds=wake_seconds),
            )
            session.add(agent)

        await session.commit()

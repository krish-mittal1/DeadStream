from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=20, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def init_models() -> None:
    """Ensure pgvector extension exists; optionally create tables for dev convenience.

    In production (``PRODUCTION=true``) only the vector extension is created —
    schema management is delegated to Alembic migrations:

        alembic upgrade head

    In development, tables are auto-created so ``docker compose up`` works
    without a manual migration step.
    """
    from app.core.config import settings as _settings
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        if not _settings.production:
            await conn.run_sync(Base.metadata.create_all)


async def close_engine() -> None:
    await engine.dispose()

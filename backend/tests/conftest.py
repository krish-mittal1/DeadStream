"""
Test fixtures.

Unit tests that touch model schemas requiring pgvector (e.g. AgentMemory)
should be marked with @pytest.mark.integration and excluded in CI with
``-m "not integration"``.  Pure-logic tests (auth, feed RPC, etc.) should
work without a live Postgres instance.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event as sa_event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import Base, get_session
from app.main import fastapi_app

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(autouse=True)
async def _clean_db(test_engine):
    """Ensure a clean database state before each test."""
    async with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            try:
                await conn.run_sync(table.drop, checkfirst=True)
            except Exception:
                pass
        for table in Base.metadata.sorted_tables:
            try:
                await conn.run_sync(table.create, checkfirst=True)
            except Exception:
                pass
    yield


@pytest.fixture(scope="session")
def event_loop():
    """Provide a session-scoped event loop for async fixtures."""
    import asyncio

    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create a SQLite test engine, skipping tables with pgvector Vector columns."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Enable WAL mode + foreign keys for SQLite compatibility
    @sa_event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        # Create tables individually, skipping those with pgvector Vector types
        for table in Base.metadata.sorted_tables:
            try:
                await conn.run_sync(table.create, checkfirst=True)
            except Exception:
                # Skip tables with unsupported column types (e.g. pgvector Vector on SQLite)
                pass

    yield engine

    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            try:
                await conn.run_sync(table.drop, checkfirst=True)
            except Exception:
                pass
    await engine.dispose()


@pytest.fixture
async def test_session(test_engine):
    """Fresh session per test."""
    session_local = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with session_local() as session:
        yield session


@pytest.fixture
async def client(test_session):
    """HTTPX async client with SQLite-backed session."""

    async def override_get_session():
        yield test_session

    fastapi_app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()

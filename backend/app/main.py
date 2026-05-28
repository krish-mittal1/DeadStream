from __future__ import annotations

import asyncio
from contextlib import suppress
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import global_exception_handler
from app.core.logging import configure_logging, get_logger
from app.core.metrics import REQUEST_COUNT
from app.core.ratelimit import limiter
from app.db.session import close_engine, init_models
from app.realtime.gateway import sio, start_realtime_listener, stop_realtime_listener
from app.scheduler.runner import scheduler
from app.seed import seed_agents
from app.services.embedder import embedder

logger = get_logger(__name__)


@asynccontextmanager  # type: ignore[deprecated]
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    await init_models()
    await seed_agents()
    # Warm up the sentence embedding model so it doesn't block the first agent activation
    try:
        logger.info("warming up embedding model...")
        embedder().embed("warmup")
        logger.info("embedding model ready")
    except Exception as exc:
        logger.warning("embedding model warmup failed (will lazy-load later): %s", exc)
    start_realtime_listener()
    scheduler_task = asyncio.create_task(scheduler.run_forever(), name="agent-scheduler")
    logger.info("app_started")
    try:
        yield
    finally:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task
        await stop_realtime_listener()
        await close_engine()
        logger.info("app_stopped")


fastapi_app = FastAPI(
    title="DeadStream API",
    version="0.1.0",
    lifespan=lifespan,
    exception_handlers={Exception: global_exception_handler},
)

# CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


@fastapi_app.middleware("http")
async def count_requests(request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    REQUEST_COUNT.labels(method=request.method, path=request.url.path, status=response.status_code).inc()
    return response


fastapi_app.include_router(api_router, prefix="/api")
fastapi_app.mount("/metrics", make_asgi_app())

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

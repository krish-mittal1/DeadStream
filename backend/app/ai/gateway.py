"""Global LLM gateway: per-minute budget + exponential backoff on 429s."""

from __future__ import annotations

import asyncio
import time
from collections import deque

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMGateway:
    """Serialize LLM calls behind a shared budget and 429 backoff."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._timestamps: deque[float] = deque()
        self._backoff_until: float = 0.0
        self._consecutive_429s: int = 0

    def _budget(self) -> int:
        return max(1, int(settings.llm_budget_per_minute))

    def _prune(self, now: float) -> None:
        cutoff = now - 60.0
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()

    async def acquire(self) -> None:
        """Wait until a call is allowed under budget + backoff."""
        while True:
            async with self._lock:
                now = time.monotonic()
                if now < self._backoff_until:
                    wait = self._backoff_until - now
                else:
                    self._prune(now)
                    if len(self._timestamps) < self._budget():
                        self._timestamps.append(now)
                        return
                    wait = max(0.05, 60.0 - (now - self._timestamps[0]))
            await asyncio.sleep(min(wait, 5.0))

    async def record_success(self) -> None:
        async with self._lock:
            self._consecutive_429s = 0

    async def record_rate_limit(self) -> None:
        async with self._lock:
            self._consecutive_429s += 1
            base = float(settings.llm_429_backoff_base_seconds)
            cap = float(settings.llm_429_backoff_max_seconds)
            delay = min(cap, base * (2 ** (self._consecutive_429s - 1)))
            self._backoff_until = time.monotonic() + delay
            logger.warning(
                "llm_rate_limited",
                consecutive=self._consecutive_429s,
                backoff_seconds=round(delay, 2),
            )

    def is_http_429(self, exc: BaseException) -> bool:
        resp = getattr(exc, "response", None)
        if resp is not None and getattr(resp, "status_code", None) == 429:
            return True
        status = getattr(exc, "status_code", None)
        return status == 429


llm_gateway = LLMGateway()


class BudgetedProvider:
    """Wrap an AIProvider so every complete() goes through the global gateway."""

    def __init__(self, inner: object) -> None:
        self._inner = inner

    async def complete(self, system: str, prompt: str) -> str:
        from app.ai.providers import MockProvider

        await llm_gateway.acquire()
        try:
            result = await self._inner.complete(system, prompt)  # type: ignore[attr-defined]
            await llm_gateway.record_success()
            return str(result)
        except Exception as exc:
            if llm_gateway.is_http_429(exc):
                await llm_gateway.record_rate_limit()
                if "DIRECT_MESSAGE_CONTEXT_MODE" in prompt:
                    return ""
                return await MockProvider().complete(system, prompt)
            raise

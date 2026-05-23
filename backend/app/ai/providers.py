from __future__ import annotations

from abc import ABC, abstractmethod

import httpx

from app.core.config import settings


class AIProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, prompt: str) -> str:
        raise NotImplementedError


class MockProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        topic = prompt.splitlines()[0][:80] if prompt else "the timeline"
        return f"{topic} is getting weird. I have receipts, vibes, and exactly one questionable conclusion."


class OpenAIProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        if not settings.openai_api_key:
            return await MockProvider().complete(system, prompt)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    "temperature": 0.9,
                    "max_tokens": 180,
                },
            )
            response.raise_for_status()
            return str(response.json()["choices"][0]["message"]["content"])


class GeminiProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        if not settings.gemini_api_key:
            return await MockProvider().complete(system, prompt)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
                params={"key": settings.gemini_api_key},
                json={"contents": [{"parts": [{"text": f"{system}\n\n{prompt}"}]}]},
            )
            response.raise_for_status()
            return str(response.json()["candidates"][0]["content"]["parts"][0]["text"])


class OllamaProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={"model": "llama3.1", "prompt": f"{system}\n\n{prompt}", "stream": False},
            )
            response.raise_for_status()
            return str(response.json().get("response", ""))


def get_provider() -> AIProvider:
    if settings.ai_provider == "openai":
        return OpenAIProvider()
    if settings.ai_provider == "gemini":
        return GeminiProvider()
    if settings.ai_provider == "ollama":
        return OllamaProvider()
    return MockProvider()


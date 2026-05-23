from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://dead:dead@localhost:5432/deadstream"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-only"
    ai_provider: str = "mock"
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    scheduler_tick_seconds: float = 1.5
    max_agent_actions_per_tick: int = 5


settings = Settings()

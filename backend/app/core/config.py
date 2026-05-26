from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from root .env (one level up from backend/) and fall back to local .env
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str = Field(default="postgresql+asyncpg://dead:dead@localhost:5432/deadstream")
    redis_url: str = Field(default="redis://localhost:6379/0")

    # JWT — must be set via env in production; no insecure default
    jwt_secret: str = Field(min_length=32)

    ai_provider: str = Field(default="mock")
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    ollama_base_url: str = "http://localhost:11434"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    scheduler_tick_seconds: float = 1.5
    max_agent_actions_per_tick: int = 20

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Cache TTL
    cache_ttl_seconds: int = 30


settings = Settings()

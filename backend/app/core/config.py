from __future__ import annotations

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from root .env (one level up from backend/) and fall back to local .env
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    # ── Production guard ────────────────────────────────────
    production: bool = Field(default=False, description="Enable production-safe defaults and validation")

    database_url: str = Field(default="postgresql+asyncpg://dead:dead@localhost:5432/deadstream")
    redis_url: str = Field(default="redis://localhost:6379/0")

    # JWT — must be set via env in production; no insecure default
    jwt_secret: str = Field(default="dev-jwt-secret-change-in-production-32chars!", min_length=32)

    ai_provider: str = Field(default="mock")  # auto-detected as 'gemini' if gemini_api_key is set
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    ollama_base_url: str = "http://localhost:11434"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    scheduler_tick_seconds: float = 90.0
    max_agent_actions_per_tick: int = 1

    # Rate limiting
    rate_limit_per_minute: int = 60
    agent_rate_limit_per_minute: int = Field(default=1, description="Max agent activations per rolling minute")

    # Cache TTL
    cache_ttl_seconds: int = 30

    # Request size limit (bytes; 0 = unlimited)
    max_request_size: int = Field(default=2_097_152, description="Max request body size in bytes (default 2 MiB)")

    def validate_production(self) -> None:
        """Raise ``RuntimeError`` if production-mode invariants are violated."""
        if not self.production:
            return
        if "dev-" in self.jwt_secret:
            raise RuntimeError(
                "PRODUCTION=true but JWT_SECRET still contains the development default. "
                "Generate a strong secret with: openssl rand -hex 32"
            )
        if self.ai_provider != "mock" and self.ai_provider != "ollama":
            if self.ai_provider == "openai" and not self.openai_api_key:
                raise RuntimeError("PRODUCTION=true and AI_PROVIDER=openai but OPENAI_API_KEY is not set")
            if self.ai_provider == "gemini" and not self.gemini_api_key:
                raise RuntimeError("PRODUCTION=true and AI_PROVIDER=gemini but GEMINI_API_KEY is not set")
        if "dead:dead@" in self.database_url:
            raise RuntimeError(
                "PRODUCTION=true but DATABASE_URL still uses the default credentials (dead:dead). "
                "Set proper credentials via environment."
            )


settings = Settings()

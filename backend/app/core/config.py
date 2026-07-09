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
    agent_min_sleep_seconds: int = Field(default=5, description="Min seconds before an agent wakes again")
    agent_max_sleep_seconds: int = Field(default=7200, description="Max seconds before an agent wakes again")

    # Human-like activity patterns
    agent_quiet_hours_enabled: bool = Field(
        default=True, description="Gate agent posting outside plausible active hours"
    )
    agent_timezone: str = Field(default="Asia/Kolkata", description="IANA timezone for routine gating")
    agent_default_active_hours: list[int] = Field(
        default_factory=lambda: list(range(7, 24)),
        description="Fallback active hours (0-23) when agent.active_hours is empty",
    )
    agent_weekend_activity_multiplier: float = Field(
        default=0.75, description="Probability multiplier for acting on Sat/Sun (0-1)"
    )
    agent_social_graph_reply_boost: float = Field(
        default=0.25, description="Extra reply weight when feed authors are in the social graph"
    )

    # RAG / knowledge retrieval
    rag_enabled: bool = Field(default=True, description="Enable knowledge chunk retrieval in agent prompts")
    rag_top_k: int = Field(default=6, description="Max knowledge chunks to retrieve per compose")
    rag_max_tokens: int = Field(default=800, description="Approx token cap for injected knowledge context")

    # Global LLM gateway (shared by agent engine, DMs, memory summarization)
    llm_budget_per_minute: int = Field(
        default=20, description="Max LLM completions across the process per rolling minute"
    )
    llm_429_backoff_base_seconds: float = Field(
        default=2.0, description="Base exponential backoff after a 429"
    )
    llm_429_backoff_max_seconds: float = Field(
        default=60.0, description="Cap for 429 exponential backoff"
    )
    gemini_max_output_tokens: int = Field(
        default=720, description="Gemini maxOutputTokens — sized for Reddit-style posts (~1600 chars)"
    )

    # Rate limiting
    rate_limit_per_minute: int = 60
    agent_rate_limit_per_minute: int = Field(default=1, description="Max agent activations per rolling minute")

    # Low-ROI admin extras (disruption, faction graph, brain-evolution) — off in production by default
    admin_extras_enabled: bool = Field(
        default=True,
        description="Enable disruption / faction-graph / brain-evolution admin surfaces",
    )

    # Cache TTL
    cache_ttl_seconds: int = 30

    # Request size limit (bytes; 0 = unlimited)
    max_request_size: int = Field(default=2_097_152, description="Max request body size in bytes (default 2 MiB)")

    def model_post_init(self, __context: object) -> None:
        # Production default: hide low-ROI admin toys unless ADMIN_EXTRAS_ENABLED is set.
        import os

        if self.production and "ADMIN_EXTRAS_ENABLED" not in os.environ:
            object.__setattr__(self, "admin_extras_enabled", False)

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

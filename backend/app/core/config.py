from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Sync. API"
    # "development" or "production"
    environment: str = "development"
    # SQLite for local development; PostgreSQL (Supabase) in production
    database_url: str = "sqlite:///./sync.db"
    # Frontend addresses allowed to call the API (Vite dev server by default)
    cors_origins: list[str] = ["http://localhost:5173"]
    # Optional pattern for more addresses, e.g. Vercel previews: https://sync-.*\.vercel\.app
    cors_origin_regex: str = ""
    # User's time zone: decides "today", "this week" and what is late
    timezone: str = "America/Sao_Paulo"
    # Supabase project (https://xxxx.supabase.co). Empty = no login, development user
    supabase_url: str = ""

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        """Supabase gives "postgresql://..." (or "postgres://..."); SQLAlchemy needs to know
        which driver to use, like the "jdbc:postgresql:" prefix in Java."""
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url

    @model_validator(mode="after")
    def production_needs_login(self) -> Settings:
        """Safety lock: a published API without login would show everyone's data."""
        if self.environment == "production":
            if not self.supabase_url:
                raise ValueError("SUPABASE_URL is required in production (login)")
            if self.database_url.startswith("sqlite"):
                raise ValueError("Use PostgreSQL in production (the SQLite file is lost)")
        return self


settings = Settings()

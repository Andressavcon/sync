from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Sync. API"
    # SQLite for local development; PostgreSQL (Supabase) in production
    database_url: str = "sqlite:///./sync.db"
    # Frontend addresses allowed to call the API (Vite dev server by default)
    cors_origins: list[str] = ["http://localhost:5173"]
    # User's time zone: decides "today", "this week" and what is late
    timezone: str = "America/Sao_Paulo"


settings = Settings()

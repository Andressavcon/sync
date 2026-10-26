import pytest
from pydantic import ValidationError

from app.core.config import Settings

POSTGRES_URL = "postgresql://user:password@host:5432/db"
SUPABASE_URL = "https://project.supabase.co"


def make(**values) -> Settings:
    return Settings(_env_file=None, **values)


def test_supabase_url_gets_the_psycopg_driver():
    assert make(database_url=POSTGRES_URL).database_url.startswith("postgresql+psycopg://")


def test_cors_origins_are_normalized():
    origins = make(
        cors_origins=[" https://sync.vercel.app/ ", "http://localhost:5173"]
    ).cors_origins
    assert origins == ["https://sync.vercel.app", "http://localhost:5173"]


def test_production_needs_login_and_postgres():
    with pytest.raises(ValidationError, match="SUPABASE_URL is required"):
        make(environment="production", database_url=POSTGRES_URL)
    with pytest.raises(ValidationError, match="Use PostgreSQL"):
        make(environment="production", supabase_url=SUPABASE_URL)

    make(environment="production", database_url=POSTGRES_URL, supabase_url=SUPABASE_URL)


def test_demo_never_reaches_real_data():
    with pytest.raises(ValidationError, match="no login"):
        make(environment="demo", supabase_url=SUPABASE_URL)
    with pytest.raises(ValidationError, match="own SQLite file"):
        make(environment="demo", database_url=POSTGRES_URL)

    make(environment="demo", database_url="sqlite:///./demo.db")

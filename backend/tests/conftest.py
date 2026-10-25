"""Shared test fixtures. Pytest loads this file automatically (no import needed)."""

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers every table)
from app.core.database import Base, enable_sqlite_foreign_keys, get_db
from app.main import app as fastapi_app
from app.modules.users.models import User

# Set it to run the same tests on PostgreSQL (CI does): postgresql+psycopg://user:pass@host/db
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture
def db() -> Iterator[Session]:
    """A fresh empty database for each test (like @BeforeEach + @AfterEach).

    In-memory SQLite by default; PostgreSQL when TEST_DATABASE_URL is set.
    """
    if TEST_DATABASE_URL:
        engine = create_engine(TEST_DATABASE_URL)
        Base.metadata.drop_all(engine)
    else:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,  # one shared connection, so the in-memory DB survives
        )
        enable_sqlite_foreign_keys(engine)
    Base.metadata.create_all(engine)

    with Session(engine, autoflush=False) as session:  # same as SessionLocal
        yield session

    engine.dispose()


@pytest.fixture
def user(db: Session) -> User:
    """A saved user to own the test data."""
    user = User(email="test@sync.app", name="Test User")
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    """Calls the real API, but every request uses the test database."""
    fastapi_app.dependency_overrides[get_db] = lambda: db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()

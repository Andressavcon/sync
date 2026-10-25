from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


def enable_sqlite_foreign_keys(engine: Engine) -> None:
    """SQLite ignores foreign keys (and ON DELETE CASCADE) unless asked on every connection."""

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


# SQLite only allows one thread per connection by default; FastAPI uses several
is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# pool_pre_ping: checks a pooled connection before using it (cloud databases close idle ones)
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
if is_sqlite:
    enable_sqlite_foreign_keys(engine)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """Parent class of every table (models.py in each module)."""


def get_db() -> Iterator[Session]:
    """Opens one database session per request and always closes it at the end."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Shortcut for endpoints and dependencies: `db: DbSession`
DbSession = Annotated[Session, Depends(get_db)]

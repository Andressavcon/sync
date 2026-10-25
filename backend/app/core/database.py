from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# SQLite only allows one thread per connection by default; FastAPI uses several
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
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

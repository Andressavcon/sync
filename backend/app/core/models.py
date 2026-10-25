import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(UTC)


class IdMixin:
    """Adds a UUID primary key (like @Id @GeneratedValue in a JPA @MappedSuperclass)."""

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class CreatedAtMixin:
    """Adds the creation timestamp, stored in UTC."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

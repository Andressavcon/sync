import uuid
from datetime import date, datetime, time
from enum import StrEnum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class CardStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


# Many-to-many link between cards and tags (like @JoinTable in JPA)
card_tags = Table(
    "card_tags",
    Base.metadata,
    Column("card_id", ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(IdMixin, Base):
    __tablename__ = "tags"
    # The same user can't have two tags with the same name
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))


class Card(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "cards"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    # Free text, like a Notion page (section 4.3)
    content: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[CardStatus] = mapped_column(
        Enum(CardStatus, native_enum=False, values_callable=lambda e: [s.value for s in e]),
        default=CardStatus.PENDING,
    )
    # Local calendar date and time chosen by the user (no time zone on purpose)
    due_date: Mapped[date] = mapped_column(index=True)
    due_time: Mapped[time]
    # When it was marked as done (section 4.4); None while not done
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tags: Mapped[list[Tag]] = relationship(secondary=card_tags, lazy="selectin")

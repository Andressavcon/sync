import uuid
from datetime import date, datetime, time
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class CardStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Frequency(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


def _enum_column(enum_class: type[StrEnum]) -> Enum:
    """Stores the enum value ("in_progress") as text, not the Python name."""
    return Enum(enum_class, native_enum=False, values_callable=lambda e: [m.value for m in e])


# Many-to-many link between cards and tags (like @JoinTable in JPA)
card_tags = Table(
    "card_tags",
    Base.metadata,
    Column("card_id", ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# Tags copied to every occurrence of a recurrence rule
recurrence_tags = Table(
    "recurrence_tags",
    Base.metadata,
    Column(
        "recurrence_id", ForeignKey("recurrence_rules.id", ondelete="CASCADE"), primary_key=True
    ),
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


class RecurrenceRule(IdMixin, CreatedAtMixin, Base):
    """Template + schedule of a repeating card (section 4.10)."""

    __tablename__ = "recurrence_rules"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Template: copied to each generated card
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    due_time: Mapped[time]
    tags: Mapped[list[Tag]] = relationship(secondary=recurrence_tags, lazy="selectin")

    # Schedule
    frequency: Mapped[Frequency] = mapped_column(_enum_column(Frequency))
    # Weekly: days of the week, Monday = 0 ... Sunday = 6
    weekdays: Mapped[list[int]] = mapped_column(JSON, default=list)
    # Monthly: day of the month (31 falls on the last day in shorter months)
    month_day: Mapped[int | None]
    start_date: Mapped[date]
    end_date: Mapped[date | None]  # None = repeats forever

    # Last date already turned into cards; generation continues after it
    generated_until: Mapped[date | None]


class Card(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "cards"
    # A rule creates at most one card per date, even if that card is moved later
    __table_args__ = (
        UniqueConstraint("recurrence_id", "occurrence_date", name="uq_cards_recurrence_occurrence"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    # Free text, like a Notion page (section 4.3)
    content: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[CardStatus] = mapped_column(_enum_column(CardStatus), default=CardStatus.PENDING)
    # Local calendar date and time chosen by the user (no time zone on purpose)
    due_date: Mapped[date] = mapped_column(index=True)
    due_time: Mapped[time]
    # When it was marked as done (section 4.4); None while not done
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # In-app reminder (section 6): None = off, 0 = on the day, 3 = three days before
    remind_days_before: Mapped[int | None]

    # Only for occurrences of a recurrence rule
    recurrence_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("recurrence_rules.id", ondelete="SET NULL", name="fk_cards_recurrence_id_rules"),
        index=True,
    )
    # The date the rule generated it for (due_date may change when dragged)
    occurrence_date: Mapped[date | None]

    tags: Mapped[list[Tag]] = relationship(secondary=card_tags, lazy="selectin")
    # Like @ManyToOne: also tells SQLAlchemy to insert the rule before its cards
    recurrence: Mapped[RecurrenceRule | None] = relationship()

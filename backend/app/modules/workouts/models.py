import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin, utc_now

# Steps are stored as JSON: [{"type": "time", "name": "Plank", "duration_sec": 30, ...}, ...]
# Their shape is validated by the Pydantic schemas (schemas.py).
# Note: SQLAlchemy doesn't notice changes INSIDE a JSON list; always assign a new list.
Steps = list[dict[str, Any]]


class SourceType(StrEnum):
    SESSION = "session"  # a session of a program ("Metabólico · Dia 3")
    STANDALONE = "standalone"  # a standalone workout ("Corrida")


class BlockState(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    DONE = "done"


def _enum_column(enum_class: type[StrEnum]) -> Enum:
    return Enum(enum_class, native_enum=False, values_callable=lambda e: [m.value for m in e])


class WorkoutProgram(IdMixin, CreatedAtMixin, Base):
    """A program with numbered sessions, e.g. "Metabólico" with 21 days."""

    __tablename__ = "workout_programs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))

    sessions: Mapped[list[WorkoutSession]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="WorkoutSession.number"
    )


class WorkoutSession(IdMixin, Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (UniqueConstraint("program_id", "number"),)

    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workout_programs.id", ondelete="CASCADE"), index=True
    )
    number: Mapped[int]  # Dia 1, Dia 2...
    steps: Mapped[Steps] = mapped_column(JSON, default=list)


class StandaloneWorkout(IdMixin, CreatedAtMixin, Base):
    """Always the same, used as often as needed: Corrida, Jump, Yoga."""

    __tablename__ = "workout_standalone"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    steps: Mapped[Steps] = mapped_column(JSON, default=list)


class WorkoutBlock(IdMixin, CreatedAtMixin, Base):
    """A block used on a day, with a copy of the steps and the timer progress."""

    __tablename__ = "workout_blocks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Named "day", not "date": inside the class, a field called "date" would hide the date type
    day: Mapped[date] = mapped_column(index=True)
    position: Mapped[int] = mapped_column(default=0)

    # Where it came from (no foreign key: the library item may be deleted later)
    source_type: Mapped[SourceType] = mapped_column(_enum_column(SourceType))
    source_id: Mapped[uuid.UUID]
    title: Mapped[str] = mapped_column(String(150))
    steps: Mapped[Steps] = mapped_column(JSON, default=list)

    state: Mapped[BlockState] = mapped_column(
        _enum_column(BlockState), default=BlockState.NOT_STARTED
    )
    # Where the timer stopped (index in the timer's list of steps, sets and rests)
    step_index: Mapped[int] = mapped_column(default=0)
    # Time left on a timed step when the timer was closed
    remaining_ms: Mapped[int | None]
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

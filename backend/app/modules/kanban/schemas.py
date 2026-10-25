import uuid
from datetime import date, datetime, time
from typing import Annotated

from pydantic import Field, StringConstraints

from app.core.schemas import ApiModel, Scope  # noqa: F401  (Scope re-exported)
from app.modules.kanban.models import CardStatus, Frequency

# Trimmed, non-empty text (like @NotBlank @Size(max = ...))
TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
CardTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
# Reminder: 0 = on the day, N = N days before
RemindDays = Annotated[int, Field(ge=0, le=365)]


# ---------- Tags ----------


class TagCreate(ApiModel):
    name: TagName


class TagUpdate(ApiModel):
    name: TagName


class TagRead(ApiModel):
    id: uuid.UUID
    name: str


# ---------- Cards ----------


class CardCreate(ApiModel):
    title: CardTitle
    content: str = ""
    status: CardStatus = CardStatus.PENDING
    due_date: date
    due_time: time
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    remind_days_before: RemindDays | None = None


class CardUpdate(ApiModel):
    """PATCH: only the fields sent are changed."""

    title: CardTitle | None = None
    content: str | None = None
    status: CardStatus | None = None
    due_date: date | None = None
    due_time: time | None = None
    tag_ids: list[uuid.UUID] | None = None
    remind_days_before: RemindDays | None = None  # send null to turn the reminder off


class CardRead(ApiModel):
    id: uuid.UUID
    title: str
    content: str
    status: CardStatus
    due_date: date
    due_time: time
    created_at: datetime
    completed_at: datetime | None
    tags: list[TagRead]
    remind_days_before: int | None
    # Set only on occurrences of a recurring card: the app must ask "only this or following?"
    recurrence_id: uuid.UUID | None
    occurrence_date: date | None


# ---------- Recurrence rules ----------

Weekday = Annotated[int, Field(ge=0, le=6)]  # Monday = 0 ... Sunday = 6
MonthDay = Annotated[int, Field(ge=1, le=31)]


class RecurrenceCreate(ApiModel):
    title: CardTitle
    content: str = ""
    due_time: time
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    frequency: Frequency
    weekdays: list[Weekday] = Field(default_factory=list)
    month_day: MonthDay | None = None
    start_date: date
    end_date: date | None = None


class RecurrenceUpdate(ApiModel):
    """PATCH: changes the rule from today on (future open occurrences are regenerated)."""

    title: CardTitle | None = None
    content: str | None = None
    due_time: time | None = None
    tag_ids: list[uuid.UUID] | None = None
    frequency: Frequency | None = None
    weekdays: list[Weekday] | None = None
    month_day: MonthDay | None = None
    end_date: date | None = None  # send null to remove the end date


class RecurrenceRead(ApiModel):
    id: uuid.UUID
    title: str
    content: str
    due_time: time
    tags: list[TagRead]
    frequency: Frequency
    weekdays: list[int]
    month_day: int | None
    start_date: date
    end_date: date | None


# ---------- Week board ----------


class BoardCardRead(ApiModel):
    card: CardRead
    is_late: bool
    # Countdown: 0 = today, 1 = tomorrow, negative = days ago
    days_until: int


class BoardDayRead(ApiModel):
    date: date
    is_today: bool
    cards: list[BoardCardRead]


class BoardRead(ApiModel):
    today: date
    week_start: date
    week_end: date
    days: list[BoardDayRead]
    overdue: list[BoardCardRead]
    upcoming: list[BoardCardRead]
    done: list[BoardCardRead]

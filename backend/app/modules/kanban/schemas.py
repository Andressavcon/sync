import uuid
from datetime import date, datetime, time
from typing import Annotated

from pydantic import Field, StringConstraints

from app.core.schemas import ApiModel
from app.modules.kanban.models import CardStatus

# Trimmed, non-empty text (like @NotBlank @Size(max = ...))
TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
CardTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


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


class CardUpdate(ApiModel):
    """PATCH: only the fields sent are changed."""

    title: CardTitle | None = None
    content: str | None = None
    status: CardStatus | None = None
    due_date: date | None = None
    due_time: time | None = None
    tag_ids: list[uuid.UUID] | None = None


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

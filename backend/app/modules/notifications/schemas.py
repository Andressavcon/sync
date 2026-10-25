import uuid
from datetime import date, datetime

from app.core.schemas import ApiModel


class NotificationRead(ApiModel):
    id: uuid.UUID
    card_id: uuid.UUID
    title: str
    due_date: date
    # "faltam 3 dias", "é hoje": calculated when read, so it is always current
    message: str
    read: bool
    created_at: datetime


class NotificationList(ApiModel):
    items: list[NotificationRead]
    unread: int

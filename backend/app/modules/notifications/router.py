import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.auth import CurrentUser
from app.core.clock import Now
from app.core.database import DbSession
from app.modules.notifications.schemas import NotificationList
from app.modules.notifications.service import NotificationService


def get_notification_service(db: DbSession) -> NotificationService:
    return NotificationService(db)


ServiceDep = Annotated[NotificationService, Depends(get_notification_service)]

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationList)
def list_notifications(user: CurrentUser, service: ServiceDep, now: Now) -> NotificationList:
    """Unread first; `unread` feeds the badge on the header bell."""
    return service.list(user.id, now.date())


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(notification_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.mark_read(user.id, notification_id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(user: CurrentUser, service: ServiceDep) -> None:
    service.mark_all_read(user.id)

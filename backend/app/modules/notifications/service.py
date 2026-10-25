import uuid
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.kanban.models import Card, CardStatus
from app.modules.notifications.models import Notification
from app.modules.notifications.rules import countdown_text, reminder_is_due
from app.modules.notifications.schemas import NotificationList, NotificationRead

MAX_SHOWN = 50


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: uuid.UUID, today: date) -> NotificationList:
        """Creates the reminders that became due, then lists them (unread first)."""
        self._create_due_reminders(user_id, today)
        items = self.db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.read, Notification.created_at.desc())
            .limit(MAX_SHOWN)
        ).all()
        return NotificationList(
            items=[
                NotificationRead(
                    id=n.id,
                    card_id=n.card_id,
                    title=n.title,
                    due_date=n.due_date,
                    message=countdown_text(n.due_date, today),
                    read=n.read,
                    created_at=n.created_at,
                )
                for n in items
            ],
            unread=sum(1 for n in items if not n.read),
        )

    def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        notification = self.db.scalars(
            select(Notification).where(
                Notification.user_id == user_id, Notification.id == notification_id
            )
        ).first()
        if notification is None:
            raise NotFoundError("Notification not found")
        notification.read = True
        self.db.commit()

    def mark_all_read(self, user_id: uuid.UUID) -> None:
        self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read.is_(False))
            .values(read=True)
        )
        self.db.commit()

    def _create_due_reminders(self, user_id: uuid.UUID, today: date) -> None:
        cards = self.db.scalars(
            select(Card).where(
                Card.user_id == user_id,
                Card.remind_days_before.is_not(None),
                Card.status != CardStatus.DONE,
                Card.due_date >= today,  # nothing for what already passed
            )
        ).all()
        existing = {
            (card_id, due_date)
            for card_id, due_date in self.db.execute(
                select(Notification.card_id, Notification.due_date).where(
                    Notification.user_id == user_id
                )
            ).all()
        }
        for card in cards:
            due = reminder_is_due(card.due_date, card.remind_days_before, today)
            if due and (card.id, card.due_date) not in existing:
                self.db.add(
                    Notification(
                        user_id=user_id, card_id=card.id, due_date=card.due_date, title=card.title
                    )
                )
        self.db.commit()

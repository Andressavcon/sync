import uuid
from datetime import date

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class Notification(IdMixin, CreatedAtMixin, Base):
    """In-app only (section 6): shown in the header bell until marked as read."""

    __tablename__ = "notifications"
    # One per card and due date: moving the card to another date creates a new one
    __table_args__ = (UniqueConstraint("card_id", "due_date"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), index=True
    )
    due_date: Mapped[date]
    title: Mapped[str] = mapped_column(String(200))
    read: Mapped[bool] = mapped_column(default=False)

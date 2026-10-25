import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserSettings(Base):
    """Preferences that other modules use. One row per user."""

    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Day of the month the Dashboard starts the fixed bills reminder
    bill_reminder_day: Mapped[int] = mapped_column(default=5)
    # Workouts per week; the month goal is this × 4
    weekly_workout_goal: Mapped[int] = mapped_column(default=5)

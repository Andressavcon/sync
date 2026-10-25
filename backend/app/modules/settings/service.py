import uuid

from sqlalchemy.orm import Session

from app.modules.settings.models import UserSettings
from app.modules.settings.schemas import SettingsUpdate

DEFAULTS = {"bill_reminder_day": 5, "weekly_workout_goal": 5}


class SettingsService:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: uuid.UUID) -> UserSettings:
        """The user's settings; the defaults when never saved (nothing is written)."""
        return self.db.get(UserSettings, user_id) or UserSettings(user_id=user_id, **DEFAULTS)

    def update(self, user_id: uuid.UUID, data: SettingsUpdate) -> UserSettings:
        settings = self.db.get(UserSettings, user_id)
        if settings is None:
            settings = UserSettings(user_id=user_id, **DEFAULTS)
            self.db.add(settings)
        for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(settings, field, value)
        self.db.commit()
        return settings

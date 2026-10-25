from typing import Annotated

from pydantic import Field

from app.core.schemas import ApiModel


class SettingsRead(ApiModel):
    bill_reminder_day: int
    weekly_workout_goal: int


class SettingsUpdate(ApiModel):
    bill_reminder_day: Annotated[int, Field(ge=1, le=28)] | None = None
    weekly_workout_goal: Annotated[int, Field(ge=1, le=7)] | None = None

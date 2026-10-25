from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends

from app.core.config import settings
from app.core.models import utc_now


def get_now() -> datetime:
    """Current local date and time in the user's time zone, without tz info.

    Cards store a local date + time, so they are compared with this value.
    Tests replace this dependency with a fixed moment (like injecting a java.time.Clock).
    """
    return datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None)


# Shortcut for endpoints: `now: Now`
Now = Annotated[datetime, Depends(get_now)]


def get_utc_now() -> datetime:
    """Current exact moment in UTC, for timestamps (created, completed, expires...)."""
    return utc_now()


# Shortcut for endpoints: `utc_now: UtcNow`
UtcNow = Annotated[datetime, Depends(get_utc_now)]

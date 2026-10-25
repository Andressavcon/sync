"""Which dates a recurrence rule falls on (section 4.10). Pure functions, no database."""

import calendar
from datetime import date, timedelta
from typing import Protocol

from app.core.exceptions import InvalidDataError
from app.modules.kanban.models import Frequency

ONE_DAY = timedelta(days=1)
# How far to look for the next date (a monthly rule always has one within ~31 days)
MAX_LOOKAHEAD_DAYS = 400


class Schedule(Protocol):
    """Anything with these fields: a RecurrenceRule, or a plain test object.

    Like a Java interface, but the class doesn't need to declare `implements`:
    having the attributes is enough ("structural typing").
    """

    frequency: Frequency
    weekdays: list[int]
    month_day: int | None
    start_date: date
    end_date: date | None


def validate_schedule(schedule: Schedule) -> None:
    """Rejects incomplete schedules (raises InvalidDataError -> HTTP 422)."""
    if schedule.frequency == Frequency.WEEKLY and not schedule.weekdays:
        raise InvalidDataError("Weekly recurrence needs at least one weekday")
    if schedule.frequency == Frequency.MONTHLY and schedule.month_day is None:
        raise InvalidDataError("Monthly recurrence needs the day of the month")
    if schedule.end_date is not None and schedule.end_date < schedule.start_date:
        raise InvalidDataError("End date can't be before the start date")


def occurs_on(schedule: Schedule, day: date) -> bool:
    if day < schedule.start_date:
        return False
    if schedule.end_date is not None and day > schedule.end_date:
        return False

    match schedule.frequency:
        case Frequency.DAILY:
            return True
        case Frequency.WEEKLY:
            return day.weekday() in schedule.weekdays
        case Frequency.MONTHLY:
            # Day 31 in a 30-day month falls on the 30th; in February on the 28th/29th
            last_day = calendar.monthrange(day.year, day.month)[1]
            return day.day == min(schedule.month_day or 1, last_day)


def dates_between(schedule: Schedule, after: date, until: date) -> list[date]:
    """Every date the rule falls on, with after < date <= until."""
    day = max(after + ONE_DAY, schedule.start_date)
    result = []
    while day <= until:
        if occurs_on(schedule, day):
            result.append(day)
        day += ONE_DAY
    return result


def next_date(schedule: Schedule, after: date) -> date | None:
    """First date strictly after `after`, or None if the rule has ended."""
    day = max(after + ONE_DAY, schedule.start_date)
    for _ in range(MAX_LOOKAHEAD_DAYS):
        if schedule.end_date is not None and day > schedule.end_date:
            return None
        if occurs_on(schedule, day):
            return day
        day += ONE_DAY
    return None

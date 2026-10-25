"""Unit tests of the recurrence date rules (section 4.10). No database."""

from dataclasses import dataclass, field
from datetime import date

import pytest

from app.core.exceptions import InvalidDataError
from app.modules.kanban.models import Frequency
from app.modules.kanban.recurrence import dates_between, next_date, occurs_on, validate_schedule


@dataclass
class FakeSchedule:
    """Satisfies the Schedule protocol without a database object."""

    frequency: Frequency
    weekdays: list[int] = field(default_factory=list)
    month_day: int | None = None
    start_date: date = date(2026, 1, 1)
    end_date: date | None = None


def test_daily_falls_on_every_day():
    schedule = FakeSchedule(Frequency.DAILY)

    assert dates_between(schedule, date(2026, 10, 25), date(2026, 10, 28)) == [
        date(2026, 10, 26),
        date(2026, 10, 27),
        date(2026, 10, 28),
    ]


def test_weekly_falls_on_the_chosen_weekdays():
    schedule = FakeSchedule(Frequency.WEEKLY, weekdays=[0, 2, 4])  # Mon, Wed, Fri

    week = dates_between(schedule, date(2026, 10, 25), date(2026, 11, 1))

    assert week == [date(2026, 10, 26), date(2026, 10, 28), date(2026, 10, 30)]


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 10, 31), True),  # October has 31 days
        (date(2026, 11, 30), True),  # November: last day instead of 31
        (date(2026, 11, 29), False),
        (date(2027, 2, 28), True),  # February
        (date(2028, 2, 29), True),  # leap year
        (date(2028, 2, 28), False),
    ],
)
def test_monthly_on_31_falls_on_the_last_day_of_short_months(day: date, expected: bool):
    schedule = FakeSchedule(Frequency.MONTHLY, month_day=31)

    assert occurs_on(schedule, day) is expected


def test_nothing_before_start_or_after_end():
    schedule = FakeSchedule(
        Frequency.DAILY, start_date=date(2026, 10, 27), end_date=date(2026, 10, 29)
    )

    days = dates_between(schedule, date(2026, 10, 20), date(2026, 11, 5))

    assert days == [date(2026, 10, 27), date(2026, 10, 28), date(2026, 10, 29)]


def test_next_date_after_a_given_day():
    schedule = FakeSchedule(Frequency.WEEKLY, weekdays=[0])  # Mondays

    assert next_date(schedule, date(2026, 11, 1)) == date(2026, 11, 2)
    assert next_date(schedule, date(2026, 11, 2)) == date(2026, 11, 9)


def test_next_date_is_none_when_the_rule_has_ended():
    schedule = FakeSchedule(Frequency.DAILY, end_date=date(2026, 10, 30))

    assert next_date(schedule, date(2026, 10, 30)) is None


@pytest.mark.parametrize(
    ("schedule", "message"),
    [
        (FakeSchedule(Frequency.WEEKLY), "weekday"),
        (FakeSchedule(Frequency.MONTHLY), "day of the month"),
        (
            FakeSchedule(Frequency.DAILY, start_date=date(2026, 10, 2), end_date=date(2026, 10, 1)),
            "End date",
        ),
    ],
)
def test_incomplete_schedules_are_rejected(schedule: FakeSchedule, message: str):
    with pytest.raises(InvalidDataError, match=message):
        validate_schedule(schedule)

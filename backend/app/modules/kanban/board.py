"""Builds the week board from the cards.

Pure functions: no database, no HTTP. Easy to test with any date.

| Card situation                    | Where it goes                      |
|-----------------------------------|------------------------------------|
| Status done                       | done                               |
| Date in the current week          | that day's column (late flag)      |
| Date after the current week       | upcoming (with countdown)          |
| Date before the current week      | overdue                            |
"""

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from app.modules.kanban.models import Card, CardStatus

MONDAY = 0  # Python: Monday = 0 ... Sunday = 6 (Java's DayOfWeek starts at 1)


@dataclass(frozen=True)
class BoardCard:
    card: Card
    is_late: bool
    days_until: int  # 0 = today, 1 = tomorrow, -2 = two days ago


@dataclass(frozen=True)
class BoardDay:
    date: date
    is_today: bool
    cards: list[BoardCard] = field(default_factory=list)


@dataclass(frozen=True)
class Board:
    today: date
    week_start: date
    week_end: date
    days: list[BoardDay]
    overdue: list[BoardCard]
    upcoming: list[BoardCard]
    done: list[BoardCard]


def week_bounds(today: date, week_starts_on: int = MONDAY) -> tuple[date, date]:
    """First and last day of the week that contains `today`."""
    start = today - timedelta(days=(today.weekday() - week_starts_on) % 7)
    return start, start + timedelta(days=6)


def is_late(card: Card, now: datetime) -> bool:
    """Late = due date and time already passed and not done."""
    due = datetime.combine(card.due_date, card.due_time)
    return card.status != CardStatus.DONE and due < now


def build_board(cards: Iterable[Card], now: datetime, week_starts_on: int = MONDAY) -> Board:
    today = now.date()
    week_start, week_end = week_bounds(today, week_starts_on)

    days = [
        BoardDay(date=day, is_today=day == today)
        for day in (week_start + timedelta(days=i) for i in range(7))
    ]
    days_by_date = {day.date: day for day in days}
    overdue: list[BoardCard] = []
    upcoming: list[BoardCard] = []
    done: list[BoardCard] = []

    for card in cards:
        item = BoardCard(
            card=card,
            is_late=is_late(card, now),
            days_until=(card.due_date - today).days,
        )
        if card.status == CardStatus.DONE:
            done.append(item)
        elif card.due_date < week_start:
            overdue.append(item)
        elif card.due_date > week_end:
            upcoming.append(item)
        else:
            days_by_date[card.due_date].cards.append(item)

    def by_due(item: BoardCard) -> tuple[date, object]:
        return item.card.due_date, item.card.due_time

    for day in days:
        day.cards.sort(key=by_due)  # inside a day: by delivery time
    overdue.sort(key=by_due)
    upcoming.sort(key=by_due)

    # Most recently finished first; cards without completed_at go last
    def by_completion(item: BoardCard) -> tuple[bool, float]:
        completed_at = item.card.completed_at
        return completed_at is not None, completed_at.timestamp() if completed_at else 0.0

    done.sort(key=by_completion, reverse=True)

    return Board(
        today=today,
        week_start=week_start,
        week_end=week_end,
        days=days,
        overdue=overdue,
        upcoming=upcoming,
        done=done,
    )

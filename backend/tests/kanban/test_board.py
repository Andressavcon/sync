"""Unit tests of the board rules (section 4.8). No database: plain Card objects."""

from datetime import UTC, date, datetime, time

import pytest

from app.modules.kanban.board import build_board, week_bounds
from app.modules.kanban.models import Card, CardStatus

# Wednesday, 28 Oct 2026, 3 pm -> week from Mon 26 Oct to Sun 1 Nov
NOW = datetime(2026, 10, 28, 15, 0)


def make_card(
    title: str,
    due: date,
    at: time = time(12, 0),
    status: CardStatus = CardStatus.PENDING,
    completed_at: datetime | None = None,
) -> Card:
    return Card(title=title, due_date=due, due_time=at, status=status, completed_at=completed_at)


def titles(items) -> list[str]:
    return [item.card.title for item in items]


@pytest.mark.parametrize(
    ("today", "expected_start"),
    [
        (date(2026, 10, 28), date(2026, 10, 26)),  # Wednesday
        (date(2026, 10, 26), date(2026, 10, 26)),  # Monday itself
        (date(2026, 11, 1), date(2026, 10, 26)),  # Sunday is still the same week
    ],
)
def test_week_starts_on_monday(today: date, expected_start: date):
    start, end = week_bounds(today)

    assert start == expected_start
    assert end == date(2026, 11, 1)


def test_board_has_seven_days_and_marks_today():
    board = build_board([], NOW)

    assert [d.date for d in board.days][0] == date(2026, 10, 26)
    assert len(board.days) == 7
    assert [d.date for d in board.days if d.is_today] == [date(2026, 10, 28)]


def test_each_card_goes_to_its_section():
    cards = [
        make_card("this week", date(2026, 10, 30)),
        make_card("last week", date(2026, 10, 20)),
        make_card("next week", date(2026, 11, 3)),
        make_card("finished", date(2026, 10, 27), status=CardStatus.DONE),
    ]

    board = build_board(cards, NOW)

    friday = next(d for d in board.days if d.date == date(2026, 10, 30))
    assert titles(friday.cards) == ["this week"]
    assert titles(board.overdue) == ["last week"]
    assert titles(board.upcoming) == ["next week"]
    assert titles(board.done) == ["finished"]


def test_week_edges_stay_in_the_week():
    cards = [
        make_card("monday", date(2026, 10, 26)),
        make_card("sunday night", date(2026, 11, 1), time(23, 59)),
    ]

    board = build_board(cards, NOW)

    assert board.overdue == []
    assert board.upcoming == []
    assert titles(board.days[0].cards) == ["monday"]
    assert titles(board.days[6].cards) == ["sunday night"]


def test_late_card_inside_the_week_stays_in_its_day_with_the_flag():
    # Monday's card not done: still in Monday's column, only flagged (section 4.4)
    board = build_board([make_card("monday task", date(2026, 10, 26))], NOW)

    item = board.days[0].cards[0]
    assert item.is_late is True
    assert board.overdue == []


@pytest.mark.parametrize(
    ("at", "status", "late"),
    [
        (time(14, 59), CardStatus.PENDING, True),  # time already passed today
        (time(14, 59), CardStatus.IN_PROGRESS, True),  # in progress is also late
        (time(15, 1), CardStatus.PENDING, False),  # later today
        (time(9, 0), CardStatus.DONE, False),  # done is never late
    ],
)
def test_late_depends_on_time_and_status(at: time, status: CardStatus, late: bool):
    card = make_card("today", date(2026, 10, 28), at, status)

    board = build_board([card], NOW)

    items = board.done if status == CardStatus.DONE else board.days[2].cards
    assert items[0].is_late is late


def test_countdown_in_days():
    board = build_board(
        [make_card("in 12 days", date(2026, 11, 9)), make_card("8 days ago", date(2026, 10, 20))],
        NOW,
    )

    assert board.upcoming[0].days_until == 12
    assert board.overdue[0].days_until == -8


def test_cards_in_a_day_are_sorted_by_time():
    cards = [
        make_card("evening", date(2026, 10, 29), time(19, 0)),
        make_card("morning", date(2026, 10, 29), time(8, 0)),
        make_card("lunch", date(2026, 10, 29), time(12, 0)),
    ]

    board = build_board(cards, NOW)

    assert titles(board.days[3].cards) == ["morning", "lunch", "evening"]


def test_done_cards_most_recent_first_and_unknown_last():
    cards = [
        make_card("unknown", date(2026, 10, 26), status=CardStatus.DONE),
        make_card(
            "older",
            date(2026, 10, 26),
            status=CardStatus.DONE,
            completed_at=datetime(2026, 10, 26, 10, 0, tzinfo=UTC),
        ),
        make_card(
            "newer",
            date(2026, 10, 26),
            status=CardStatus.DONE,
            completed_at=datetime(2026, 10, 27, 10, 0, tzinfo=UTC),
        ),
    ]

    board = build_board(cards, NOW)

    assert titles(board.done) == ["newer", "older", "unknown"]

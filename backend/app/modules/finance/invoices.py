"""Card invoice dates (sections 9.2 and 9.4). Pure functions, no database.

An invoice is named by the month of its DUE date ("2026-11" = the one paid in November).
"""

from calendar import monthrange
from collections.abc import Callable
from datetime import date
from typing import Protocol


class CardSchedule(Protocol):
    due_day: int
    closing_day: int
    closing_day_purchase_goes_next: bool


def date_in_month(year: int, month: int, day: int) -> date:
    """Day 31 in a 30-day month becomes the 30th (and February the 28th/29th)."""
    return date(year, month, min(day, monthrange(year, month)[1]))


def month_of(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def add_months(month: str, count: int) -> str:
    """add_months("2026-11", 2) == "2027-01" """
    year, number = (int(part) for part in month.split("-"))
    index = year * 12 + (number - 1) + count
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def due_date(card: CardSchedule, month: str) -> date:
    year, number = (int(part) for part in month.split("-"))
    return date_in_month(year, number, card.due_day)


def default_closing_date(card: CardSchedule, month: str) -> date:
    """Closes before the due day: same month (Nubank closes 8, due 15).
    Closes after the due day: the month before (closes 25, due 5 of the next month)."""
    closing_month = month if card.closing_day < card.due_day else add_months(month, -1)
    year, number = (int(part) for part in closing_month.split("-"))
    return date_in_month(year, number, card.closing_day)


# Gives the closing date of an invoice month, with the one edited by hand when there is one
ClosingDateOf = Callable[[str], date]


def suggest_invoice(card: CardSchedule, purchase: date, closing_of: ClosingDateOf) -> str:
    """Invoice a purchase falls into (section 9.4): the first one that hasn't closed yet.

    A purchase after the closing goes to the next invoice. On the closing day itself it
    depends on the card's setting (decided in section 9.7).
    """
    month = add_months(month_of(purchase), -1)
    for _ in range(4):  # the right invoice is always within a few months
        closing = closing_of(month)
        still_open = purchase < closing or (
            purchase == closing and not card.closing_day_purchase_goes_next
        )
        if still_open:
            return month
        month = add_months(month, 1)
    return month

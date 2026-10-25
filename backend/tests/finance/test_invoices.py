"""Invoice date rules. No database."""

from dataclasses import dataclass
from datetime import date

import pytest

from app.modules.finance.invoices import (
    add_months,
    default_closing_date,
    due_date,
    suggest_invoice,
)


@dataclass
class Card:
    due_day: int
    closing_day: int
    closing_day_purchase_goes_next: bool = True


NUBANK = Card(due_day=15, closing_day=8)  # closes 8, due 15 (same month)
BB = Card(due_day=5, closing_day=25)  # closes 25, due 5 of the next month


def default_closing(card: Card):
    return lambda month: default_closing_date(card, month)


@pytest.mark.parametrize(
    ("month", "count", "expected"),
    [("2026-11", 1, "2026-12"), ("2026-11", 2, "2027-01"), ("2026-01", -1, "2025-12")],
)
def test_add_months(month: str, count: int, expected: str):
    assert add_months(month, count) == expected


def test_due_and_closing_dates_in_the_same_month():
    assert due_date(NUBANK, "2026-11") == date(2026, 11, 15)
    assert default_closing_date(NUBANK, "2026-11") == date(2026, 11, 8)


def test_closing_after_due_day_is_in_the_previous_month():
    assert due_date(BB, "2026-11") == date(2026, 11, 5)
    assert default_closing_date(BB, "2026-11") == date(2026, 10, 25)


def test_day_31_falls_on_the_last_day_of_short_months():
    card = Card(due_day=31, closing_day=31)
    assert due_date(card, "2026-02") == date(2026, 2, 28)
    assert due_date(card, "2026-04") == date(2026, 4, 30)


@pytest.mark.parametrize(
    ("purchase", "expected"),
    [
        (date(2026, 11, 3), "2026-11"),  # before closing (8th): this month's invoice
        (date(2026, 11, 9), "2026-12"),  # after closing: next invoice
        (date(2026, 11, 8), "2026-12"),  # on the closing day: next (card default)
        (date(2026, 12, 31), "2027-01"),  # across the year
    ],
)
def test_purchase_goes_to_the_first_open_invoice(purchase: date, expected: str):
    assert suggest_invoice(NUBANK, purchase, default_closing(NUBANK)) == expected


def test_purchase_on_closing_day_can_stay_in_the_closing_invoice():
    card = Card(due_day=15, closing_day=8, closing_day_purchase_goes_next=False)

    assert suggest_invoice(card, date(2026, 11, 8), default_closing(card)) == "2026-11"


def test_closing_after_due_day_card():
    # BB closes on the 25th; the invoice is named by the due month (5th of the next)
    assert suggest_invoice(BB, date(2026, 10, 20), default_closing(BB)) == "2026-11"
    assert suggest_invoice(BB, date(2026, 10, 26), default_closing(BB)) == "2026-12"


def test_closing_date_edited_by_hand_is_used():
    # This month the Nubank closed on the 10th instead of the 8th
    def closing_of(month: str) -> date:
        return date(2026, 11, 10) if month == "2026-11" else default_closing_date(NUBANK, month)

    assert suggest_invoice(NUBANK, date(2026, 11, 9), closing_of) == "2026-11"

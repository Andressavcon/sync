"""Money available to spend. Pure functions, no database.

available = salary
          - fixed bills due in the cycle
          - card invoices due in the cycle
          - pix/boleto expenses in the cycle
          - money put into savings pots in the cycle (withdrawals give it back)
          + extra incomes marked to count

week = what's left of the cycle / weeks left (including the current one)
"""

import math
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol

from app.modules.finance.invoices import CardSchedule, add_months, date_in_month, due_date, month_of
from app.modules.finance.models import MovementKind, PaymentMethod, TransactionKind

ZERO = Decimal("0")
CENT = Decimal("0.01")


@dataclass(frozen=True)
class Cycle:
    """From one salary to the next. `end` is exclusive (the next salary day)."""

    start: date
    end: date

    def __contains__(self, day: date) -> bool:
        """Lets us write `day in cycle` (like overriding contains() in Java)."""
        return self.start <= day < self.end

    def months(self) -> list[str]:
        """Every yyyy-MM the cycle touches."""
        months = [month_of(self.start)]
        while months[-1] < month_of(self.end):
            months.append(add_months(months[-1], 1))
        return months


def cycle_of(today: date, salary_day: int) -> Cycle:
    this_month = date_in_month(today.year, today.month, salary_day)
    if today >= this_month:
        start = this_month
    else:
        previous = add_months(month_of(today), -1)
        start = date_in_month(int(previous[:4]), int(previous[5:]), salary_day)
    following = add_months(month_of(start), 1)
    return Cycle(start, date_in_month(int(following[:4]), int(following[5:]), salary_day))


# ---------- What the calculation needs (anything with these fields works) ----------


@dataclass(frozen=True)
class BillInput:
    due_day: int
    value_in: Callable[[str], Decimal]  # value of the bill in a given month


@dataclass(frozen=True)
class CardInput:
    schedule: CardSchedule
    totals: dict[str, Decimal]  # invoice month -> total


class TransactionLike(Protocol):
    kind: TransactionKind
    payment_method: PaymentMethod
    amount: Decimal
    day: date
    count_in_available: bool


class MovementLike(Protocol):
    kind: MovementKind
    amount: Decimal
    day: date


@dataclass(frozen=True)
class Available:
    cycle: Cycle
    salary: Decimal
    fixed_bills: Decimal
    invoices: Decimal
    one_off_expenses: Decimal
    saved: Decimal
    extra_income: Decimal
    total: Decimal
    days_left: int
    weeks_left: int
    per_week: Decimal


def calculate_available(
    today: date,
    salary_amount: Decimal,
    salary_day: int,
    bills: Iterable[BillInput],
    cards: Iterable[CardInput],
    transactions: Sequence[TransactionLike],
    movements: Sequence[MovementLike],
) -> Available:
    cycle = cycle_of(today, salary_day)
    months = cycle.months()

    # Fixed bills: they leave the salary too, though they're apart from the cards
    fixed_bills = sum(
        (
            bill.value_in(month)
            for bill in bills
            for month in months
            if date_in_month(int(month[:4]), int(month[5:]), bill.due_day) in cycle
        ),
        ZERO,
    )

    # Only invoices DUE in this cycle; a purchase in next cycle's invoice waits (9.6)
    invoices = sum(
        (
            card.totals.get(month, ZERO)
            for card in cards
            for month in months
            if due_date(card.schedule, month) in cycle
        ),
        ZERO,
    )

    in_cycle = [t for t in transactions if t.day in cycle]
    one_off_expenses = sum(
        (
            t.amount
            for t in in_cycle
            if t.kind == TransactionKind.EXPENSE and t.payment_method != PaymentMethod.CARD
        ),
        ZERO,
    )
    extra_income = sum(
        (t.amount for t in in_cycle if t.kind == TransactionKind.INCOME and t.count_in_available),
        ZERO,
    )

    # Saving hides money from spending; withdrawing gives it back (9.4 / 9.6)
    saved = sum(
        (
            m.amount if m.kind == MovementKind.DEPOSIT else -m.amount
            for m in movements
            if m.day in cycle
        ),
        ZERO,
    )

    total = salary_amount - fixed_bills - invoices - one_off_expenses - saved + extra_income

    days_left = max(1, (cycle.end - today).days)
    weeks_left = max(1, math.ceil(days_left / 7))
    per_week = (total / weeks_left).quantize(CENT, rounding=ROUND_HALF_UP)

    return Available(
        cycle=cycle,
        salary=salary_amount,
        fixed_bills=fixed_bills,
        invoices=invoices,
        one_off_expenses=one_off_expenses,
        saved=saved,
        extra_income=extra_income,
        total=total,
        days_left=days_left,
        weeks_left=weeks_left,
        per_week=per_week,
    )


def bill_value_in(month: str, usual: Decimal, recorded: dict[str, Decimal]) -> Decimal:
    """A month's value: the one edited for it; else the last month edited before; else the usual.

    "Each month gets the registered value (or the previous month's), editable".
    """
    if month in recorded:
        return recorded[month]
    earlier = [m for m in recorded if m < month]
    return recorded[max(earlier)] if earlier else usual

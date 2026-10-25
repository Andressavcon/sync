"""Money available to spend (section 9.6). No database: plain objects."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import pytest

from app.modules.finance.available import (
    BillInput,
    CardInput,
    bill_value_in,
    calculate_available,
    cycle_of,
)
from app.modules.finance.models import MovementKind, PaymentMethod, TransactionKind

D = Decimal
TODAY = date(2026, 10, 28)  # salary on the 5th -> cycle 5 Oct .. 4 Nov (8 days left)


@dataclass
class Tx:
    amount: Decimal
    day: date
    kind: TransactionKind = TransactionKind.EXPENSE
    payment_method: PaymentMethod = PaymentMethod.PIX
    count_in_available: bool = False


@dataclass
class Move:
    kind: MovementKind
    amount: Decimal
    day: date


@dataclass
class Schedule:
    due_day: int
    closing_day: int
    closing_day_purchase_goes_next: bool = True


def available(**overrides):
    args = {
        "today": TODAY,
        "salary_amount": D("4500"),
        "salary_day": 5,
        "bills": [],
        "cards": [],
        "transactions": [],
        "movements": [],
    } | overrides
    return calculate_available(**args)


# ---------- Cycle ----------


@pytest.mark.parametrize(
    ("today", "start", "end"),
    [
        (date(2026, 10, 28), date(2026, 10, 5), date(2026, 11, 5)),
        (date(2026, 10, 5), date(2026, 10, 5), date(2026, 11, 5)),  # salary day itself
        (date(2026, 10, 4), date(2026, 9, 5), date(2026, 10, 5)),  # the day before
        (date(2027, 1, 2), date(2026, 12, 5), date(2027, 1, 5)),  # across the year
    ],
)
def test_cycle_goes_from_salary_to_salary(today: date, start: date, end: date):
    cycle = cycle_of(today, 5)

    assert (cycle.start, cycle.end) == (start, end)


def test_salary_on_day_31_in_short_months():
    cycle = cycle_of(date(2026, 2, 28), 31)

    assert (cycle.start, cycle.end) == (date(2026, 2, 28), date(2026, 3, 31))


# ---------- Each part of the formula ----------


def test_only_salary():
    result = available()

    assert result.total == D("4500")
    assert result.days_left == 8  # 28 Oct -> 5 Nov
    assert result.weeks_left == 2
    assert result.per_week == D("2250.00")


def test_fixed_bills_due_in_the_cycle():
    rent = BillInput(due_day=5, value_in=lambda month: D("1200"))  # due 5 Nov: next cycle
    gas = BillInput(due_day=10, value_in=lambda month: D("90"))  # due 10 Oct: this cycle

    result = available(bills=[rent, gas])

    # Rent of 5 Oct is in this cycle (5 Oct .. 4 Nov); 5 Nov is not
    assert result.fixed_bills == D("1290")


def test_only_invoices_due_in_the_cycle_count():
    nubank = CardInput(
        schedule=Schedule(due_day=15, closing_day=8),
        totals={"2026-10": D("800"), "2026-11": D("300")},  # due 15 Oct / 15 Nov
    )

    result = available(cards=[nubank])

    assert result.invoices == D("800")  # November's invoice is due in the next cycle


def test_pix_and_boleto_count_but_card_expenses_go_through_invoices():
    result = available(
        transactions=[
            Tx(D("80"), date(2026, 10, 27)),  # pix in cycle
            Tx(D("99.90"), date(2026, 10, 6), payment_method=PaymentMethod.BOLETO),
            Tx(D("50"), date(2026, 10, 1)),  # before the cycle
            Tx(D("500"), date(2026, 10, 20), payment_method=PaymentMethod.CARD),  # card
        ]
    )

    assert result.one_off_expenses == D("179.90")


def test_extra_income_counts_only_when_marked():
    result = available(
        transactions=[
            Tx(D("600"), date(2026, 10, 20), kind=TransactionKind.INCOME),
            Tx(D("200"), date(2026, 10, 21), kind=TransactionKind.INCOME, count_in_available=True),
        ]
    )

    assert result.extra_income == D("200")
    assert result.total == D("4700")


def test_saving_reduces_and_withdrawing_gives_back():
    result = available(
        movements=[
            Move(MovementKind.DEPOSIT, D("500"), date(2026, 10, 10)),
            Move(MovementKind.WITHDRAW, D("150"), date(2026, 10, 20)),
            Move(MovementKind.DEPOSIT, D("1000"), date(2026, 9, 10)),  # previous cycle
        ]
    )

    assert result.saved == D("350")
    assert result.total == D("4150")


def test_example_from_the_documentation():
    # 9.6: R$ 1.600 for 4 weeks = R$ 400/week; spending R$ 250 leaves 1.350 for 3 = R$ 450
    salary_day = 1
    first_week = available(today=date(2026, 11, 2), salary_day=salary_day, salary_amount=D("1600"))
    after = available(
        today=date(2026, 11, 9),
        salary_day=salary_day,
        salary_amount=D("1600"),
        transactions=[Tx(D("250"), date(2026, 11, 5))],
    )

    assert (first_week.weeks_left, first_week.per_week) == (5, D("320.00"))  # 29 days left
    assert after.total == D("1350")
    assert after.weeks_left == 4  # 22 days left
    assert after.per_week == D("337.50")


def test_everything_together():
    result = available(
        bills=[BillInput(due_day=10, value_in=lambda m: D("1550"))],
        cards=[CardInput(Schedule(due_day=15, closing_day=8), {"2026-10": D("1000")})],
        transactions=[Tx(D("100"), date(2026, 10, 15))],
        movements=[Move(MovementKind.DEPOSIT, D("200"), date(2026, 10, 15))],
    )

    assert result.total == D("4500") - D("1550") - D("1000") - D("100") - D("200")


# ---------- Fixed bill value per month (section 9.4) ----------


def test_bill_value_uses_the_month_then_the_last_edited_then_the_usual():
    recorded = {"2026-08": D("95"), "2026-10": D("110")}

    assert bill_value_in("2026-10", D("90"), recorded) == D("110")  # edited for October
    assert bill_value_in("2026-09", D("90"), recorded) == D("95")  # August's carries on
    assert bill_value_in("2026-12", D("90"), recorded) == D("110")  # October's carries on
    assert bill_value_in("2026-07", D("90"), recorded) == D("90")  # nothing before: usual

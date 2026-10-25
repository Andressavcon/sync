import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer, StringConstraints

from app.core.schemas import ApiModel
from app.modules.finance.models import PaymentMethod, TransactionKind

# Decimal in Python (exact cents), a plain number in the JSON for the frontend
_as_number = PlainSerializer(float, return_type=float, when_used="json")
Money = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2), _as_number]
Amount = Annotated[Decimal, _as_number]  # totals: may be zero or negative

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
DayOfMonth = Annotated[int, Field(ge=1, le=31)]
MonthKey = Annotated[str, Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


# ---------- Cards ----------


class CardCreate(ApiModel):
    name: Name
    due_day: DayOfMonth
    closing_day: DayOfMonth
    closing_day_purchase_goes_next: bool = True


class CardUpdate(ApiModel):
    name: Name | None = None
    due_day: DayOfMonth | None = None
    closing_day: DayOfMonth | None = None
    closing_day_purchase_goes_next: bool | None = None
    archived: bool | None = None


class CardRead(ApiModel):
    id: uuid.UUID
    name: str
    due_day: int
    closing_day: int
    closing_day_purchase_goes_next: bool
    archived: bool


class CurrentInvoice(ApiModel):
    month: str
    due_date: date
    total: Amount
    # Alert: the closing date of this month wasn't checked yet (section 9.2)
    needs_check: bool


class CardSummary(ApiModel):
    card: CardRead
    current_invoice: CurrentInvoice
    # Already committed in the invoices after the current one (installments)
    future_committed: Amount


# ---------- Transactions ----------


class TransactionCreate(ApiModel):
    kind: TransactionKind
    title: Title
    amount: Money
    day: date
    payment_method: PaymentMethod
    card_id: uuid.UUID | None = None
    # Card expense: invoice (yyyy-MM). Empty = suggested by the purchase date
    invoice_month: MonthKey | None = None
    count_in_available: bool = False


class InstallmentCreate(ApiModel):
    """Installment purchase: the value of ONE installment and how many (section 9.2)."""

    title: Title
    installment_amount: Money
    installments: Annotated[int, Field(ge=2, le=72)]
    day: date
    card_id: uuid.UUID
    # First invoice; empty = suggested by the purchase date
    invoice_month: MonthKey | None = None


class TransactionUpdate(ApiModel):
    title: Title | None = None
    amount: Money | None = None
    day: date | None = None
    payment_method: PaymentMethod | None = None
    card_id: uuid.UUID | None = None
    invoice_month: MonthKey | None = None
    count_in_available: bool | None = None


class TransactionRead(ApiModel):
    id: uuid.UUID
    kind: TransactionKind
    title: str
    amount: Amount
    day: date
    payment_method: PaymentMethod
    card_id: uuid.UUID | None
    invoice_month: str | None
    installment_group: uuid.UUID | None
    installment_number: int | None
    installment_total: int | None
    count_in_available: bool


# ---------- Invoices ----------


class InvoiceRead(ApiModel):
    card_id: uuid.UUID
    month: str
    due_date: date
    closing_date: date
    confirmed: bool
    paid: bool
    paid_at: datetime | None
    total: Amount
    # Installments detailed per purchase: "TV — 3/10" (section 9.4)
    transactions: list[TransactionRead]


class InvoiceClosing(ApiModel):
    closing_date: date


class InvoicePaid(ApiModel):
    paid: bool


# ---------- Fixed bills (section 9.5) ----------


class FixedBillCreate(ApiModel):
    name: Name
    amount: Money
    due_day: DayOfMonth


class FixedBillUpdate(ApiModel):
    name: Name | None = None
    amount: Money | None = None  # the usual value (from now on)
    due_day: DayOfMonth | None = None


class FixedBillRead(ApiModel):
    id: uuid.UUID
    name: str
    amount: Amount
    due_day: int


class FixedBillMonthUpdate(ApiModel):
    """This month only: the real value when the bill arrives, and/or paid."""

    amount: Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)] | None = None
    paid: bool | None = None


class FixedBillOfMonth(ApiModel):
    bill: FixedBillRead
    month: str
    amount: Amount  # the value for this month
    due_date: date
    paid: bool
    paid_at: datetime | None


class FixedBillsMonth(ApiModel):
    month: str
    bills: list[FixedBillOfMonth]
    pending_total: Amount


# ---------- Savings pots (section 9.5) ----------


class PotCreate(ApiModel):
    name: Name


class PotUpdate(ApiModel):
    name: Name


class PotMoney(ApiModel):
    amount: Money


class PotBalance(ApiModel):
    """Direct correction of the value: doesn't change the available amount."""

    balance: Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class PotRead(ApiModel):
    id: uuid.UUID
    name: str
    balance: Amount


class PotsRead(ApiModel):
    pots: list[PotRead]
    total: Amount


# ---------- Salary and overview (section 9.6) ----------


class SalaryUpdate(ApiModel):
    amount: Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
    day: DayOfMonth


class SalaryRead(ApiModel):
    amount: Amount
    day: int
    configured: bool  # false until the user sets it


class AvailableRead(ApiModel):
    cycle_start: date
    cycle_last_day: date
    days_left: int
    salary: Amount
    fixed_bills: Amount
    invoices: Amount
    one_off_expenses: Amount
    saved: Amount
    extra_income: Amount
    total: Amount
    weeks_left: int
    per_week: Amount


class MonthSummary(ApiModel):
    """Month totals. Paying invoices and saving in pots are not incomes or expenses."""

    month: str
    income: Amount
    expenses: Amount
    balance: Amount


class SuggestedInvoice(ApiModel):
    month: str
    due_date: date

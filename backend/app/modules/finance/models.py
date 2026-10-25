import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin

# Money is always Decimal (like Java's BigDecimal), never float: 0.1 + 0.2 must be 0.3
MONEY = Numeric(12, 2)


class TransactionKind(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"


class PaymentMethod(StrEnum):
    CARD = "card"
    PIX = "pix"
    BOLETO = "boleto"


def _enum_column(enum_class: type[StrEnum]) -> Enum:
    return Enum(enum_class, native_enum=False, values_callable=lambda e: [m.value for m in e])


class CreditCard(IdMixin, CreatedAtMixin, Base):
    """Nubank, Banco do Brasil... (section 9.2)."""

    __tablename__ = "credit_cards"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    due_day: Mapped[int]  # day the invoice is paid
    closing_day: Mapped[int]  # default closing day; each month's can be edited
    # Purchase made ON the closing day: next invoice (most banks) or the closing one
    closing_day_purchase_goes_next: Mapped[bool] = mapped_column(
        default=True, server_default=true()
    )
    # Hidden but kept with its history (a card with transactions can't be deleted)
    archived: Mapped[bool] = mapped_column(default=False)


class Invoice(IdMixin, Base):
    """Only what was changed by hand on an invoice. Totals are always calculated."""

    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("card_id", "month"),)

    card_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("credit_cards.id", ondelete="CASCADE"), index=True
    )
    month: Mapped[str] = mapped_column(String(7))  # yyyy-MM of the DUE date
    # Closing date checked/edited this month (the closing day changes month to month)
    closing_date: Mapped[date | None]
    confirmed: Mapped[bool] = mapped_column(default=False)  # hides the "check it" alert
    paid: Mapped[bool] = mapped_column(default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Transaction(IdMixin, CreatedAtMixin, Base):
    """An income or an expense (section 9.3)."""

    __tablename__ = "transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[TransactionKind] = mapped_column(_enum_column(TransactionKind))
    title: Mapped[str] = mapped_column(String(100))
    # In an installment purchase, this is the value of ONE installment (section 9.2)
    amount: Mapped[Decimal] = mapped_column(MONEY)
    # "day", not "date": a field named date would hide the date type inside the class
    day: Mapped[date] = mapped_column(index=True)
    payment_method: Mapped[PaymentMethod] = mapped_column(_enum_column(PaymentMethod))

    # Card expenses: which card and which invoice (yyyy-MM of the due date)
    card_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("credit_cards.id"), index=True)
    invoice_month: Mapped[str | None] = mapped_column(String(7), index=True)

    # Installments: same group for "TV — 1/10" ... "TV — 10/10"
    installment_group: Mapped[uuid.UUID | None] = mapped_column(index=True)
    installment_number: Mapped[int | None]
    installment_total: Mapped[int | None]

    # Extra income: counts in the money available to spend or not (section 9.6)
    count_in_available: Mapped[bool] = mapped_column(default=False)


# ---------- Fixed monthly bills (section 9.2) ----------


class FixedBill(IdMixin, CreatedAtMixin, Base):
    """Rent, condo, gas, phone: outside the cards, paid every month."""

    __tablename__ = "fixed_bills"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    amount: Mapped[Decimal] = mapped_column(MONEY)  # usual value; each month can differ
    due_day: Mapped[int]


class FixedBillMonth(IdMixin, Base):
    """One month of a bill. Only exists after its value was edited or it was paid."""

    __tablename__ = "fixed_bill_months"
    __table_args__ = (UniqueConstraint("bill_id", "month"),)

    bill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fixed_bills.id", ondelete="CASCADE"), index=True
    )
    month: Mapped[str] = mapped_column(String(7))
    amount: Mapped[Decimal] = mapped_column(MONEY)
    paid: Mapped[bool] = mapped_column(default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- Savings pots (section 9.2) ----------


class MovementKind(StrEnum):
    DEPOSIT = "deposit"  # money leaves the available amount
    WITHDRAW = "withdraw"  # money comes back to it


class SavingsPot(IdMixin, CreatedAtMixin, Base):
    """Viagem, Emergência...: only the current value, no history or goal."""

    __tablename__ = "savings_pots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    balance: Mapped[Decimal] = mapped_column(MONEY, default=Decimal("0"))


class PotMovement(IdMixin, CreatedAtMixin, Base):
    """Deposits and withdrawals, kept only for the cycle calculation (not shown as history).

    They survive the pot being deleted, so deleting doesn't change the available amount.
    """

    __tablename__ = "pot_movements"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    pot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("savings_pots.id", ondelete="SET NULL"), index=True
    )
    kind: Mapped[MovementKind] = mapped_column(_enum_column(MovementKind))
    amount: Mapped[Decimal] = mapped_column(MONEY)
    day: Mapped[date] = mapped_column(index=True)


# ---------- Salary (section 9.6) ----------


class Salary(Base):
    """Value and day it arrives: the cycle goes from one salary to the next (section 9.7)."""

    __tablename__ = "salaries"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    amount: Mapped[Decimal] = mapped_column(MONEY)
    day: Mapped[int]

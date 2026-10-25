import uuid
from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.modules.finance.models import (
    CreditCard,
    FixedBill,
    FixedBillMonth,
    Invoice,
    PaymentMethod,
    PotMovement,
    Salary,
    SavingsPot,
    Transaction,
    TransactionKind,
)


class FinanceRepository:
    """All finance queries (always filtered by user)."""

    def __init__(self, db: Session):
        self.db = db

    # ---------- Cards and invoices ----------

    def list_cards(self, user_id: uuid.UUID) -> Sequence[CreditCard]:
        return self.db.scalars(
            select(CreditCard).where(CreditCard.user_id == user_id).order_by(CreditCard.name)
        ).all()

    def get_card(self, user_id: uuid.UUID, card_id: uuid.UUID) -> CreditCard | None:
        return self.db.scalars(
            select(CreditCard).where(CreditCard.user_id == user_id, CreditCard.id == card_id)
        ).first()

    def card_has_transactions(self, card_id: uuid.UUID) -> bool:
        return bool(self.db.scalar(select(exists().where(Transaction.card_id == card_id))))

    def invoices_of(self, card_id: uuid.UUID) -> dict[str, Invoice]:
        rows = self.db.scalars(select(Invoice).where(Invoice.card_id == card_id)).all()
        return {invoice.month: invoice for invoice in rows}

    def invoice_totals(self, card_id: uuid.UUID, before: date | None = None) -> dict[str, Decimal]:
        """{"2026-11": Decimal("1234.50"), ...}: SUM ... GROUP BY invoice month.

        With `before`, only purchases made before that day count.
        """
        query = select(Transaction.invoice_month, func.sum(Transaction.amount)).where(
            Transaction.card_id == card_id,
            Transaction.kind == TransactionKind.EXPENSE,
            Transaction.payment_method == PaymentMethod.CARD,
        )
        if before is not None:
            query = query.where(Transaction.day < before)
        rows = self.db.execute(query.group_by(Transaction.invoice_month)).all()
        return {month: Decimal(total) for month, total in rows if month}

    def invoice_transactions(self, card_id: uuid.UUID, month: str) -> Sequence[Transaction]:
        return self.db.scalars(
            select(Transaction)
            .where(
                Transaction.card_id == card_id,
                Transaction.invoice_month == month,
                Transaction.kind == TransactionKind.EXPENSE,
            )
            .order_by(Transaction.day, Transaction.created_at)
        ).all()

    # ---------- Transactions ----------

    def list_transactions(
        self,
        user_id: uuid.UUID,
        start: date | None = None,
        end: date | None = None,
        limit: int = 100,
    ) -> Sequence[Transaction]:
        """Newest first, optionally between two dates (inclusive)."""
        query = select(Transaction).where(Transaction.user_id == user_id)
        if start is not None:
            query = query.where(Transaction.day >= start)
        if end is not None:
            query = query.where(Transaction.day <= end)
        query = query.order_by(Transaction.day.desc(), Transaction.created_at.desc()).limit(limit)
        return self.db.scalars(query).all()

    def get_transaction(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction | None:
        return self.db.scalars(
            select(Transaction).where(
                Transaction.user_id == user_id, Transaction.id == transaction_id
            )
        ).first()

    def installments_from(self, group: uuid.UUID, number: int) -> Sequence[Transaction]:
        """Installments of a purchase from `number` on (this one and the next ones)."""
        return self.db.scalars(
            select(Transaction)
            .where(Transaction.installment_group == group, Transaction.installment_number >= number)
            .order_by(Transaction.installment_number)
        ).all()

    # ---------- Unit of work ----------

    def add(self, entity: object) -> None:
        self.db.add(entity)

    def delete(self, entity: object) -> None:
        self.db.delete(entity)

    def commit(self) -> None:
        self.db.commit()


class BudgetRepository:
    """Fixed bills, pots, salary and what the available calculation needs."""

    def __init__(self, db: Session):
        self.db = db

    # ---------- Fixed bills ----------

    def list_bills(self, user_id: uuid.UUID) -> Sequence[FixedBill]:
        return self.db.scalars(
            select(FixedBill).where(FixedBill.user_id == user_id).order_by(FixedBill.due_day)
        ).all()

    def get_bill(self, user_id: uuid.UUID, bill_id: uuid.UUID) -> FixedBill | None:
        return self.db.scalars(
            select(FixedBill).where(FixedBill.user_id == user_id, FixedBill.id == bill_id)
        ).first()

    def bill_months(
        self, bill_ids: Sequence[uuid.UUID]
    ) -> dict[uuid.UUID, dict[str, FixedBillMonth]]:
        """{bill_id: {"2026-10": record, ...}} for every bill at once."""
        result: dict[uuid.UUID, dict[str, FixedBillMonth]] = {bill_id: {} for bill_id in bill_ids}
        if not bill_ids:
            return result
        rows = self.db.scalars(
            select(FixedBillMonth).where(FixedBillMonth.bill_id.in_(bill_ids))
        ).all()
        for row in rows:
            result[row.bill_id][row.month] = row
        return result

    # ---------- Pots ----------

    def list_pots(self, user_id: uuid.UUID) -> Sequence[SavingsPot]:
        return self.db.scalars(
            select(SavingsPot).where(SavingsPot.user_id == user_id).order_by(SavingsPot.name)
        ).all()

    def get_pot(self, user_id: uuid.UUID, pot_id: uuid.UUID) -> SavingsPot | None:
        return self.db.scalars(
            select(SavingsPot).where(SavingsPot.user_id == user_id, SavingsPot.id == pot_id)
        ).first()

    def movements_between(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> Sequence[PotMovement]:
        return self.db.scalars(
            select(PotMovement).where(
                PotMovement.user_id == user_id, PotMovement.day >= start, PotMovement.day < end
            )
        ).all()

    # ---------- Salary ----------

    def get_salary(self, user_id: uuid.UUID) -> Salary | None:
        return self.db.get(Salary, user_id)

    # ---------- Unit of work ----------

    def add(self, entity: object) -> None:
        self.db.add(entity)

    def delete(self, entity: object) -> None:
        self.db.delete(entity)

    def commit(self) -> None:
        self.db.commit()

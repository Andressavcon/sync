import uuid
from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal

from app.core.exceptions import ConflictError, InvalidDataError, NotFoundError
from app.core.schemas import Scope
from app.modules.finance.invoices import (
    add_months,
    date_in_month,
    default_closing_date,
    due_date,
    month_of,
    suggest_invoice,
)
from app.modules.finance.models import (
    CreditCard,
    Invoice,
    PaymentMethod,
    Transaction,
    TransactionKind,
)
from app.modules.finance.repository import FinanceRepository
from app.modules.finance.schemas import (
    CardCreate,
    CardRead,
    CardSummary,
    CardUpdate,
    CurrentInvoice,
    InstallmentCreate,
    InvoiceRead,
    SuggestedInvoice,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
)

ZERO = Decimal("0")


class CardService:
    """Cards and their invoices."""

    def __init__(self, repo: FinanceRepository):
        self.repo = repo

    # ---------- Cards ----------

    def summaries(self, user_id: uuid.UUID, today: date) -> list[CardSummary]:
        """Every card with its current invoice and what's committed after it."""
        result = []
        for card in self.repo.list_cards(user_id):
            invoices = self.repo.invoices_of(card.id)
            totals = self.repo.invoice_totals(card.id)
            current = self.suggest(card, today, invoices)
            current_record = invoices.get(current)
            result.append(
                CardSummary(
                    card=CardRead.model_validate(card),
                    current_invoice=CurrentInvoice(
                        month=current,
                        due_date=due_date(card, current),
                        total=totals.get(current, ZERO),
                        needs_check=not (current_record and current_record.confirmed),
                    ),
                    future_committed=sum(
                        (total for month, total in totals.items() if month > current), ZERO
                    ),
                )
            )
        return result

    def create(self, user_id: uuid.UUID, data: CardCreate) -> CreditCard:
        card = CreditCard(user_id=user_id, **data.model_dump())
        self.repo.add(card)
        self.repo.commit()
        return card

    def update(self, user_id: uuid.UUID, card_id: uuid.UUID, data: CardUpdate) -> CreditCard:
        card = self.get(user_id, card_id)
        for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(card, field, value)
        self.repo.commit()
        return card

    def delete(self, user_id: uuid.UUID, card_id: uuid.UUID) -> None:
        """Only cards without transactions; the others are archived."""
        card = self.get(user_id, card_id)
        if self.repo.card_has_transactions(card.id):
            raise ConflictError("The card has transactions: archive it instead")
        self.repo.delete(card)
        self.repo.commit()

    def get(self, user_id: uuid.UUID, card_id: uuid.UUID) -> CreditCard:
        card = self.repo.get_card(user_id, card_id)
        if card is None:
            raise NotFoundError("Card not found")
        return card

    # ---------- Invoices ----------

    def suggested_invoice(
        self, user_id: uuid.UUID, card_id: uuid.UUID, day: date
    ) -> SuggestedInvoice:
        card = self.get(user_id, card_id)
        month = self.suggest(card, day)
        return SuggestedInvoice(month=month, due_date=due_date(card, month))

    def invoice(self, user_id: uuid.UUID, card_id: uuid.UUID, month: str) -> InvoiceRead:
        card = self.get(user_id, card_id)
        record = self.repo.invoices_of(card.id).get(month)
        transactions = self.repo.invoice_transactions(card.id, month)
        return InvoiceRead(
            card_id=card.id,
            month=month,
            due_date=due_date(card, month),
            closing_date=self._closing_date(card, month, record),
            confirmed=bool(record and record.confirmed),
            paid=bool(record and record.paid),
            paid_at=record.paid_at if record else None,
            total=sum((t.amount for t in transactions), ZERO),
            transactions=[TransactionRead.model_validate(t) for t in transactions],
        )

    def confirm_closing(
        self, user_id: uuid.UUID, card_id: uuid.UUID, month: str, closing: date
    ) -> InvoiceRead:
        """Checked or edited this month's closing date: the alert goes away."""
        record = self._invoice_record(user_id, card_id, month)
        record.closing_date = closing
        record.confirmed = True
        self.repo.commit()
        return self.invoice(user_id, card_id, month)

    def set_paid(
        self, user_id: uuid.UUID, card_id: uuid.UUID, month: str, paid: bool, now: datetime
    ) -> InvoiceRead:
        """Paying an invoice is not a new expense: it settles what was already spent."""
        record = self._invoice_record(user_id, card_id, month)
        record.paid = paid
        record.paid_at = now if paid else None
        self.repo.commit()
        return self.invoice(user_id, card_id, month)

    def suggest(
        self, card: CreditCard, purchase: date, invoices: dict[str, Invoice] | None = None
    ) -> str:
        """Invoice month for a purchase on `purchase`, using closing dates edited by hand."""
        records = invoices if invoices is not None else self.repo.invoices_of(card.id)
        return suggest_invoice(
            card, purchase, lambda month: self._closing_date(card, month, records.get(month))
        )

    @staticmethod
    def _closing_date(card: CreditCard, month: str, record: Invoice | None) -> date:
        if record and record.closing_date:
            return record.closing_date
        return default_closing_date(card, month)

    def _invoice_record(self, user_id: uuid.UUID, card_id: uuid.UUID, month: str) -> Invoice:
        """The stored invoice, created on the first change."""
        card = self.get(user_id, card_id)
        record = self.repo.invoices_of(card.id).get(month)
        if record is None:
            record = Invoice(card_id=card.id, month=month)
            self.repo.add(record)
        return record


class TransactionService:
    """Incomes and expenses, including installments."""

    def __init__(self, repo: FinanceRepository, cards: CardService):
        self.repo = repo
        self.cards = cards

    def list(
        self, user_id: uuid.UUID, start: date | None, end: date | None, limit: int
    ) -> Sequence[Transaction]:
        return self.repo.list_transactions(user_id, start, end, limit)

    def create(self, user_id: uuid.UUID, data: TransactionCreate) -> Transaction:
        transaction = Transaction(
            user_id=user_id,
            kind=data.kind,
            title=data.title,
            amount=data.amount,
            day=data.day,
            payment_method=data.payment_method,
            count_in_available=data.kind == TransactionKind.INCOME and data.count_in_available,
        )
        self._place_on_card(user_id, transaction, data.card_id, data.invoice_month)
        self.repo.add(transaction)
        self.repo.commit()
        return transaction

    def create_installments(self, user_id: uuid.UUID, data: InstallmentCreate) -> list[Transaction]:
        """One expense per installment, each one in the next invoice."""
        card = self._usable_card(user_id, data.card_id)
        first_invoice = data.invoice_month or self.cards.suggest(card, data.day)
        group = uuid.uuid4()
        created = []
        for index in range(data.installments):
            invoice_month = add_months(first_invoice, index)
            year, month = (int(part) for part in add_months(month_of(data.day), index).split("-"))
            created.append(
                Transaction(
                    user_id=user_id,
                    kind=TransactionKind.EXPENSE,
                    title=data.title,
                    amount=data.installment_amount,
                    day=date_in_month(year, month, data.day.day),
                    payment_method=PaymentMethod.CARD,
                    card_id=card.id,
                    invoice_month=invoice_month,
                    installment_group=group,
                    installment_number=index + 1,
                    installment_total=data.installments,
                )
            )
        for transaction in created:
            self.repo.add(transaction)
        self.repo.commit()
        return created

    def update(
        self,
        user_id: uuid.UUID,
        transaction_id: uuid.UUID,
        data: TransactionUpdate,
        scope: Scope = Scope.THIS,
    ) -> Transaction:
        transaction = self._get(user_id, transaction_id)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)

        if scope == Scope.FOLLOWING:
            # Like recurring cards: only "this one" or "this and the next".
            # Title and amount go to the next installments; the rest only to this one.
            for other in self._following_installments(transaction):
                for field in ("title", "amount"):
                    if field in changes:
                        setattr(other, field, changes[field])

        if "count_in_available" in changes and transaction.kind != TransactionKind.INCOME:
            changes.pop("count_in_available")
        card_id = changes.pop("card_id", transaction.card_id)
        invoice_month = changes.pop("invoice_month", None)
        moved = "day" in changes or "payment_method" in changes or card_id != transaction.card_id
        for field, value in changes.items():
            setattr(transaction, field, value)
        if moved or invoice_month:
            # Card, date or payment changed: recalculate the invoice unless one was chosen
            self._place_on_card(user_id, transaction, card_id, invoice_month)

        self.repo.commit()
        return transaction

    def delete(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, scope: Scope = Scope.THIS
    ) -> None:
        transaction = self._get(user_id, transaction_id)
        targets = (
            self._following_installments(transaction) if scope == Scope.FOLLOWING else [transaction]
        )
        for target in targets:
            self.repo.delete(target)
        self.repo.commit()

    # ---------- Helpers ----------

    def _place_on_card(
        self,
        user_id: uuid.UUID,
        transaction: Transaction,
        card_id: uuid.UUID | None,
        invoice_month: str | None,
    ) -> None:
        """Card expenses get a card and an invoice; everything else gets none."""
        if transaction.payment_method != PaymentMethod.CARD:
            transaction.card_id = None
            transaction.invoice_month = None
            return
        if transaction.kind == TransactionKind.INCOME:
            raise InvalidDataError("An income can't be paid by card")
        if card_id is None:
            raise InvalidDataError("Choose the card")
        card = self._usable_card(user_id, card_id)
        transaction.card_id = card.id
        transaction.invoice_month = invoice_month or self.cards.suggest(card, transaction.day)

    def _usable_card(self, user_id: uuid.UUID, card_id: uuid.UUID) -> CreditCard:
        card = self.repo.get_card(user_id, card_id)
        if card is None or card.archived:
            raise InvalidDataError("Card does not exist or is archived")
        return card

    def _following_installments(self, transaction: Transaction) -> Sequence[Transaction]:
        if transaction.installment_group is None or transaction.installment_number is None:
            raise InvalidDataError("This transaction is not an installment")
        return self.repo.installments_from(
            transaction.installment_group, transaction.installment_number
        )

    def _get(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
        transaction = self.repo.get_transaction(user_id, transaction_id)
        if transaction is None:
            raise NotFoundError("Transaction not found")
        return transaction

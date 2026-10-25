import uuid
from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.core.auth import CurrentUser
from app.core.clock import Now, UtcNow
from app.core.database import DbSession
from app.core.schemas import Scope
from app.modules.finance.models import CreditCard, Transaction
from app.modules.finance.repository import FinanceRepository
from app.modules.finance.schemas import (
    CardCreate,
    CardRead,
    CardSummary,
    CardUpdate,
    InstallmentCreate,
    InvoiceClosing,
    InvoicePaid,
    InvoiceRead,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
)
from app.modules.finance.service import CardService, TransactionService


def get_card_service(db: DbSession) -> CardService:
    return CardService(FinanceRepository(db))


def get_transaction_service(
    db: DbSession, cards: Annotated[CardService, Depends(get_card_service)]
) -> TransactionService:
    return TransactionService(FinanceRepository(db), cards)


CardServiceDep = Annotated[CardService, Depends(get_card_service)]
TransactionServiceDep = Annotated[TransactionService, Depends(get_transaction_service)]
# Invoice month in the URL: /invoices/2026-11
MonthPath = Annotated[str, Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]
ScopeParam = Annotated[Scope, Query()]

router = APIRouter(prefix="/api/finance", tags=["finance"])


# ---------- Cards ----------


@router.get("/cards", response_model=list[CardSummary])
def list_cards(user: CurrentUser, service: CardServiceDep, now: Now) -> list[CardSummary]:
    """Every card (archived too) with its current invoice and future commitments."""
    return service.summaries(user.id, now.date())


@router.post("/cards", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def create_card(data: CardCreate, user: CurrentUser, service: CardServiceDep) -> CreditCard:
    return service.create(user.id, data)


@router.patch("/cards/{card_id}", response_model=CardRead)
def update_card(
    card_id: uuid.UUID, data: CardUpdate, user: CurrentUser, service: CardServiceDep
) -> CreditCard:
    """Edit, archive (archived: true) or restore (archived: false)."""
    return service.update(user.id, card_id, data)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: uuid.UUID, user: CurrentUser, service: CardServiceDep) -> None:
    """409 when the card has transactions: archive it instead."""
    service.delete(user.id, card_id)


# ---------- Invoices ----------


@router.get("/cards/{card_id}/invoices/{month}", response_model=InvoiceRead)
def get_invoice(
    card_id: uuid.UUID,
    month: MonthPath,
    user: CurrentUser,
    service: CardServiceDep,
) -> InvoiceRead:
    return service.invoice(user.id, card_id, month)


@router.put("/cards/{card_id}/invoices/{month}/closing", response_model=InvoiceRead)
def confirm_closing(
    card_id: uuid.UUID,
    month: MonthPath,
    data: InvoiceClosing,
    user: CurrentUser,
    service: CardServiceDep,
) -> InvoiceRead:
    return service.confirm_closing(user.id, card_id, month, data.closing_date)


@router.put("/cards/{card_id}/invoices/{month}/paid", response_model=InvoiceRead)
def set_invoice_paid(
    card_id: uuid.UUID,
    month: MonthPath,
    data: InvoicePaid,
    user: CurrentUser,
    service: CardServiceDep,
    now: UtcNow,
) -> InvoiceRead:
    return service.set_paid(user.id, card_id, month, data.paid, now)


# ---------- Transactions ----------


@router.get("/transactions", response_model=list[TransactionRead])
def list_transactions(
    user: CurrentUser,
    service: TransactionServiceDep,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> Sequence[Transaction]:
    """Newest first. Filter with ?start=2026-10-01&end=2026-10-31."""
    return service.list(user.id, start, end, limit)


@router.post("/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate, user: CurrentUser, service: TransactionServiceDep
) -> Transaction:
    return service.create(user.id, data)


@router.post(
    "/transactions/installments",
    response_model=list[TransactionRead],
    status_code=status.HTTP_201_CREATED,
)
def create_installments(
    data: InstallmentCreate, user: CurrentUser, service: TransactionServiceDep
) -> list[Transaction]:
    return service.create_installments(user.id, data)


@router.patch("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionUpdate,
    user: CurrentUser,
    service: TransactionServiceDep,
    scope: ScopeParam = Scope.THIS,
) -> Transaction:
    return service.update(user.id, transaction_id, data, scope)


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: uuid.UUID,
    user: CurrentUser,
    service: TransactionServiceDep,
    scope: ScopeParam = Scope.THIS,
) -> None:
    service.delete(user.id, transaction_id, scope)

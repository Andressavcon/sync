import uuid
from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.core.auth import CurrentUser
from app.core.clock import Now, UtcNow
from app.core.database import DbSession
from app.core.schemas import Scope
from app.modules.finance.budget_service import BudgetService
from app.modules.finance.models import CreditCard, FixedBill, SavingsPot, Transaction
from app.modules.finance.repository import BudgetRepository, FinanceRepository
from app.modules.finance.schemas import (
    AvailableRead,
    CardCreate,
    CardRead,
    CardSummary,
    CardUpdate,
    FixedBillCreate,
    FixedBillMonthUpdate,
    FixedBillOfMonth,
    FixedBillRead,
    FixedBillsMonth,
    FixedBillUpdate,
    InstallmentCreate,
    InvoiceClosing,
    InvoicePaid,
    InvoiceRead,
    MonthSummary,
    PotBalance,
    PotCreate,
    PotMoney,
    PotRead,
    PotsRead,
    PotUpdate,
    SalaryRead,
    SalaryUpdate,
    SuggestedInvoice,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    WeekSpending,
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


# ---------- Fixed bills, pots, salary and overview ----------


def get_budget_service(db: DbSession) -> BudgetService:
    return BudgetService(BudgetRepository(db), FinanceRepository(db))


BudgetServiceDep = Annotated[BudgetService, Depends(get_budget_service)]
MonthQuery = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


@router.get("/fixed-bills", response_model=FixedBillsMonth)
def bills_of_month(
    month: MonthQuery, user: CurrentUser, service: BudgetServiceDep
) -> FixedBillsMonth:
    """The month's bills with their value, due date and paid check."""
    return service.bills_of_month(user.id, month)


@router.post("/fixed-bills", response_model=FixedBillRead, status_code=status.HTTP_201_CREATED)
def create_bill(data: FixedBillCreate, user: CurrentUser, service: BudgetServiceDep) -> FixedBill:
    return service.create_bill(user.id, data)


@router.patch("/fixed-bills/{bill_id}", response_model=FixedBillRead)
def update_bill(
    bill_id: uuid.UUID, data: FixedBillUpdate, user: CurrentUser, service: BudgetServiceDep
) -> FixedBill:
    return service.update_bill(user.id, bill_id, data)


@router.delete("/fixed-bills/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(bill_id: uuid.UUID, user: CurrentUser, service: BudgetServiceDep) -> None:
    service.delete_bill(user.id, bill_id)


@router.put("/fixed-bills/{bill_id}/months/{month}", response_model=FixedBillOfMonth)
def update_bill_month(
    bill_id: uuid.UUID,
    month: MonthPath,
    data: FixedBillMonthUpdate,
    user: CurrentUser,
    service: BudgetServiceDep,
    now: UtcNow,
) -> FixedBillOfMonth:
    """This month's real value and/or paid."""
    return service.update_bill_month(user.id, bill_id, month, data, now)


@router.get("/pots", response_model=PotsRead)
def list_pots(user: CurrentUser, service: BudgetServiceDep) -> PotsRead:
    return service.pots(user.id)


@router.post("/pots", response_model=PotRead, status_code=status.HTTP_201_CREATED)
def create_pot(data: PotCreate, user: CurrentUser, service: BudgetServiceDep) -> SavingsPot:
    return service.create_pot(user.id, data.name)


@router.patch("/pots/{pot_id}", response_model=PotRead)
def rename_pot(
    pot_id: uuid.UUID, data: PotUpdate, user: CurrentUser, service: BudgetServiceDep
) -> SavingsPot:
    return service.rename_pot(user.id, pot_id, data.name)


@router.delete("/pots/{pot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pot(pot_id: uuid.UUID, user: CurrentUser, service: BudgetServiceDep) -> None:
    """Only empty pots (422 while it has money)."""
    service.delete_pot(user.id, pot_id)


@router.post("/pots/{pot_id}/deposit", response_model=PotRead)
def deposit(
    pot_id: uuid.UUID, data: PotMoney, user: CurrentUser, service: BudgetServiceDep, now: Now
) -> SavingsPot:
    return service.deposit(user.id, pot_id, data.amount, now.date())


@router.post("/pots/{pot_id}/withdraw", response_model=PotRead)
def withdraw(
    pot_id: uuid.UUID, data: PotMoney, user: CurrentUser, service: BudgetServiceDep, now: Now
) -> SavingsPot:
    return service.withdraw(user.id, pot_id, data.amount, now.date())


@router.put("/pots/{pot_id}/balance", response_model=PotRead)
def set_pot_balance(
    pot_id: uuid.UUID, data: PotBalance, user: CurrentUser, service: BudgetServiceDep
) -> SavingsPot:
    """Correction of the value; doesn't change the available amount."""
    return service.set_balance(user.id, pot_id, data.balance)


@router.get("/salary", response_model=SalaryRead)
def get_salary(user: CurrentUser, service: BudgetServiceDep) -> SalaryRead:
    return service.salary(user.id)


@router.put("/salary", response_model=SalaryRead)
def set_salary(data: SalaryUpdate, user: CurrentUser, service: BudgetServiceDep) -> SalaryRead:
    return service.set_salary(user.id, data)


@router.get("/available", response_model=AvailableRead)
def available(user: CurrentUser, service: BudgetServiceDep, now: Now) -> AvailableRead:
    """Money available to spend in the cycle and per week."""
    return service.available(user.id, now.date())


@router.get("/summary", response_model=MonthSummary)
def month_summary(month: MonthQuery, user: CurrentUser, service: BudgetServiceDep) -> MonthSummary:
    return service.month_summary(user.id, month)


@router.get("/cards/{card_id}/suggested-invoice", response_model=SuggestedInvoice)
def suggested_invoice(
    card_id: uuid.UUID, day: Annotated[date, Query()], user: CurrentUser, service: CardServiceDep
) -> SuggestedInvoice:
    """Invoice a purchase on `day` would fall into (shown in the form before saving)."""
    return service.suggested_invoice(user.id, card_id, day)


@router.get("/week-spending", response_model=WeekSpending)
def week_spending(user: CurrentUser, service: BudgetServiceDep, now: Now) -> WeekSpending:
    """How much of this week's money was already used."""
    return service.week_spending(user.id, now.date())

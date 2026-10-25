"""Fixed bills, savings pots, salary and the money available to spend (sections 9.2 to 9.6)."""

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.core.exceptions import InvalidDataError, NotFoundError
from app.modules.finance.available import (
    Available,
    BillInput,
    CardInput,
    bill_value_in,
    calculate_available,
    cycle_of,
)
from app.modules.finance.invoices import date_in_month
from app.modules.finance.models import (
    FixedBill,
    FixedBillMonth,
    MovementKind,
    PotMovement,
    Salary,
    SavingsPot,
    TransactionKind,
)
from app.modules.finance.repository import BudgetRepository, FinanceRepository
from app.modules.finance.schemas import (
    AvailableRead,
    FixedBillCreate,
    FixedBillMonthUpdate,
    FixedBillOfMonth,
    FixedBillRead,
    FixedBillsMonth,
    FixedBillUpdate,
    MonthSummary,
    PotRead,
    PotsRead,
    SalaryRead,
    SalaryUpdate,
    WeekSpending,
)

ZERO = Decimal("0")
DEFAULT_SALARY_DAY = 5
EVERYTHING = 100_000  # no practical limit when loading a cycle's transactions


def _month_bounds(month: str) -> tuple[date, date]:
    year, number = int(month[:4]), int(month[5:])
    return date(year, number, 1), date_in_month(year, number, 31)


class BudgetService:
    def __init__(self, budget: BudgetRepository, finance: FinanceRepository):
        self.budget = budget
        self.finance = finance

    # ---------- Fixed bills ----------

    def bills_of_month(self, user_id: uuid.UUID, month: str) -> FixedBillsMonth:
        bills = self.budget.list_bills(user_id)
        records = self.budget.bill_months([b.id for b in bills])
        items = [self._bill_of_month(bill, month, records[bill.id]) for bill in bills]
        return FixedBillsMonth(
            month=month,
            bills=items,
            pending_total=sum((i.amount for i in items if not i.paid), ZERO),
        )

    def create_bill(self, user_id: uuid.UUID, data: FixedBillCreate) -> FixedBill:
        bill = FixedBill(user_id=user_id, **data.model_dump())
        self.budget.add(bill)
        self.budget.commit()
        return bill

    def update_bill(
        self, user_id: uuid.UUID, bill_id: uuid.UUID, data: FixedBillUpdate
    ) -> FixedBill:
        bill = self._get_bill(user_id, bill_id)
        for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(bill, field, value)
        self.budget.commit()
        return bill

    def delete_bill(self, user_id: uuid.UUID, bill_id: uuid.UUID) -> None:
        self.budget.delete(self._get_bill(user_id, bill_id))
        self.budget.commit()

    def update_bill_month(
        self,
        user_id: uuid.UUID,
        bill_id: uuid.UUID,
        month: str,
        data: FixedBillMonthUpdate,
        now: datetime,
    ) -> FixedBillOfMonth:
        """The real value of this month's bill, and/or paid (keeps the payment date, 9.4)."""
        bill = self._get_bill(user_id, bill_id)
        records = self.budget.bill_months([bill.id])[bill.id]
        record = records.get(month)
        if record is None:
            usual = bill_value_in(month, bill.amount, {m: r.amount for m, r in records.items()})
            record = FixedBillMonth(bill_id=bill.id, month=month, amount=usual)
            self.budget.add(record)
            records[month] = record
        if data.amount is not None:
            record.amount = data.amount
        if data.paid is not None and data.paid != record.paid:
            record.paid = data.paid
            record.paid_at = now if data.paid else None
        self.budget.commit()
        return self._bill_of_month(bill, month, records)

    def _bill_of_month(
        self, bill: FixedBill, month: str, records: dict[str, FixedBillMonth]
    ) -> FixedBillOfMonth:
        record = records.get(month)
        year, number = int(month[:4]), int(month[5:])
        return FixedBillOfMonth(
            bill=FixedBillRead.model_validate(bill),
            month=month,
            amount=bill_value_in(month, bill.amount, {m: r.amount for m, r in records.items()}),
            due_date=date_in_month(year, number, bill.due_day),
            paid=bool(record and record.paid),
            paid_at=record.paid_at if record else None,
        )

    def _get_bill(self, user_id: uuid.UUID, bill_id: uuid.UUID) -> FixedBill:
        bill = self.budget.get_bill(user_id, bill_id)
        if bill is None:
            raise NotFoundError("Fixed bill not found")
        return bill

    # ---------- Savings pots ----------

    def pots(self, user_id: uuid.UUID) -> PotsRead:
        pots = self.budget.list_pots(user_id)
        return PotsRead(
            pots=[PotRead.model_validate(p) for p in pots],
            total=sum((p.balance for p in pots), ZERO),
        )

    def create_pot(self, user_id: uuid.UUID, name: str) -> SavingsPot:
        pot = SavingsPot(user_id=user_id, name=name, balance=ZERO)
        self.budget.add(pot)
        self.budget.commit()
        return pot

    def rename_pot(self, user_id: uuid.UUID, pot_id: uuid.UUID, name: str) -> SavingsPot:
        pot = self._get_pot(user_id, pot_id)
        pot.name = name
        self.budget.commit()
        return pot

    def delete_pot(self, user_id: uuid.UUID, pot_id: uuid.UUID) -> None:
        """Only empty pots: the money has to be withdrawn first (section 9.7)."""
        pot = self._get_pot(user_id, pot_id)
        if pot.balance > 0:
            raise InvalidDataError("Withdraw the money before deleting the pot")
        self.budget.delete(pot)
        self.budget.commit()

    def deposit(
        self, user_id: uuid.UUID, pot_id: uuid.UUID, amount: Decimal, today: date
    ) -> SavingsPot:
        """Saving hides the money: it leaves the cycle's available amount."""
        pot = self._get_pot(user_id, pot_id)
        pot.balance += amount
        self._record(user_id, pot, MovementKind.DEPOSIT, amount, today)
        return pot

    def withdraw(
        self, user_id: uuid.UUID, pot_id: uuid.UUID, amount: Decimal, today: date
    ) -> SavingsPot:
        """Withdrawing gives the money back to the cycle's available amount."""
        pot = self._get_pot(user_id, pot_id)
        if amount > pot.balance:
            raise InvalidDataError("The pot doesn't have that much")
        pot.balance -= amount
        self._record(user_id, pot, MovementKind.WITHDRAW, amount, today)
        return pot

    def set_balance(self, user_id: uuid.UUID, pot_id: uuid.UUID, balance: Decimal) -> SavingsPot:
        """A correction of the value: no movement, the available amount doesn't change."""
        pot = self._get_pot(user_id, pot_id)
        pot.balance = balance
        self.budget.commit()
        return pot

    def _record(
        self, user_id: uuid.UUID, pot: SavingsPot, kind: MovementKind, amount: Decimal, today: date
    ) -> None:
        self.budget.add(
            PotMovement(user_id=user_id, pot_id=pot.id, kind=kind, amount=amount, day=today)
        )
        self.budget.commit()

    def _get_pot(self, user_id: uuid.UUID, pot_id: uuid.UUID) -> SavingsPot:
        pot = self.budget.get_pot(user_id, pot_id)
        if pot is None:
            raise NotFoundError("Pot not found")
        return pot

    # ---------- Salary ----------

    def salary(self, user_id: uuid.UUID) -> SalaryRead:
        salary = self.budget.get_salary(user_id)
        if salary is None:
            return SalaryRead(amount=ZERO, day=DEFAULT_SALARY_DAY, configured=False)
        return SalaryRead(amount=salary.amount, day=salary.day, configured=True)

    def set_salary(self, user_id: uuid.UUID, data: SalaryUpdate) -> SalaryRead:
        salary = self.budget.get_salary(user_id)
        if salary is None:
            salary = Salary(user_id=user_id)
            self.budget.add(salary)
        salary.amount, salary.day = data.amount, data.day
        self.budget.commit()
        return self.salary(user_id)

    # ---------- Overview ----------

    def available(self, user_id: uuid.UUID, today: date) -> AvailableRead:
        result = self._calculate(user_id, today)
        return AvailableRead(
            cycle_start=result.cycle.start,
            cycle_last_day=result.cycle.end - timedelta(days=1),
            days_left=result.days_left,
            salary=result.salary,
            fixed_bills=result.fixed_bills,
            invoices=result.invoices,
            one_off_expenses=result.one_off_expenses,
            saved=result.saved,
            extra_income=result.extra_income,
            total=result.total,
            weeks_left=result.weeks_left,
            per_week=result.per_week,
        )

    def week_spending(self, user_id: uuid.UUID, today: date) -> WeekSpending:
        """How much of this week's money was used (section 9.6).

        100% is the week's available amount AT THE START of the week, so it doesn't move
        with every purchase. Used = available then - available now (purchases, pix,
        savings... made since then).
        """
        salary = self.salary(user_id)
        cycle = cycle_of(today, salary.day)
        monday = today - timedelta(days=today.weekday())
        start = max(monday, cycle.start)  # a cycle that began this week starts there

        at_start = self._calculate(user_id, start, before=start)
        now = self._calculate(user_id, today)
        used = at_start.total - now.total
        budget = at_start.per_week
        percent = int((used / budget * 100).to_integral_value()) if budget > 0 else None
        return WeekSpending(week_budget=budget, used=used, percent=percent)

    def _calculate(self, user_id: uuid.UUID, today: date, before: date | None = None) -> Available:
        """The available calculation with the data from the database.

        With `before`, only what happened before that day counts (a picture of that moment).
        """
        salary = self.salary(user_id)
        cycle = cycle_of(today, salary.day)

        bills = self.budget.list_bills(user_id)
        records = self.budget.bill_months([b.id for b in bills])
        bill_inputs = [
            BillInput(
                due_day=bill.due_day,
                # default arguments freeze the current bill in each lambda
                value_in=lambda month, bill=bill: bill_value_in(
                    month, bill.amount, {m: r.amount for m, r in records[bill.id].items()}
                ),
            )
            for bill in bills
        ]
        # Archived cards still have invoices to pay
        card_inputs = [
            CardInput(schedule=card, totals=self.finance.invoice_totals(card.id, before))
            for card in self.finance.list_cards(user_id)
        ]
        last_day = cycle.end - timedelta(days=1)
        if before is not None:
            last_day = min(last_day, before - timedelta(days=1))
        transactions = self.finance.list_transactions(user_id, cycle.start, last_day, EVERYTHING)
        movements = self.budget.movements_between(
            user_id, cycle.start, min(cycle.end, before) if before else cycle.end
        )

        return calculate_available(
            today, salary.amount, salary.day, bill_inputs, card_inputs, transactions, movements
        )

    def month_summary(self, user_id: uuid.UUID, month: str) -> MonthSummary:
        """Incomes (salary + others), expenses (all + fixed bills) and balance of a month."""
        start, end = _month_bounds(month)
        transactions = self.finance.list_transactions(user_id, start, end, EVERYTHING)
        salary = self.salary(user_id)

        income = salary.amount + sum(
            (t.amount for t in transactions if t.kind == TransactionKind.INCOME), ZERO
        )
        bills = self.bills_of_month(user_id, month)
        expenses = sum(
            (t.amount for t in transactions if t.kind == TransactionKind.EXPENSE), ZERO
        ) + sum((b.amount for b in bills.bills), ZERO)
        return MonthSummary(
            month=month, income=income, expenses=expenses, balance=income - expenses
        )

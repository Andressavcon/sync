"""Home screen. Only READS the other modules, through their own services."""

import uuid
from datetime import date, datetime, timedelta
from itertools import groupby

from sqlalchemy.orm import Session

from app.modules.dashboard.schemas import (
    BillsPanel,
    DashboardCard,
    DashboardRead,
    KanbanPanel,
    SpendingPanel,
    WorkoutBlockSummary,
    WorkoutDay,
    WorkoutPanel,
)
from app.modules.finance.budget_service import BudgetService
from app.modules.finance.repository import BudgetRepository, FinanceRepository
from app.modules.kanban.board import BoardCard
from app.modules.kanban.models import CardStatus
from app.modules.kanban.repository import CardRepository, RecurrenceRepository, TagRepository
from app.modules.kanban.service import CardService, RecurrenceService
from app.modules.settings.service import SettingsService
from app.modules.workouts.models import BlockState, WorkoutBlock
from app.modules.workouts.repository import WorkoutRepository
from app.modules.workouts.service import is_day_completed

LAST_DAYS = 6  # 5 days before + today


def _card(item: BoardCard) -> DashboardCard:
    card = item.card
    return DashboardCard(
        id=card.id,
        title=card.title,
        status=card.status,
        due_date=card.due_date,
        due_time=card.due_time,
        is_late=item.is_late,
        days_until=item.days_until,
    )


class DashboardService:
    def __init__(self, db: Session):
        tags = TagRepository(db)
        recurrences = RecurrenceService(RecurrenceRepository(db), CardRepository(db), tags)
        self.cards = CardService(CardRepository(db), tags, recurrences)
        self.workouts = WorkoutRepository(db)
        self.budget = BudgetService(BudgetRepository(db), FinanceRepository(db))
        self.settings = SettingsService(db)

    def get(self, user_id: uuid.UUID, now: datetime) -> DashboardRead:
        today = now.date()
        settings = self.settings.get(user_id)
        return DashboardRead(
            today=today,
            kanban=self._kanban(user_id, now),
            workouts=self._workouts(user_id, today, settings.weekly_workout_goal),
            bills=self._bills(user_id, today, settings.bill_reminder_day),
            spending=self._spending(user_id, today),
        )

    def _kanban(self, user_id: uuid.UUID, now: datetime) -> KanbanPanel:
        board = self.cards.board(user_id, now)
        today_column = next(d for d in board.days if d.is_today)
        # Late ones from the week's other days, plus the overdue section
        late = [i for d in board.days if not d.is_today for i in d.cards if i.is_late]
        return KanbanPanel(
            today=[_card(i) for i in today_column.cards if i.card.status != CardStatus.DONE],
            late=[_card(i) for i in late + board.overdue],
            upcoming=[_card(i) for i in board.upcoming],
        )

    def _workouts(self, user_id: uuid.UUID, today: date, weekly_goal: int) -> WorkoutPanel:
        first_day = today - timedelta(days=LAST_DAYS - 1)
        month_start = today.replace(day=1)
        blocks = self.workouts.list_blocks(user_id, min(first_day, month_start), today)
        by_day: dict[date, list[WorkoutBlock]] = {
            day: list(group) for day, group in groupby(blocks, key=lambda b: b.day)
        }

        today_blocks = by_day.get(today, [])
        done_blocks = sum(1 for b in today_blocks if b.state == BlockState.DONE)
        if not today_blocks:
            state = "empty"
        elif done_blocks == len(today_blocks):
            state = "done"
        elif any(b.state != BlockState.NOT_STARTED for b in today_blocks):
            state = "in_progress"
        else:
            state = "not_started"

        last_days = []
        for offset in range(LAST_DAYS - 1, -1, -1):
            day = today - timedelta(days=offset)
            day_blocks = by_day.get(day, [])
            if is_day_completed(day_blocks):
                mark = "done"
            elif day == today:
                mark = "today"
            elif day_blocks:
                mark = "missed"
            else:
                mark = "rest"  # nothing planned: a rest day doesn't look like a missed one (7.5)
            last_days.append(WorkoutDay(day=day, mark=mark))

        month_completed = sum(
            1
            for day, day_blocks in by_day.items()
            if day >= month_start and is_day_completed(day_blocks)
        )
        return WorkoutPanel(
            blocks=[WorkoutBlockSummary(title=b.title, state=b.state) for b in today_blocks],
            done_blocks=done_blocks,
            state=state,
            last_days=last_days,
            month_completed=month_completed,
            month_goal=weekly_goal * 4,  # the month always counts 4 weeks (7.5)
        )

    def _bills(self, user_id: uuid.UUID, today: date, reminder_day: int) -> BillsPanel:
        month = f"{today.year:04d}-{today.month:02d}"
        bills = self.budget.bills_of_month(user_id, month).bills
        unpaid = [b for b in bills if not b.paid]
        next_due = min((b.due_date for b in unpaid), default=None)
        return BillsPanel(
            has_bills=bool(bills),
            active=today.day >= reminder_day,
            all_paid=bool(bills) and not unpaid,
            next_due_date=next_due,
            days_to_next_due=(next_due - today).days if next_due else None,
        )

    def _spending(self, user_id: uuid.UUID, today: date) -> SpendingPanel:
        spending = self.budget.week_spending(user_id, today)
        percent = spending.percent
        return SpendingPanel(percent=percent, over=percent is not None and percent > 100)

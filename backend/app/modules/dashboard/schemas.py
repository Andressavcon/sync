import uuid
from datetime import date, time
from typing import Literal

from app.core.schemas import ApiModel
from app.modules.kanban.models import CardStatus
from app.modules.workouts.models import BlockState


class DashboardCard(ApiModel):
    id: uuid.UUID
    title: str
    status: CardStatus
    due_date: date
    due_time: time
    is_late: bool
    days_until: int


class KanbanPanel(ApiModel):
    today: list[DashboardCard]  # pending and in progress of the day (section 5)
    late: list[DashboardCard]  # highlighted
    upcoming: list[DashboardCard]  # with countdown


DayMark = Literal["done", "missed", "rest", "today"]


class WorkoutDay(ApiModel):
    day: date
    # done = workout completed; missed = had blocks, not completed; rest = no blocks;
    # today = today, not completed yet
    mark: DayMark


class WorkoutBlockSummary(ApiModel):
    title: str
    state: BlockState


class WorkoutPanel(ApiModel):
    blocks: list[WorkoutBlockSummary]
    done_blocks: int
    state: Literal["empty", "not_started", "in_progress", "done"]
    last_days: list[WorkoutDay]  # 5 days before + today (section 7.5)
    month_completed: int
    month_goal: int  # weekly goal × 4


class BillsPanel(ApiModel):
    """Reminder without values (section 5)."""

    has_bills: bool
    active: bool  # from the configured day of the month on
    all_paid: bool
    next_due_date: date | None
    days_to_next_due: int | None  # negative = overdue


class SpendingPanel(ApiModel):
    percent: int | None  # share of the week's money already used (no values)
    over: bool


class DashboardRead(ApiModel):
    today: date
    kanban: KanbanPanel
    workouts: WorkoutPanel
    bills: BillsPanel
    spending: SpendingPanel

import uuid
from calendar import monthrange
from collections.abc import Sequence
from datetime import date
from itertools import groupby

from pydantic import BaseModel

from app.core.exceptions import InvalidDataError, NotFoundError
from app.modules.workouts.models import (
    BlockState,
    SourceType,
    StandaloneWorkout,
    Steps,
    WorkoutBlock,
    WorkoutProgram,
    WorkoutSession,
)
from app.modules.workouts.repository import WorkoutRepository
from app.modules.workouts.schemas import (
    BlockCreate,
    BlockRead,
    BlockUpdate,
    DayRead,
    HistoryBlock,
    HistoryDay,
    LibraryRead,
    MonthHistory,
    ProgramCreate,
    ProgramRead,
    StandaloneCreate,
    StandaloneRead,
    StandaloneUpdate,
)


def to_json(steps: Sequence[BaseModel]) -> Steps:
    """Pydantic steps -> plain dicts for the JSON column."""
    return [step.model_dump(mode="json") for step in steps]


def is_day_completed(blocks: Sequence[WorkoutBlock]) -> bool:
    """Section 7.5: done when every block is done (a day with no blocks is not a workout)."""
    return bool(blocks) and all(b.state == BlockState.DONE for b in blocks)


class WorkoutService:
    def __init__(self, repo: WorkoutRepository):
        self.repo = repo

    # ---------- Library ----------

    def library(self, user_id: uuid.UUID) -> LibraryRead:
        return LibraryRead(
            programs=[ProgramRead.model_validate(p) for p in self.repo.list_programs(user_id)],
            standalone=[
                StandaloneRead.model_validate(w) for w in self.repo.list_standalone(user_id)
            ],
        )

    def create_program(self, user_id: uuid.UUID, data: ProgramCreate) -> WorkoutProgram:
        program = WorkoutProgram(
            user_id=user_id,
            name=data.name,
            sessions=[WorkoutSession(number=n, steps=[]) for n in range(1, data.session_count + 1)],
        )
        self.repo.add(program)
        self.repo.commit()
        return program

    def rename_program(
        self, user_id: uuid.UUID, program_id: uuid.UUID, name: str
    ) -> WorkoutProgram:
        program = self._get_program(user_id, program_id)
        program.name = name
        self.repo.commit()
        return program

    def delete_program(self, user_id: uuid.UUID, program_id: uuid.UUID) -> None:
        # Days that used its sessions keep their copy of the steps
        self.repo.delete(self._get_program(user_id, program_id))
        self.repo.commit()

    def add_session(
        self, user_id: uuid.UUID, program_id: uuid.UUID, steps: Sequence[BaseModel]
    ) -> WorkoutSession:
        """New session at the end: Dia N+1."""
        program = self._get_program(user_id, program_id)
        session = WorkoutSession(number=len(program.sessions) + 1, steps=to_json(steps))
        program.sessions.append(session)
        self.repo.commit()
        return session

    def update_session(
        self, user_id: uuid.UUID, session_id: uuid.UUID, steps: Sequence[BaseModel]
    ) -> WorkoutSession:
        session = self._get_session(user_id, session_id)
        session.steps = to_json(steps)  # a new list, so SQLAlchemy sees the change
        self.repo.commit()
        return session

    def delete_session(self, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        """Removes a session; the following ones move up (Dia 4 becomes Dia 3...)."""
        session = self._get_session(user_id, session_id)
        program = self.repo.get_program_of(session)
        removed = session.number
        program.sessions.remove(session)  # delete-orphan: the row is deleted
        self.repo.flush()
        # One by one, in order, so (program, number) never repeats in the middle
        for other in sorted(program.sessions, key=lambda s: s.number):
            if other.number > removed:
                other.number -= 1
                self.repo.flush()
        self.repo.commit()

    def create_standalone(self, user_id: uuid.UUID, data: StandaloneCreate) -> StandaloneWorkout:
        workout = StandaloneWorkout(user_id=user_id, name=data.name, steps=to_json(data.steps))
        self.repo.add(workout)
        self.repo.commit()
        return workout

    def update_standalone(
        self, user_id: uuid.UUID, workout_id: uuid.UUID, data: StandaloneUpdate
    ) -> StandaloneWorkout:
        workout = self._get_standalone(user_id, workout_id)
        if data.name is not None:
            workout.name = data.name
        if data.steps is not None:
            workout.steps = to_json(data.steps)
        self.repo.commit()
        return workout

    def delete_standalone(self, user_id: uuid.UUID, workout_id: uuid.UUID) -> None:
        self.repo.delete(self._get_standalone(user_id, workout_id))
        self.repo.commit()

    # ---------- A day ----------

    def get_day(self, user_id: uuid.UUID, day: date, today: date) -> DayRead:
        blocks = self.repo.list_blocks(user_id, day, day)
        return DayRead(
            day=day,
            blocks=[BlockRead.model_validate(b) for b in blocks],
            completed=is_day_completed(blocks),
            read_only=day < today,
        )

    def add_block(
        self, user_id: uuid.UUID, day: date, data: BlockCreate, today: date
    ) -> WorkoutBlock:
        """Puts a library item on a day, copying its steps (section 7.2)."""
        self._ensure_editable(day, today)
        if data.source_type == SourceType.SESSION:
            session = self._get_session(user_id, data.source_id)
            program = self.repo.get_program_of(session)
            title, steps = f"{program.name} · Dia {session.number}", session.steps
        else:
            workout = self._get_standalone(user_id, data.source_id)
            title, steps = workout.name, workout.steps

        block = WorkoutBlock(
            user_id=user_id,
            day=day,
            position=self.repo.next_block_position(user_id, day),
            source_type=data.source_type,
            source_id=data.source_id,
            title=title,
            steps=list(steps),  # a copy: editing the library later doesn't change history
        )
        self.repo.add(block)
        self.repo.commit()
        return block

    def update_block(
        self, user_id: uuid.UUID, block_id: uuid.UUID, data: BlockUpdate, today: date
    ) -> WorkoutBlock:
        block = self._get_block(user_id, block_id)
        self._ensure_editable(block.day, today)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)
        new_state = changes.pop("state", None)

        for field, value in changes.items():
            setattr(block, field, value)

        if new_state == BlockState.NOT_STARTED:
            # Unchecked by hand: starts over
            block.step_index, block.remaining_ms = 0, None
        elif new_state == BlockState.DONE:
            block.remaining_ms = None
        if new_state is not None:
            block.state = new_state
        elif changes and block.state == BlockState.NOT_STARTED:
            # Saving timer progress means the block has started
            block.state = BlockState.IN_PROGRESS

        self.repo.commit()
        return block

    def delete_block(self, user_id: uuid.UUID, block_id: uuid.UUID, today: date) -> None:
        block = self._get_block(user_id, block_id)
        self._ensure_editable(block.day, today)
        self.repo.delete(block)
        self.repo.commit()

    # ---------- History ----------

    def month_history(self, user_id: uuid.UUID, month: str) -> MonthHistory:
        """Which blocks were used on each day of the month (reference only)."""
        year, month_number = (int(part) for part in month.split("-"))
        start = date(year, month_number, 1)
        end = date(year, month_number, monthrange(year, month_number)[1])

        days = []
        # groupby works like Collectors.groupingBy on a list already sorted by day
        for day, group in groupby(self.repo.list_blocks(user_id, start, end), key=lambda b: b.day):
            blocks = list(group)
            days.append(
                HistoryDay(
                    day=day,
                    blocks=[HistoryBlock(title=b.title, state=b.state) for b in blocks],
                    completed=is_day_completed(blocks),
                )
            )
        return MonthHistory(
            month=month, days=days, completed_days=sum(1 for d in days if d.completed)
        )

    # ---------- Helpers ----------

    @staticmethod
    def _ensure_editable(day: date, today: date) -> None:
        if day < today:
            raise InvalidDataError("Past days are read-only")

    def _get_program(self, user_id: uuid.UUID, program_id: uuid.UUID) -> WorkoutProgram:
        program = self.repo.get_program(user_id, program_id)
        if program is None:
            raise NotFoundError("Program not found")
        return program

    def _get_session(self, user_id: uuid.UUID, session_id: uuid.UUID) -> WorkoutSession:
        session = self.repo.get_session(user_id, session_id)
        if session is None:
            raise NotFoundError("Session not found")
        return session

    def _get_standalone(self, user_id: uuid.UUID, workout_id: uuid.UUID) -> StandaloneWorkout:
        workout = self.repo.get_standalone(user_id, workout_id)
        if workout is None:
            raise NotFoundError("Workout not found")
        return workout

    def _get_block(self, user_id: uuid.UUID, block_id: uuid.UUID) -> WorkoutBlock:
        block = self.repo.get_block(user_id, block_id)
        if block is None:
            raise NotFoundError("Block not found")
        return block

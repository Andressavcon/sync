import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.workouts.models import (
    StandaloneWorkout,
    WorkoutBlock,
    WorkoutProgram,
    WorkoutSession,
)


class WorkoutRepository:
    """All workout queries (always filtered by user)."""

    def __init__(self, db: Session):
        self.db = db

    # ---------- Library ----------

    def list_programs(self, user_id: uuid.UUID) -> Sequence[WorkoutProgram]:
        return self.db.scalars(
            select(WorkoutProgram)
            .where(WorkoutProgram.user_id == user_id)
            .order_by(WorkoutProgram.name)
        ).all()

    def get_program(self, user_id: uuid.UUID, program_id: uuid.UUID) -> WorkoutProgram | None:
        return self.db.scalars(
            select(WorkoutProgram).where(
                WorkoutProgram.user_id == user_id, WorkoutProgram.id == program_id
            )
        ).first()

    def get_session(self, user_id: uuid.UUID, session_id: uuid.UUID) -> WorkoutSession | None:
        # The session has no user_id: the program it belongs to tells the owner
        return self.db.scalars(
            select(WorkoutSession)
            .join(WorkoutProgram)
            .where(WorkoutProgram.user_id == user_id, WorkoutSession.id == session_id)
        ).first()

    def get_program_of(self, session: WorkoutSession) -> WorkoutProgram:
        return self.db.get_one(WorkoutProgram, session.program_id)

    def list_standalone(self, user_id: uuid.UUID) -> Sequence[StandaloneWorkout]:
        return self.db.scalars(
            select(StandaloneWorkout)
            .where(StandaloneWorkout.user_id == user_id)
            .order_by(StandaloneWorkout.name)
        ).all()

    def get_standalone(self, user_id: uuid.UUID, workout_id: uuid.UUID) -> StandaloneWorkout | None:
        return self.db.scalars(
            select(StandaloneWorkout).where(
                StandaloneWorkout.user_id == user_id, StandaloneWorkout.id == workout_id
            )
        ).first()

    # ---------- Blocks ----------

    def list_blocks(self, user_id: uuid.UUID, start: date, end: date) -> Sequence[WorkoutBlock]:
        """Blocks with start <= day <= end, by day and position."""
        return self.db.scalars(
            select(WorkoutBlock)
            .where(WorkoutBlock.user_id == user_id, WorkoutBlock.day.between(start, end))
            .order_by(WorkoutBlock.day, WorkoutBlock.position)
        ).all()

    def get_block(self, user_id: uuid.UUID, block_id: uuid.UUID) -> WorkoutBlock | None:
        return self.db.scalars(
            select(WorkoutBlock).where(WorkoutBlock.user_id == user_id, WorkoutBlock.id == block_id)
        ).first()

    def next_block_position(self, user_id: uuid.UUID, day: date) -> int:
        highest = self.db.scalar(
            select(func.max(WorkoutBlock.position)).where(
                WorkoutBlock.user_id == user_id, WorkoutBlock.day == day
            )
        )
        return 0 if highest is None else highest + 1

    # ---------- Unit of work ----------

    def add(self, entity: object) -> None:
        self.db.add(entity)

    def delete(self, entity: object) -> None:
        self.db.delete(entity)

    def flush(self) -> None:
        self.db.flush()

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, entity: object) -> None:
        self.db.refresh(entity)

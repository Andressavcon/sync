import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import CurrentUser
from app.core.clock import Now
from app.core.database import DbSession
from app.modules.workouts.models import (
    StandaloneWorkout,
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
    LibraryRead,
    MonthHistory,
    ProgramCreate,
    ProgramRead,
    ProgramUpdate,
    SessionRead,
    SessionSteps,
    StandaloneCreate,
    StandaloneRead,
    StandaloneUpdate,
)
from app.modules.workouts.service import WorkoutService


def get_workout_service(db: DbSession) -> WorkoutService:
    return WorkoutService(WorkoutRepository(db))


ServiceDep = Annotated[WorkoutService, Depends(get_workout_service)]
MonthParam = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-10"])]

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


# ---------- Library ----------


@router.get("/library", response_model=LibraryRead)
def get_library(user: CurrentUser, service: ServiceDep) -> LibraryRead:
    """Programs (with their sessions) and standalone workouts."""
    return service.library(user.id)


@router.post("/programs", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(data: ProgramCreate, user: CurrentUser, service: ServiceDep) -> WorkoutProgram:
    return service.create_program(user.id, data)


@router.patch("/programs/{program_id}", response_model=ProgramRead)
def rename_program(
    program_id: uuid.UUID, data: ProgramUpdate, user: CurrentUser, service: ServiceDep
) -> WorkoutProgram:
    return service.rename_program(user.id, program_id, data.name)


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(program_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.delete_program(user.id, program_id)


@router.post(
    "/programs/{program_id}/sessions",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
)
def add_session(
    program_id: uuid.UUID, data: SessionSteps, user: CurrentUser, service: ServiceDep
) -> WorkoutSession:
    return service.add_session(user.id, program_id, data.steps)


@router.put("/sessions/{session_id}", response_model=SessionRead)
def update_session(
    session_id: uuid.UUID, data: SessionSteps, user: CurrentUser, service: ServiceDep
) -> WorkoutSession:
    """Replaces the session steps."""
    return service.update_session(user.id, session_id, data.steps)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.delete_session(user.id, session_id)


@router.post("/standalone", response_model=StandaloneRead, status_code=status.HTTP_201_CREATED)
def create_standalone(
    data: StandaloneCreate, user: CurrentUser, service: ServiceDep
) -> StandaloneWorkout:
    return service.create_standalone(user.id, data)


@router.patch("/standalone/{workout_id}", response_model=StandaloneRead)
def update_standalone(
    workout_id: uuid.UUID, data: StandaloneUpdate, user: CurrentUser, service: ServiceDep
) -> StandaloneWorkout:
    return service.update_standalone(user.id, workout_id, data)


@router.delete("/standalone/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_standalone(workout_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.delete_standalone(user.id, workout_id)


# ---------- Days and blocks ----------


@router.get("/days/{day}", response_model=DayRead)
def get_day(day: date, user: CurrentUser, service: ServiceDep, now: Now) -> DayRead:
    return service.get_day(user.id, day, now.date())


@router.post("/days/{day}/blocks", response_model=BlockRead, status_code=status.HTTP_201_CREATED)
def add_block(
    day: date, data: BlockCreate, user: CurrentUser, service: ServiceDep, now: Now
) -> WorkoutBlock:
    return service.add_block(user.id, day, data, now.date())


@router.patch("/blocks/{block_id}", response_model=BlockRead)
def update_block(
    block_id: uuid.UUID, data: BlockUpdate, user: CurrentUser, service: ServiceDep, now: Now
) -> WorkoutBlock:
    """Saves timer progress, or checks/unchecks the block by hand."""
    return service.update_block(user.id, block_id, data, now.date())


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(block_id: uuid.UUID, user: CurrentUser, service: ServiceDep, now: Now) -> None:
    service.delete_block(user.id, block_id, now.date())


# ---------- History ----------


@router.get("/history", response_model=MonthHistory)
def month_history(month: MonthParam, user: CurrentUser, service: ServiceDep) -> MonthHistory:
    return service.month_history(user.id, month)

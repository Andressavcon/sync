import uuid
from datetime import date
from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.core.schemas import ApiModel
from app.modules.workouts.models import BlockState, SourceType

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
RestSec = Annotated[int, Field(ge=0, le=3600)]


# ---------- Steps (section 7.3): three kinds that can be mixed in one block ----------


class TimeStep(ApiModel):
    """Runs by itself: the timer counts down, then the rest, then the next step."""

    type: Literal["time"]
    name: Name
    duration_sec: Annotated[int, Field(ge=1, le=36000)]
    rest_sec: RestSec = 0  # rest after the step


class RepsStep(ApiModel):
    """Each set is finished by hand; the rest between sets runs by itself."""

    type: Literal["reps"]
    name: Name
    sets: Annotated[int, Field(ge=1, le=50)]
    reps: Annotated[int, Field(ge=1, le=1000)]
    rest_sec: RestSec = 0  # rest between sets


class DistanceStep(ApiModel):
    """No timer: checked by hand (the watch controls it on the street)."""

    type: Literal["distance"]
    name: Name
    km: Annotated[float, Field(gt=0, le=1000)]


# The "type" field decides which class is used (like Jackson's @JsonTypeInfo + @JsonSubTypes)
Step = Annotated[TimeStep | RepsStep | DistanceStep, Field(discriminator="type")]


# ---------- Library: programs and sessions ----------


class SessionRead(ApiModel):
    id: uuid.UUID
    number: int
    steps: list[Step]


class ProgramCreate(ApiModel):
    name: Name
    # How many empty sessions to create at once (e.g. 21 for a 21-day program)
    session_count: Annotated[int, Field(ge=0, le=365)] = 0


class ProgramUpdate(ApiModel):
    name: Name


class ProgramRead(ApiModel):
    id: uuid.UUID
    name: str
    sessions: list[SessionRead]


class SessionSteps(ApiModel):
    """Steps of a session or standalone workout (replaces the whole list)."""

    steps: list[Step] = Field(default_factory=list)


# ---------- Library: standalone workouts ----------


class StandaloneCreate(ApiModel):
    name: Name
    steps: list[Step] = Field(default_factory=list)


class StandaloneUpdate(ApiModel):
    name: Name | None = None
    steps: list[Step] | None = None


class StandaloneRead(ApiModel):
    id: uuid.UUID
    name: str
    steps: list[Step]


class LibraryRead(ApiModel):
    programs: list[ProgramRead]
    standalone: list[StandaloneRead]


# ---------- Blocks of a day ----------


class BlockCreate(ApiModel):
    source_type: SourceType
    source_id: uuid.UUID


class BlockUpdate(ApiModel):
    """Timer progress, or the manual check (done / not started)."""

    state: BlockState | None = None
    step_index: Annotated[int, Field(ge=0)] | None = None
    remaining_ms: Annotated[int, Field(ge=0)] | None = None


class BlockRead(ApiModel):
    id: uuid.UUID
    day: date
    position: int
    source_type: SourceType
    source_id: uuid.UUID
    title: str
    steps: list[Step]
    state: BlockState
    step_index: int
    remaining_ms: int | None


class DayRead(ApiModel):
    day: date
    blocks: list[BlockRead]
    # Section 7.5: the day is done when every block is done (and there is at least one)
    completed: bool
    # Past days are only for reference (section 7.2)
    read_only: bool


# ---------- Month history (section 7.2) ----------


class HistoryBlock(ApiModel):
    title: str
    state: BlockState


class HistoryDay(ApiModel):
    day: date
    blocks: list[HistoryBlock]
    completed: bool


class MonthHistory(ApiModel):
    month: str  # yyyy-MM
    days: list[HistoryDay]  # only days that have blocks
    completed_days: int

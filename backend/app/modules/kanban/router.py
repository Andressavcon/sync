import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import CurrentUser
from app.core.clock import Now
from app.core.database import DbSession
from app.modules.kanban.board import Board
from app.modules.kanban.models import Card, RecurrenceRule, Tag
from app.modules.kanban.repository import CardRepository, RecurrenceRepository, TagRepository
from app.modules.kanban.schemas import (
    BoardRead,
    CardCreate,
    CardRead,
    CardUpdate,
    RecurrenceCreate,
    RecurrenceRead,
    RecurrenceUpdate,
    Scope,
    TagCreate,
    TagRead,
    TagUpdate,
)
from app.modules.kanban.service import CardService, RecurrenceService, TagService


# Wiring: build each service with its repositories (constructor injection by hand)
def get_tag_service(db: DbSession) -> TagService:
    return TagService(TagRepository(db))


def get_recurrence_service(db: DbSession) -> RecurrenceService:
    return RecurrenceService(RecurrenceRepository(db), CardRepository(db), TagRepository(db))


def get_card_service(
    db: DbSession, recurrences: Annotated[RecurrenceService, Depends(get_recurrence_service)]
) -> CardService:
    return CardService(CardRepository(db), TagRepository(db), recurrences)


TagServiceDep = Annotated[TagService, Depends(get_tag_service)]
RecurrenceServiceDep = Annotated[RecurrenceService, Depends(get_recurrence_service)]
CardServiceDep = Annotated[CardService, Depends(get_card_service)]
# ?scope=this (default) or ?scope=following, for occurrences of recurring cards
ScopeParam = Annotated[Scope, Query()]

router = APIRouter(prefix="/api", tags=["kanban"])


# ---------- Board ----------


@router.get("/kanban/board", response_model=BoardRead)
def get_board(
    user: CurrentUser,
    service: CardServiceDep,
    now: Now,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
) -> Board:
    """Current week board. Filter by tags with ?tagIds=<id>&tagIds=<id>."""
    return service.board(user.id, now, tag_ids)


# ---------- Tags ----------


@router.get("/tags", response_model=list[TagRead])
def list_tags(user: CurrentUser, service: TagServiceDep) -> Sequence[Tag]:
    return service.list(user.id)


@router.post("/tags", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(data: TagCreate, user: CurrentUser, service: TagServiceDep) -> Tag:
    return service.create(user.id, data)


@router.patch("/tags/{tag_id}", response_model=TagRead)
def update_tag(
    tag_id: uuid.UUID, data: TagUpdate, user: CurrentUser, service: TagServiceDep
) -> Tag:
    return service.update(user.id, tag_id, data)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: uuid.UUID, user: CurrentUser, service: TagServiceDep) -> None:
    service.delete(user.id, tag_id)


# ---------- Cards ----------


@router.get("/cards", response_model=list[CardRead])
def list_cards(user: CurrentUser, service: CardServiceDep) -> Sequence[Card]:
    return service.list(user.id)


@router.get("/cards/{card_id}", response_model=CardRead)
def get_card(card_id: uuid.UUID, user: CurrentUser, service: CardServiceDep) -> Card:
    return service.get(user.id, card_id)


@router.post("/cards", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def create_card(data: CardCreate, user: CurrentUser, service: CardServiceDep) -> Card:
    return service.create(user.id, data)


@router.patch("/cards/{card_id}", response_model=CardRead)
def update_card(
    card_id: uuid.UUID,
    data: CardUpdate,
    user: CurrentUser,
    service: CardServiceDep,
    scope: ScopeParam = Scope.THIS,
) -> Card:
    return service.update(user.id, card_id, data, scope)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: uuid.UUID, user: CurrentUser, service: CardServiceDep, scope: ScopeParam = Scope.THIS
) -> None:
    service.delete(user.id, card_id, scope)


# ---------- Recurrences ----------


@router.get("/recurrences", response_model=list[RecurrenceRead])
def list_recurrences(user: CurrentUser, service: RecurrenceServiceDep) -> Sequence[RecurrenceRule]:
    return service.list(user.id)


@router.get("/recurrences/{rule_id}", response_model=RecurrenceRead)
def get_recurrence(
    rule_id: uuid.UUID, user: CurrentUser, service: RecurrenceServiceDep
) -> RecurrenceRule:
    return service.get(user.id, rule_id)


@router.post("/recurrences", response_model=RecurrenceRead, status_code=status.HTTP_201_CREATED)
def create_recurrence(
    data: RecurrenceCreate, user: CurrentUser, service: RecurrenceServiceDep, now: Now
) -> RecurrenceRule:
    return service.create(user.id, data, now.date())


@router.patch("/recurrences/{rule_id}", response_model=RecurrenceRead)
def update_recurrence(
    rule_id: uuid.UUID,
    data: RecurrenceUpdate,
    user: CurrentUser,
    service: RecurrenceServiceDep,
    now: Now,
) -> RecurrenceRule:
    return service.update(user.id, rule_id, data, now.date())


@router.delete("/recurrences/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurrence(
    rule_id: uuid.UUID, user: CurrentUser, service: RecurrenceServiceDep, now: Now
) -> None:
    service.delete(user.id, rule_id, now.date())

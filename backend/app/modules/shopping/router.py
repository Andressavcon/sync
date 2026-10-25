import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import CurrentUser
from app.core.clock import UtcNow
from app.core.database import DbSession
from app.modules.shopping.models import ArchivedList, ShoppingCategory, ShoppingItem
from app.modules.shopping.repository import ShoppingRepository
from app.modules.shopping.schemas import (
    ArchivedListRead,
    CategoryCreate,
    CategoryOrder,
    CategoryRead,
    CategoryUpdate,
    ItemCreate,
    ItemRead,
    ItemUpdate,
    ShoppingListRead,
)
from app.modules.shopping.service import ShoppingService


def get_shopping_service(db: DbSession) -> ShoppingService:
    return ShoppingService(ShoppingRepository(db))


ServiceDep = Annotated[ShoppingService, Depends(get_shopping_service)]

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


# ---------- The active list ----------


@router.get("/list", response_model=ShoppingListRead)
def get_list(user: CurrentUser, service: ServiceDep) -> ShoppingListRead:
    """Important section on top, then each category with its items."""
    return service.get_list(user.id)


@router.post("/list/complete", response_model=ArchivedListRead, status_code=status.HTTP_201_CREATED)
def complete_list(user: CurrentUser, service: ServiceDep, now: UtcNow) -> ArchivedList:
    """Archives the list. Checked items leave; unchecked ones stay for the next purchase."""
    return service.complete_list(user.id, now)


# ---------- Archive and suggestions ----------


@router.get("/archives", response_model=list[ArchivedListRead])
def list_archives(user: CurrentUser, service: ServiceDep, now: UtcNow) -> Sequence[ArchivedList]:
    return service.list_archives(user.id, now)


@router.get("/suggestions", response_model=list[str])
def suggestions(
    user: CurrentUser, service: ServiceDep, now: UtcNow, q: Annotated[str, Query()] = ""
) -> list[str]:
    """Names from archived lists containing `q`, most frequent first."""
    return service.suggestions(user.id, q, now)


# ---------- Categories ----------


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(user: CurrentUser, service: ServiceDep) -> Sequence[ShoppingCategory]:
    return service.list_categories(user.id)


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate, user: CurrentUser, service: ServiceDep
) -> ShoppingCategory:
    return service.create_category(user.id, data)


@router.put("/categories/order", response_model=list[CategoryRead])
def reorder_categories(
    data: CategoryOrder, user: CurrentUser, service: ServiceDep
) -> Sequence[ShoppingCategory]:
    return service.reorder_categories(user.id, data.category_ids)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def rename_category(
    category_id: uuid.UUID, data: CategoryUpdate, user: CurrentUser, service: ServiceDep
) -> ShoppingCategory:
    return service.rename_category(user.id, category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.delete_category(user.id, category_id)


# ---------- Items ----------


@router.post("/items", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(data: ItemCreate, user: CurrentUser, service: ServiceDep) -> ShoppingItem:
    return service.create_item(user.id, data)


@router.patch("/items/{item_id}", response_model=ItemRead)
def update_item(
    item_id: uuid.UUID, data: ItemUpdate, user: CurrentUser, service: ServiceDep, now: UtcNow
) -> ShoppingItem:
    return service.update_item(user.id, item_id, data, now)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    service.delete_item(user.id, item_id)

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.core.schemas import ApiModel

CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Quantity = Annotated[str, StringConstraints(strip_whitespace=True, max_length=30)]


# ---------- Categories ----------


class CategoryCreate(ApiModel):
    name: CategoryName


class CategoryUpdate(ApiModel):
    name: CategoryName


class CategoryOrder(ApiModel):
    """All the user's category ids, in the new order."""

    category_ids: list[uuid.UUID]


class CategoryRead(ApiModel):
    id: uuid.UUID
    name: str
    position: int


# ---------- Items ----------


class ItemCreate(ApiModel):
    name: ItemName
    quantity: Quantity = ""
    category_id: uuid.UUID
    important: bool = False


class ItemUpdate(ApiModel):
    """PATCH: only the fields sent are changed."""

    name: ItemName | None = None
    quantity: Quantity | None = None
    category_id: uuid.UUID | None = None
    important: bool | None = None
    purchased: bool | None = None


class ItemRead(ApiModel):
    id: uuid.UUID
    name: str
    quantity: str
    category_id: uuid.UUID
    important: bool
    purchased: bool


# ---------- The active list, ready to show ----------


class CategoryWithItems(ApiModel):
    category: CategoryRead
    items: list[ItemRead]  # without the important ones: they are in the top section


class ShoppingListRead(ApiModel):
    important: list[ItemRead]  # one section on top, mixing every category
    categories: list[CategoryWithItems]
    total_items: int
    purchased_items: int


# ---------- Archived lists ----------


class ArchivedItemRead(ApiModel):
    name: str
    quantity: str
    category_name: str
    important: bool
    purchased: bool


class ArchivedListRead(ApiModel):
    id: uuid.UUID
    completed_at: datetime
    items: list[ArchivedItemRead] = Field(default_factory=list)

import uuid
from collections import Counter
from collections.abc import Sequence
from datetime import datetime, timedelta

from app.core.exceptions import ConflictError, InvalidDataError, NotFoundError
from app.modules.shopping.models import ArchivedItem, ArchivedList, ShoppingCategory, ShoppingItem
from app.modules.shopping.repository import ShoppingRepository
from app.modules.shopping.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryWithItems,
    ItemCreate,
    ItemRead,
    ItemUpdate,
    ShoppingListRead,
)
from app.modules.users.models import User

ARCHIVE_DAYS = 90  # archived lists are deleted after this
MAX_SUGGESTIONS = 8
# Created once for every new user; editable and reorderable
DEFAULT_CATEGORIES = [
    "Hortifruti",
    "Açougue",
    "Padaria",
    "Laticínios",
    "Mercearia",
    "Limpeza",
    "Higiene",
    "Outros",
]


def _list_order(item: ShoppingItem) -> tuple[bool, float, float]:
    """Unchecked first (in the order added), then checked ones (in the order checked)."""
    checked_at = item.purchased_at.timestamp() if item.purchased_at else 0.0
    return item.purchased, checked_at, item.created_at.timestamp()


class ShoppingService:
    def __init__(self, repo: ShoppingRepository):
        self.repo = repo

    # ---------- The active list ----------

    def get_list(self, user: User) -> ShoppingListRead:
        """The list ready to show: important section on top, then each category."""
        self._create_default_categories_once(user)
        user_id = user.id
        categories = self.repo.list_categories(user_id)
        items = sorted(self.repo.list_items(user_id), key=_list_order)

        important = [ItemRead.model_validate(i) for i in items if i.important]
        by_category = [
            CategoryWithItems.model_validate(
                {
                    "category": category,
                    "items": [i for i in items if i.category_id == category.id and not i.important],
                }
            )
            for category in categories
        ]
        return ShoppingListRead(
            important=important,
            categories=by_category,
            total_items=len(items),
            purchased_items=sum(1 for i in items if i.purchased),
        )

    def complete_list(self, user_id: uuid.UUID, now: datetime) -> ArchivedList:
        """Archives a copy of the list; checked items leave, unchecked ones stay for next time."""
        items = sorted(self.repo.list_items(user_id), key=_list_order)
        if not items:
            raise InvalidDataError("The list is empty")

        archived = ArchivedList(
            user_id=user_id,
            completed_at=now,
            items=[
                ArchivedItem(
                    position=index,
                    name=item.name,
                    quantity=item.quantity,
                    category_name=item.category.name,
                    important=item.important,
                    purchased=item.purchased,
                )
                for index, item in enumerate(items)
            ],
        )
        self.repo.add(archived)
        for item in items:
            if item.purchased:
                self.repo.delete(item)
        self._forget_old_archives(user_id, now)
        self.repo.commit()
        self.repo.refresh(archived)
        return archived

    # ---------- Archive and suggestions ----------

    def list_archives(self, user_id: uuid.UUID, now: datetime) -> Sequence[ArchivedList]:
        self._forget_old_archives(user_id, now)
        self.repo.commit()
        return self.repo.list_archives(user_id)

    def suggestions(self, user_id: uuid.UUID, query: str, now: datetime) -> list[str]:
        """Item names from archived lists, most frequent first.

        Skips what is already on the active list.
        """
        self._forget_old_archives(user_id, now)
        self.repo.commit()

        on_list = {item.name.lower() for item in self.repo.list_items(user_id)}
        query = query.strip().lower()

        # Counter: a dict that counts ({"leite": 5, "pão": 3}); like Map<String, Long> + groupingBy
        counts: Counter[str] = Counter()
        spelling: dict[str, str] = {}  # lowercase -> how it was written last time
        for name in self.repo.archived_item_names(user_id):
            key = name.lower()
            if query in key and key not in on_list:
                counts[key] += 1
                spelling.setdefault(key, name)

        return [spelling[key] for key, _ in counts.most_common(MAX_SUGGESTIONS)]

    def _create_default_categories_once(self, user: User) -> None:
        if user.shopping_defaults_created:
            return
        existing = {c.name.lower() for c in self.repo.list_categories(user.id)}
        position = self.repo.next_category_position(user.id)
        for name in DEFAULT_CATEGORIES:
            if name.lower() not in existing:
                self.repo.add(ShoppingCategory(user_id=user.id, name=name, position=position))
                position += 1
        user.shopping_defaults_created = True
        self.repo.commit()

    def _forget_old_archives(self, user_id: uuid.UUID, now: datetime) -> None:
        self.repo.delete_archives_before(user_id, now - timedelta(days=ARCHIVE_DAYS))

    # ---------- Categories ----------

    def list_categories(self, user_id: uuid.UUID) -> Sequence[ShoppingCategory]:
        return self.repo.list_categories(user_id)

    def create_category(self, user_id: uuid.UUID, data: CategoryCreate) -> ShoppingCategory:
        self._ensure_category_name_is_free(user_id, data.name)
        category = ShoppingCategory(
            user_id=user_id, name=data.name, position=self.repo.next_category_position(user_id)
        )
        self.repo.add(category)
        self.repo.commit()
        return category

    def rename_category(
        self, user_id: uuid.UUID, category_id: uuid.UUID, data: CategoryUpdate
    ) -> ShoppingCategory:
        category = self._get_category(user_id, category_id)
        self._ensure_category_name_is_free(user_id, data.name, ignore_id=category.id)
        category.name = data.name
        self.repo.commit()
        return category

    def delete_category(self, user_id: uuid.UUID, category_id: uuid.UUID) -> None:
        # Its items go too (ON DELETE CASCADE); the app asks for confirmation first
        self.repo.delete(self._get_category(user_id, category_id))
        self.repo.commit()

    def reorder_categories(
        self, user_id: uuid.UUID, category_ids: list[uuid.UUID]
    ) -> Sequence[ShoppingCategory]:
        """New order of the categories (the order of the market aisles)."""
        categories = {c.id: c for c in self.repo.list_categories(user_id)}
        if len(category_ids) != len(set(category_ids)) or set(category_ids) != set(categories):
            raise InvalidDataError("Send every category exactly once")
        for position, category_id in enumerate(category_ids):
            categories[category_id].position = position
        self.repo.commit()
        return self.repo.list_categories(user_id)

    def _get_category(self, user_id: uuid.UUID, category_id: uuid.UUID) -> ShoppingCategory:
        category = self.repo.get_category(user_id, category_id)
        if category is None:
            raise NotFoundError("Category not found")
        return category

    def _ensure_category_name_is_free(
        self, user_id: uuid.UUID, name: str, ignore_id: uuid.UUID | None = None
    ) -> None:
        existing = self.repo.find_category_by_name(user_id, name)
        if existing is not None and existing.id != ignore_id:
            raise ConflictError(f'A category named "{name}" already exists')

    # ---------- Items ----------

    def create_item(self, user_id: uuid.UUID, data: ItemCreate) -> ShoppingItem:
        self._ensure_category_exists(user_id, data.category_id)
        item = ShoppingItem(
            user_id=user_id,
            category_id=data.category_id,
            name=data.name,
            quantity=data.quantity,
            important=data.important,
        )
        self.repo.add(item)
        self.repo.commit()
        return item

    def update_item(
        self, user_id: uuid.UUID, item_id: uuid.UUID, data: ItemUpdate, now: datetime
    ) -> ShoppingItem:
        item = self._get_item(user_id, item_id)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)

        if "category_id" in changes:
            self._ensure_category_exists(user_id, changes["category_id"])
        if "purchased" in changes and changes["purchased"] != item.purchased:
            item.purchased_at = now if changes["purchased"] else None

        for field, value in changes.items():
            setattr(item, field, value)
        self.repo.commit()
        return item

    def delete_item(self, user_id: uuid.UUID, item_id: uuid.UUID) -> None:
        self.repo.delete(self._get_item(user_id, item_id))
        self.repo.commit()

    def _get_item(self, user_id: uuid.UUID, item_id: uuid.UUID) -> ShoppingItem:
        item = self.repo.get_item(user_id, item_id)
        if item is None:
            raise NotFoundError("Item not found")
        return item

    def _ensure_category_exists(self, user_id: uuid.UUID, category_id: uuid.UUID) -> None:
        if self.repo.get_category(user_id, category_id) is None:
            raise InvalidDataError("Category does not exist")

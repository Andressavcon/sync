import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.modules.shopping.models import ArchivedItem, ArchivedList, ShoppingCategory, ShoppingItem


class ShoppingRepository:
    """All shopping list queries (always filtered by user)."""

    def __init__(self, db: Session):
        self.db = db

    # ---------- Categories ----------

    def list_categories(self, user_id: uuid.UUID) -> Sequence[ShoppingCategory]:
        return self.db.scalars(
            select(ShoppingCategory)
            .where(ShoppingCategory.user_id == user_id)
            .order_by(ShoppingCategory.position, ShoppingCategory.name)
        ).all()

    def get_category(self, user_id: uuid.UUID, category_id: uuid.UUID) -> ShoppingCategory | None:
        return self.db.scalars(
            select(ShoppingCategory).where(
                ShoppingCategory.user_id == user_id, ShoppingCategory.id == category_id
            )
        ).first()

    def find_category_by_name(self, user_id: uuid.UUID, name: str) -> ShoppingCategory | None:
        return self.db.scalars(
            select(ShoppingCategory).where(
                ShoppingCategory.user_id == user_id,
                func.lower(ShoppingCategory.name) == name.lower(),
            )
        ).first()

    def next_category_position(self, user_id: uuid.UUID) -> int:
        highest = self.db.scalar(
            select(func.max(ShoppingCategory.position)).where(ShoppingCategory.user_id == user_id)
        )
        return 0 if highest is None else highest + 1

    # ---------- Items ----------

    def list_items(self, user_id: uuid.UUID) -> Sequence[ShoppingItem]:
        return self.db.scalars(
            select(ShoppingItem)
            .where(ShoppingItem.user_id == user_id)
            .order_by(ShoppingItem.created_at)
        ).all()

    def get_item(self, user_id: uuid.UUID, item_id: uuid.UUID) -> ShoppingItem | None:
        return self.db.scalars(
            select(ShoppingItem).where(ShoppingItem.user_id == user_id, ShoppingItem.id == item_id)
        ).first()

    # ---------- Archive ----------

    def list_archives(self, user_id: uuid.UUID) -> Sequence[ArchivedList]:
        return self.db.scalars(
            select(ArchivedList)
            .where(ArchivedList.user_id == user_id)
            .order_by(ArchivedList.completed_at.desc())
        ).all()

    def archived_item_names(self, user_id: uuid.UUID) -> Sequence[str]:
        """Every item name in the user's archived lists, newest list first."""
        return self.db.scalars(
            select(ArchivedItem.name)
            .join(ArchivedList)
            .where(ArchivedList.user_id == user_id)
            .order_by(ArchivedList.completed_at.desc())
        ).all()

    def delete_archives_before(self, user_id: uuid.UUID, limit: datetime) -> None:
        # The archived items go too (ON DELETE CASCADE in the database)
        self.db.execute(
            delete(ArchivedList).where(
                ArchivedList.user_id == user_id, ArchivedList.completed_at < limit
            )
        )

    # ---------- Unit of work ----------

    def add(self, entity: object) -> None:
        self.db.add(entity)

    def delete(self, entity: object) -> None:
        self.db.delete(entity)

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, entity: object) -> None:
        self.db.refresh(entity)

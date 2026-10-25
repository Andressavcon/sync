import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin, utc_now


class ShoppingCategory(IdMixin, Base):
    """Hortifruti, Açougue, Limpeza... in the order of the market aisles."""

    __tablename__ = "shopping_categories"
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    position: Mapped[int] = mapped_column(default=0)


class ShoppingItem(IdMixin, CreatedAtMixin, Base):
    """An item of the single active list."""

    __tablename__ = "shopping_items"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shopping_categories.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[str] = mapped_column(String(30), default="")  # free text: "2 kg", "3"
    important: Mapped[bool] = mapped_column(default=False)
    purchased: Mapped[bool] = mapped_column(default=False)
    # When it was checked: checked items go to the end in that order
    purchased_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    category: Mapped[ShoppingCategory] = relationship(lazy="selectin")


class ArchivedList(IdMixin, Base):
    """A completed list, kept only for reference and suggestions."""

    __tablename__ = "shopping_archived_lists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Like @OneToMany(cascade = ALL, orphanRemoval = true)
    items: Mapped[list[ArchivedItem]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by="ArchivedItem.position"
    )


class ArchivedItem(IdMixin, Base):
    """Copy of an item when the list was completed (later edits don't change history)."""

    __tablename__ = "shopping_archived_items"

    list_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shopping_archived_lists.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(default=0)
    name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[str] = mapped_column(String(30), default="")
    category_name: Mapped[str] = mapped_column(String(50))
    important: Mapped[bool] = mapped_column(default=False)
    purchased: Mapped[bool] = mapped_column(default=False)

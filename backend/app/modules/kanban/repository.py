import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.kanban.models import Card, Tag


class TagRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: uuid.UUID) -> Sequence[Tag]:
        return self.db.scalars(select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)).all()

    def get(self, user_id: uuid.UUID, tag_id: uuid.UUID) -> Tag | None:
        return self.db.scalars(select(Tag).where(Tag.user_id == user_id, Tag.id == tag_id)).first()

    def get_many(self, user_id: uuid.UUID, tag_ids: list[uuid.UUID]) -> Sequence[Tag]:
        if not tag_ids:
            return []
        return self.db.scalars(select(Tag).where(Tag.user_id == user_id, Tag.id.in_(tag_ids))).all()

    def find_by_name(self, user_id: uuid.UUID, name: str) -> Tag | None:
        # Case-insensitive: "Casa" and "casa" are the same tag
        return self.db.scalars(
            select(Tag).where(Tag.user_id == user_id, func.lower(Tag.name) == name.lower())
        ).first()

    def add(self, tag: Tag) -> Tag:
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def save(self, tag: Tag) -> Tag:
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def delete(self, tag: Tag) -> None:
        self.db.delete(tag)
        self.db.commit()


class CardRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: uuid.UUID) -> Sequence[Card]:
        return self.db.scalars(
            select(Card).where(Card.user_id == user_id).order_by(Card.due_date, Card.due_time)
        ).all()

    def get(self, user_id: uuid.UUID, card_id: uuid.UUID) -> Card | None:
        return self.db.scalars(
            select(Card).where(Card.user_id == user_id, Card.id == card_id)
        ).first()

    def add(self, card: Card) -> Card:
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def save(self, card: Card) -> Card:
        self.db.commit()
        self.db.refresh(card)
        return card

    def delete(self, card: Card) -> None:
        self.db.delete(card)
        self.db.commit()

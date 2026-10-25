import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.kanban.models import Card, CardStatus, RecurrenceRule, Tag


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

    def list(self, user_id: uuid.UUID, tag_ids: list[uuid.UUID] | None = None) -> Sequence[Card]:
        """All the user's cards; with tag_ids, only cards that have at least one of them."""
        query = select(Card).where(Card.user_id == user_id)
        if tag_ids:
            query = query.where(Card.tags.any(Tag.id.in_(tag_ids)))
        return self.db.scalars(query.order_by(Card.due_date, Card.due_time)).all()

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

    def add_all(self, cards: list[Card]) -> None:
        """Stages new cards; the caller commits."""
        self.db.add_all(cards)

    def open_occurrences(self, recurrence_id: uuid.UUID, from_date: date) -> Sequence[Card]:
        """Occurrences of a rule from `from_date` on that are not done yet."""
        return self.db.scalars(
            select(Card).where(
                Card.recurrence_id == recurrence_id,
                Card.occurrence_date >= from_date,
                Card.status != CardStatus.DONE,
            )
        ).all()

    def occurrence_dates(self, recurrence_id: uuid.UUID, from_date: date) -> set[date]:
        """Dates that already have an occurrence (done or not), to never create duplicates."""
        return set(
            self.db.scalars(
                select(Card.occurrence_date).where(
                    Card.recurrence_id == recurrence_id, Card.occurrence_date >= from_date
                )
            ).all()
        )

    def delete_many(self, cards: Sequence[Card]) -> None:
        """Stages the deletion; the caller commits."""
        for card in cards:
            self.db.delete(card)

    def flush(self) -> None:
        """Sends pending changes to the database without committing (e.g. deletes first)."""
        self.db.flush()


class RecurrenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: uuid.UUID) -> Sequence[RecurrenceRule]:
        return self.db.scalars(
            select(RecurrenceRule)
            .where(RecurrenceRule.user_id == user_id)
            .order_by(RecurrenceRule.title)
        ).all()

    def get(self, user_id: uuid.UUID, rule_id: uuid.UUID) -> RecurrenceRule | None:
        return self.db.scalars(
            select(RecurrenceRule).where(
                RecurrenceRule.user_id == user_id, RecurrenceRule.id == rule_id
            )
        ).first()

    def add(self, rule: RecurrenceRule) -> None:
        """Stages the new rule; the caller commits."""
        self.db.add(rule)

    def delete(self, rule: RecurrenceRule) -> None:
        """Stages the deletion; the caller commits."""
        self.db.delete(rule)

    def commit(self) -> None:
        self.db.commit()

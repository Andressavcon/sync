from datetime import date, time

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.kanban.models import Card, CardStatus, Tag
from app.modules.users.models import User


def test_card_is_saved_with_defaults_and_tags(db: Session, user: User):
    work = Tag(user_id=user.id, name="Work")
    card = Card(
        user_id=user.id,
        title="Send proposal",
        due_date=date(2026, 10, 30),
        due_time=time(17, 0),
        tags=[work],
    )
    db.add(card)
    db.commit()

    saved = db.scalars(select(Card)).one()
    assert saved.status == CardStatus.PENDING
    assert saved.content == ""
    assert saved.completed_at is None
    assert saved.created_at is not None
    assert [t.name for t in saved.tags] == ["Work"]


def test_same_user_cannot_repeat_tag_name(db: Session, user: User):
    db.add_all([Tag(user_id=user.id, name="Home"), Tag(user_id=user.id, name="Home")])

    with pytest.raises(IntegrityError):
        db.commit()


def test_deleting_tag_keeps_the_card(db: Session, user: User):
    tag = Tag(user_id=user.id, name="Study")
    db.add(
        Card(
            user_id=user.id,
            title="English",
            due_date=date(2026, 10, 30),
            due_time=time(19, 0),
            tags=[tag],
        )
    )
    db.commit()

    db.delete(tag)
    db.commit()
    db.expire_all()  # forget cached objects and read again from the database

    card = db.scalars(select(Card)).one()
    assert card.tags == []


def test_deleting_user_deletes_their_cards(db: Session, user: User):
    db.add(
        Card(user_id=user.id, title="Dentist", due_date=date(2026, 10, 28), due_time=time(14, 0))
    )
    db.commit()

    db.delete(user)
    db.commit()

    assert db.scalars(select(Card)).all() == []

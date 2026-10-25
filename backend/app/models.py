"""Imports every table so SQLAlchemy and Alembic know all of them.

Add a line here whenever a new module gets a models.py.
"""

from app.modules.kanban.models import Card, RecurrenceRule, Tag, card_tags, recurrence_tags
from app.modules.shopping.models import ArchivedItem, ArchivedList, ShoppingCategory, ShoppingItem
from app.modules.users.models import User
from app.modules.workouts.models import (
    StandaloneWorkout,
    WorkoutBlock,
    WorkoutProgram,
    WorkoutSession,
)

__all__ = [
    "ArchivedItem",
    "ArchivedList",
    "Card",
    "RecurrenceRule",
    "ShoppingCategory",
    "ShoppingItem",
    "StandaloneWorkout",
    "Tag",
    "User",
    "WorkoutBlock",
    "WorkoutProgram",
    "WorkoutSession",
    "card_tags",
    "recurrence_tags",
]

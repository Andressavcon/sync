"""Imports every table so SQLAlchemy and Alembic know all of them.

Add a line here whenever a new module gets a models.py.
"""

from app.modules.kanban.models import Card, RecurrenceRule, Tag, card_tags, recurrence_tags
from app.modules.users.models import User

__all__ = ["Card", "RecurrenceRule", "Tag", "User", "card_tags", "recurrence_tags"]

"""Imports every table so SQLAlchemy and Alembic know all of them.

Add a line here whenever a new module gets a models.py.
"""

from app.modules.kanban.models import Card, Tag, card_tags
from app.modules.users.models import User

__all__ = ["Card", "Tag", "User", "card_tags"]

"""add Outros shopping category to existing users

Revision ID: acf01c2e36c4
Revises: 9bad4bfab40d
Create Date: 2026-10-25 13:41:32.017346

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'acf01c2e36c4'
down_revision: Union[str, Sequence[str], None] = '9bad4bfab40d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORY_NAME = "Outros"

# Data migration: lightweight table definitions (not the app models, which change over time)
users = sa.table(
    "users",
    sa.column("id", sa.Uuid()),
    sa.column("shopping_defaults_created", sa.Boolean()),
)
categories = sa.table(
    "shopping_categories",
    sa.column("id", sa.Uuid()),
    sa.column("user_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("position", sa.Integer()),
)


def upgrade() -> None:
    """New users get "Outros" with the defaults; users who already got them get it now, last."""
    connection = op.get_bind()
    user_ids = connection.execute(
        sa.select(users.c.id).where(users.c.shopping_defaults_created == sa.true())
    ).scalars()
    for user_id in list(user_ids):
        names = connection.execute(
            sa.select(sa.func.lower(categories.c.name)).where(categories.c.user_id == user_id)
        ).scalars()
        if CATEGORY_NAME.lower() in set(names):
            continue
        last_position = connection.execute(
            sa.select(sa.func.max(categories.c.position)).where(categories.c.user_id == user_id)
        ).scalar()
        connection.execute(
            categories.insert().values(
                id=uuid.uuid4(),
                user_id=user_id,
                name=CATEGORY_NAME,
                position=(last_position + 1) if last_position is not None else 0,
            )
        )


def downgrade() -> None:
    """Nothing to undo: the category may already have items, and users can delete it."""
    pass

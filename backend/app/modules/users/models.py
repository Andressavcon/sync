from sqlalchemy import String, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class User(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "users"
    # Named: SQLite migrations (batch mode) need constraint names
    __table_args__ = (UniqueConstraint("auth_id", name="uq_users_auth_id"),)

    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    # Id given by the login provider (Supabase "sub"); empty for the development user
    auth_id: Mapped[str | None] = mapped_column(String(64))
    # Default shopping categories were created once (never again, even if all are deleted)
    shopping_defaults_created: Mapped[bool] = mapped_column(default=False, server_default=false())

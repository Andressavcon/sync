from sqlalchemy import String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class User(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    # Default shopping categories were created once (never again, even if all are deleted)
    shopping_defaults_created: Mapped[bool] = mapped_column(default=False, server_default=false())

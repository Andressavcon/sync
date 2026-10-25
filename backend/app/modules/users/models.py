from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import CreatedAtMixin, IdMixin


class User(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255))

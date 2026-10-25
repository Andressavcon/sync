from typing import Annotated

from fastapi import Depends
from sqlalchemy import select

from app.core.database import DbSession
from app.modules.users.models import User

DEV_USER_EMAIL = "dev@sync.local"


def get_current_user(db: DbSession) -> User:
    """The logged-in user.

    Until Google login exists (section 11), everyone is a fixed development user,
    created on the first request.
    """
    user = db.scalars(select(User).where(User.email == DEV_USER_EMAIL)).first()
    if user is None:
        user = User(email=DEV_USER_EMAIL, name="Dev User")
        db.add(user)
        db.commit()
    return user


# Shortcut for endpoints: `user: CurrentUser`
CurrentUser = Annotated[User, Depends(get_current_user)]

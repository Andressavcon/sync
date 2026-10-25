from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select

from app.core.database import DbSession
from app.core.exceptions import UnauthorizedError
from app.core.security import InvalidTokenError, TokenVerifier, get_token_verifier
from app.modules.users.models import User

DEV_USER_EMAIL = "dev@sync.local"

Verifier = Annotated[TokenVerifier | None, Depends(get_token_verifier)]


def get_current_user(
    db: DbSession,
    verifier: Verifier,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """The logged-in user (section 11).

    Development mode (no Supabase configured): a fixed user, created on the first request.
    With login: the "Authorization: Bearer <token>" header is required and checked.
    """
    if verifier is None:
        return _dev_user(db)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Login required")
    try:
        claims = verifier.verify(authorization.split(" ", 1)[1])
    except InvalidTokenError as error:
        raise UnauthorizedError("Invalid or expired login") from error
    return _user_from_claims(db, claims)


def _dev_user(db: DbSession) -> User:
    user = db.scalars(select(User).where(User.email == DEV_USER_EMAIL)).first()
    if user is None:
        user = User(email=DEV_USER_EMAIL, name="Dev User")
        db.add(user)
        db.commit()
    return user


def _user_from_claims(db: DbSession, claims: dict) -> User:
    """Finds the user by the login id; first login creates it (or links it by e-mail)."""
    auth_id = str(claims.get("sub", ""))
    email = str(claims.get("email", "")).lower()
    if not auth_id or not email:
        raise UnauthorizedError("The login has no user id or e-mail")

    user = db.scalars(select(User).where(User.auth_id == auth_id)).first()
    if user is None:
        user = db.scalars(select(User).where(User.email == email)).first()
        if user is None:
            metadata = claims.get("user_metadata") or {}
            name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
            user = User(email=email, name=name)
            db.add(user)
        user.auth_id = auth_id
        db.commit()
    return user


# Shortcut for endpoints: `user: CurrentUser`
CurrentUser = Annotated[User, Depends(get_current_user)]

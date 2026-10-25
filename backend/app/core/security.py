"""Login token check.

Google login happens in the frontend through Supabase Auth, which gives a signed JWT.
The backend only checks the signature with Supabase's public keys (JWKS) and reads who
the user is. Without SUPABASE_URL configured, there is no login (development mode).
"""

from functools import lru_cache
from typing import Any, Protocol

import jwt

from app.core.config import settings

AUDIENCE = "authenticated"  # Supabase puts this in tokens of logged-in users


class InvalidTokenError(Exception):
    pass


class TokenVerifier(Protocol):
    def verify(self, token: str) -> dict[str, Any]:
        """The token's claims (sub, email, ...) or InvalidTokenError."""
        ...


class SupabaseTokenVerifier:
    """Checks tokens signed by the Supabase project (asymmetric keys from its JWKS)."""

    def __init__(self, supabase_url: str):
        self.jwks = jwt.PyJWKClient(f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")

    def verify(self, token: str) -> dict[str, Any]:
        try:
            key = self.jwks.get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience=AUDIENCE)
        except jwt.PyJWTError as error:
            raise InvalidTokenError(str(error)) from error


@lru_cache
def _supabase_verifier(url: str) -> SupabaseTokenVerifier:
    # One per URL for the whole app: PyJWKClient caches the public keys
    return SupabaseTokenVerifier(url)


def get_token_verifier() -> TokenVerifier | None:
    """None = development mode (no login). Tests replace this dependency."""
    if not settings.supabase_url:
        return None
    return _supabase_verifier(settings.supabase_url)

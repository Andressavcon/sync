"""Login with tokens, without a real Supabase: tokens signed with a local key."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import AUDIENCE, InvalidTokenError, get_token_verifier
from app.main import app

PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class LocalVerifier:
    """Same checks as SupabaseTokenVerifier, with a key we control."""

    def verify(self, token: str) -> dict[str, Any]:
        try:
            return jwt.decode(
                token, PRIVATE_KEY.public_key(), algorithms=["RS256"], audience=AUDIENCE
            )
        except jwt.PyJWTError as error:
            raise InvalidTokenError(str(error)) from error


def token(sub: str, email: str, expires_in: timedelta = timedelta(hours=1), **extra) -> str:
    claims = {
        "sub": sub,
        "email": email,
        "aud": AUDIENCE,
        "exp": datetime.now(UTC) + expires_in,
        "user_metadata": {"full_name": "Andressa"},
    } | extra
    return jwt.encode(claims, PRIVATE_KEY, algorithm="RS256")


def bearer(value: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {value}"}


@pytest.fixture(autouse=True)
def login_enabled(client: TestClient):
    app.dependency_overrides[get_token_verifier] = LocalVerifier


def test_requests_without_login_are_refused(client: TestClient):
    response = client.get("/api/tags")

    assert response.status_code == 401
    assert response.json() == {"detail": "Login required"}


def test_invalid_and_expired_tokens_are_refused(client: TestClient):
    assert client.get("/api/tags", headers=bearer("not-a-token")).status_code == 401
    expired = token("user-1", "a@x.com", expires_in=timedelta(minutes=-1))
    assert client.get("/api/tags", headers=bearer(expired)).status_code == 401


def test_token_signed_by_someone_else_is_refused(client: TestClient):
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode(
        {
            "sub": "x",
            "email": "x@x.com",
            "aud": AUDIENCE,
            "exp": datetime.now(UTC) + timedelta(hours=1),
        },
        other_key,
        algorithm="RS256",
    )

    assert client.get("/api/tags", headers=bearer(forged)).status_code == 401


def test_first_login_creates_the_user_and_next_ones_reuse_it(client: TestClient):
    headers = bearer(token("google-123", "Andressa@Example.com"))

    client.post("/api/tags", json={"name": "Trabalho"}, headers=headers)
    tags = client.get("/api/tags", headers=headers).json()

    assert [t["name"] for t in tags] == ["Trabalho"]


def test_each_user_sees_only_their_own_data(client: TestClient):
    ana = bearer(token("user-ana", "ana@x.com"))
    bia = bearer(token("user-bia", "bia@x.com"))
    client.post("/api/tags", json={"name": "Da Ana"}, headers=ana)
    tag_id = client.get("/api/tags", headers=ana).json()[0]["id"]

    assert client.get("/api/tags", headers=bia).json() == []
    # Not even by id
    assert client.delete(f"/api/tags/{tag_id}", headers=bia).status_code == 404


def test_health_does_not_need_login(client: TestClient):
    assert client.get("/health").status_code == 200

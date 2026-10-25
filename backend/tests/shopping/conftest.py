from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_utc_now
from app.main import app

START = datetime(2026, 10, 28, 18, 0, tzinfo=UTC)


@pytest.fixture(autouse=True)
def set_utc_now(client: TestClient) -> Callable[[datetime], None]:
    """Fixed UTC clock for shopping tests; call set_utc_now(...) to move it."""
    now = {"value": START}
    app.dependency_overrides[get_utc_now] = lambda: now["value"]

    def change(value: datetime) -> None:
        now["value"] = value

    return change


@pytest.fixture
def category(client: TestClient) -> Callable[[str], dict]:
    """Creates a category: category("Padaria")."""

    def create(name: str) -> dict:
        response = client.post("/api/shopping/categories", json={"name": name})
        assert response.status_code == 201, response.text
        return response.json()

    return create


@pytest.fixture
def item(client: TestClient) -> Callable[..., dict]:
    """Creates an item: item("Leite", category_id, important=True)."""

    def create(name: str, category_id: str, **extra) -> dict:
        body = {"name": name, "categoryId": category_id} | extra
        response = client.post("/api/shopping/items", json=body)
        assert response.status_code == 201, response.text
        return response.json()

    return create

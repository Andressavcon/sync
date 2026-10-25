from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app

# Wednesday, 28 Oct 2026, 3 pm
NOW = datetime(2026, 10, 28, 15, 0)


@pytest.fixture(autouse=True)
def fixed_clock(client: TestClient):
    """Every test in this file runs at NOW (like a fixed java.time.Clock)."""
    app.dependency_overrides[get_now] = lambda: NOW


def create_card(client: TestClient, title: str, due: str, at: str = "12:00", **extra) -> dict:
    body = {"title": title, "dueDate": due, "dueTime": at} | extra
    response = client.post("/api/cards", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_board_json_shape(client: TestClient):
    create_card(client, "Dentist", "2026-10-28", "09:00")

    board = client.get("/api/kanban/board").json()

    assert board["today"] == "2026-10-28"
    assert board["weekStart"] == "2026-10-26"
    assert board["weekEnd"] == "2026-11-01"
    wednesday = board["days"][2]
    assert wednesday["isToday"] is True
    item = wednesday["cards"][0]
    assert item["card"]["title"] == "Dentist"
    assert item["isLate"] is True
    assert item["daysUntil"] == 0


def test_board_sections(client: TestClient):
    create_card(client, "Old", "2026-10-15")
    create_card(client, "Birthday", "2026-11-09", "20:00")
    create_card(client, "Gift", "2026-10-27", status="done")

    board = client.get("/api/kanban/board").json()

    assert [i["card"]["title"] for i in board["overdue"]] == ["Old"]
    assert [i["card"]["title"] for i in board["upcoming"]] == ["Birthday"]
    assert board["upcoming"][0]["daysUntil"] == 12
    assert [i["card"]["title"] for i in board["done"]] == ["Gift"]


def test_board_filtered_by_tag(client: TestClient):
    work = client.post("/api/tags", json={"name": "Work"}).json()
    home = client.post("/api/tags", json={"name": "Home"}).json()
    create_card(client, "Meeting", "2026-10-29", tagIds=[work["id"]])
    create_card(client, "Laundry", "2026-10-29", tagIds=[home["id"]])
    create_card(client, "No tag", "2026-10-29")

    board = client.get("/api/kanban/board", params={"tagIds": [work["id"]]}).json()

    assert [i["card"]["title"] for i in board["days"][3]["cards"]] == ["Meeting"]


def test_board_with_several_tags_shows_cards_with_any_of_them(client: TestClient):
    work = client.post("/api/tags", json={"name": "Work"}).json()
    home = client.post("/api/tags", json={"name": "Home"}).json()
    create_card(client, "Meeting", "2026-10-29", "10:00", tagIds=[work["id"]])
    create_card(client, "Laundry", "2026-10-29", "11:00", tagIds=[home["id"]])
    create_card(client, "No tag", "2026-10-29")

    board = client.get("/api/kanban/board", params={"tagIds": [work["id"], home["id"]]}).json()

    assert [i["card"]["title"] for i in board["days"][3]["cards"]] == ["Meeting", "Laundry"]

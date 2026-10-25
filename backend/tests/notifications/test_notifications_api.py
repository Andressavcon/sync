"""In-app reminders of Kanban cards (section 6). Fixed clock: 28 Oct 2026."""

from collections.abc import Callable
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app
from app.modules.notifications.rules import countdown_text, reminder_is_due


@pytest.fixture(autouse=True)
def set_today(client: TestClient) -> Callable[[datetime], None]:
    now = {"value": datetime(2026, 10, 28, 9, 0)}
    app.dependency_overrides[get_now] = lambda: now["value"]

    def change(value: datetime) -> None:
        now["value"] = value

    return change


def card(client: TestClient, title: str, due: str, remind: int | None) -> dict:
    body = {"title": title, "dueDate": due, "dueTime": "20:00", "remindDaysBefore": remind}
    response = client.post("/api/cards", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def notifications(client: TestClient) -> dict:
    return client.get("/api/notifications").json()


# ---------- Rules ----------


@pytest.mark.parametrize(
    ("days_before", "today", "expected"),
    [
        (3, date(2026, 11, 6), False),  # 4 days before
        (3, date(2026, 11, 7), True),  # 3 days before: starts
        (0, date(2026, 11, 9), False),
        (0, date(2026, 11, 10), True),  # "on the day"
        (None, date(2026, 11, 10), False),  # no reminder
    ],
)
def test_reminder_is_due(days_before, today, expected):
    assert reminder_is_due(date(2026, 11, 10), days_before, today) is expected


def test_countdown_text():
    today = date(2026, 10, 28)
    assert countdown_text(date(2026, 10, 28), today) == "é hoje"
    assert countdown_text(date(2026, 10, 29), today) == "é amanhã"
    assert countdown_text(date(2026, 11, 2), today) == "faltam 5 dias"


# ---------- API ----------


def test_card_keeps_its_reminder(client: TestClient):
    created = card(client, "Aniversário da Ana", "2026-11-09", 3)

    assert created["remindDaysBefore"] == 3


def test_reminder_appears_when_it_is_time(client: TestClient, set_today):
    card(client, "Aniversário da Ana", "2026-11-09", 3)
    card(client, "Sem lembrete", "2026-10-29", None)

    assert notifications(client) == {"items": [], "unread": 0}

    set_today(datetime(2026, 11, 6, 9, 0))  # 3 days before
    result = notifications(client)

    assert result["unread"] == 1
    assert result["items"][0]["title"] == "Aniversário da Ana"
    assert result["items"][0]["message"] == "faltam 3 dias"


def test_reminder_is_created_once(client: TestClient):
    card(client, "Dentista", "2026-10-28", 0)

    notifications(client)
    assert len(notifications(client)["items"]) == 1


def test_mark_read_and_read_all(client: TestClient):
    card(client, "A", "2026-10-28", 0)
    card(client, "B", "2026-10-29", 1)
    items = notifications(client)["items"]

    client.post(f"/api/notifications/{items[0]['id']}/read")
    assert notifications(client)["unread"] == 1

    client.post("/api/notifications/read-all")
    assert notifications(client)["unread"] == 0


def test_done_cards_do_not_remind(client: TestClient):
    created = card(client, "Feito", "2026-10-28", 0)
    client.patch(f"/api/cards/{created['id']}", json={"status": "done"})

    assert notifications(client)["items"] == []


def test_turning_the_reminder_off(client: TestClient):
    created = card(client, "Reunião", "2026-10-30", 2)

    updated = client.patch(f"/api/cards/{created['id']}", json={"remindDaysBefore": None}).json()

    assert updated["remindDaysBefore"] is None
    assert notifications(client)["items"] == []

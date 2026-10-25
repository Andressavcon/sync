"""Home screen (section 5). Fixed clock: Wednesday 28 Oct 2026, 3 pm."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app


@pytest.fixture(autouse=True)
def fixed_clock(client: TestClient):
    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 28, 15, 0)


def dashboard(client: TestClient) -> dict:
    response = client.get("/api/dashboard")
    assert response.status_code == 200, response.text
    return response.json()


def card(client: TestClient, title: str, due: str, at: str = "12:00", **extra) -> None:
    body = {"title": title, "dueDate": due, "dueTime": at} | extra
    assert client.post("/api/cards", json=body).status_code == 201


def post(client: TestClient, url: str, body: dict) -> dict:
    response = client.post(url, json=body)
    assert response.status_code in (200, 201), response.text
    return response.json()


# ---------- Kanban ----------


def test_kanban_panel(client: TestClient):
    card(client, "Reunião", "2026-10-28", "16:00", status="in_progress")
    card(client, "Dentista", "2026-10-28", "09:00")  # today, already late
    card(client, "Feito hoje", "2026-10-28", status="done")
    card(client, "Segunda esquecida", "2026-10-26")  # this week, late
    card(client, "Semana passada", "2026-10-20")  # overdue section
    card(client, "Aniversário", "2026-11-09", "20:00")

    kanban = dashboard(client)["kanban"]

    assert [(c["title"], c["isLate"]) for c in kanban["today"]] == [
        ("Dentista", True),
        ("Reunião", False),
    ]
    assert [c["title"] for c in kanban["late"]] == ["Segunda esquecida", "Semana passada"]
    assert [(c["title"], c["daysUntil"]) for c in kanban["upcoming"]] == [("Aniversário", 12)]


# ---------- Workouts ----------


def test_workout_panel(client: TestClient):
    run = post(client, "/api/workouts/standalone", {"name": "Corrida", "steps": []})
    yoga = post(client, "/api/workouts/standalone", {"name": "Yoga", "steps": []})
    first = post(
        client,
        "/api/workouts/days/2026-10-28/blocks",
        {"sourceType": "standalone", "sourceId": run["id"]},
    )
    post(
        client,
        "/api/workouts/days/2026-10-28/blocks",
        {"sourceType": "standalone", "sourceId": yoga["id"]},
    )
    client.patch(f"/api/workouts/blocks/{first['id']}", json={"state": "done"})

    workouts = dashboard(client)["workouts"]

    assert workouts["blocks"] == [
        {"title": "Corrida", "state": "done"},
        {"title": "Yoga", "state": "not_started"},
    ]
    assert (workouts["doneBlocks"], workouts["state"]) == (1, "in_progress")
    assert [d["mark"] for d in workouts["lastDays"]] == ["rest"] * 5 + ["today"]
    assert (workouts["monthCompleted"], workouts["monthGoal"]) == (0, 20)


def test_month_goal_follows_the_settings(client: TestClient):
    client.patch("/api/settings", json={"weeklyWorkoutGoal": 3})

    assert dashboard(client)["workouts"]["monthGoal"] == 12


# ---------- Fixed bills reminder ----------


def test_bills_reminder_counts_down_to_the_next_unpaid_bill(client: TestClient):
    rent = post(
        client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5}
    )
    post(client, "/api/finance/fixed-bills", {"name": "Internet", "amount": 100, "dueDay": 30})
    client.put(f"/api/finance/fixed-bills/{rent['id']}/months/2026-10", json={"paid": True})

    bills = dashboard(client)["bills"]

    assert bills["active"] is True  # day 28 >= reminder day 5
    assert bills["allPaid"] is False
    assert (bills["nextDueDate"], bills["daysToNextDue"]) == ("2026-10-30", 2)


def test_bills_reminder_says_all_paid(client: TestClient):
    rent = post(
        client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5}
    )
    client.put(f"/api/finance/fixed-bills/{rent['id']}/months/2026-10", json={"paid": True})

    assert dashboard(client)["bills"]["allPaid"] is True


def test_bills_reminder_waits_for_the_configured_day(client: TestClient):
    post(client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5})
    client.patch("/api/settings", json={"billReminderDay": 28})
    assert dashboard(client)["bills"]["active"] is True

    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 27, 15, 0)
    assert dashboard(client)["bills"]["active"] is False


# ---------- Spending (section 9.6) ----------


def test_spending_percent_uses_the_week_budget_at_its_start(client: TestClient):
    client.put("/api/finance/salary", json={"amount": 4500, "day": 5})
    pix = {"kind": "expense", "title": "X", "paymentMethod": "pix"}
    post(
        client, "/api/finance/transactions", pix | {"amount": 100, "day": "2026-10-20"}
    )  # last week
    post(
        client, "/api/finance/transactions", pix | {"amount": 80, "day": "2026-10-27"}
    )  # this week

    spending = client.get("/api/finance/week-spending").json()

    # Monday 26 Oct: 4500 - 100 = 4400 for 2 weeks (10 days left) = 2200 for the week
    assert spending["weekBudget"] == 2200
    assert spending["used"] == 80
    assert spending["percent"] == 4  # 3.6% rounded
    assert dashboard(client)["spending"] == {"percent": 4, "over": False}


def test_spending_over_100_percent_is_only_a_warning(client: TestClient):
    client.put("/api/finance/salary", json={"amount": 1000, "day": 5})
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "expense",
            "title": "X",
            "paymentMethod": "pix",
            "amount": 600,
            "day": "2026-10-27",
        },
    )

    spending = dashboard(client)["spending"]

    assert spending["over"] is True
    assert spending["percent"] == 120  # 600 of 500 for the week


def test_empty_dashboard(client: TestClient):
    result = dashboard(client)

    assert result["today"] == "2026-10-28"
    assert result["kanban"] == {"today": [], "late": [], "upcoming": []}
    assert result["workouts"]["state"] == "empty"
    assert result["bills"]["hasBills"] is False
    assert result["spending"]["percent"] is None

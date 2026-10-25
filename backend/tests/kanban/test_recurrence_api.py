"""Recurring cards through the API (section 4.10).

Fixed clock: Wednesday 28 Oct 2026 -> week from Mon 26 Oct to Sun 1 Nov.
"""

from collections.abc import Callable
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app

WEDNESDAY = datetime(2026, 10, 28, 15, 0)


@pytest.fixture(autouse=True)
def set_now(client: TestClient) -> Callable[[datetime], None]:
    """Fixed clock; tests can move it forward by calling set_now(...)."""
    now = {"value": WEDNESDAY}
    app.dependency_overrides[get_now] = lambda: now["value"]

    def change(value: datetime) -> None:
        now["value"] = value

    return change


def create_rule(client: TestClient, **overrides) -> dict:
    body = {
        "title": "Gym",
        "dueTime": "07:00",
        "frequency": "weekly",
        "weekdays": [0, 2, 4],  # Mon, Wed, Fri
        "startDate": "2026-10-26",
    } | overrides
    response = client.post("/api/recurrences", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def board(client: TestClient) -> dict:
    return client.get("/api/kanban/board").json()


def week_cards(data: dict) -> dict[str, list[str]]:
    """{"2026-10-26": ["Gym"], ...} only for days that have cards."""
    return {d["date"]: [i["card"]["title"] for i in d["cards"]] for d in data["days"] if d["cards"]}


def all_cards(client: TestClient) -> list[dict]:
    return client.get("/api/cards").json()


def card_on(client: TestClient, day: str) -> dict:
    return next(c for c in all_cards(client) if c["occurrenceDate"] == day)


# ---------- Generation ----------


def test_weekly_rule_fills_the_week_and_shows_only_the_next_upcoming(client: TestClient):
    create_rule(client)

    data = board(client)

    assert week_cards(data) == {
        "2026-10-26": ["Gym"],
        "2026-10-28": ["Gym"],
        "2026-10-30": ["Gym"],
    }
    assert [i["card"]["dueDate"] for i in data["upcoming"]] == ["2026-11-02"]


def test_daily_rule_also_shows_a_single_upcoming(client: TestClient):
    create_rule(client, frequency="daily", weekdays=[])

    data = board(client)

    assert len(week_cards(data)) == 7
    assert [i["card"]["dueDate"] for i in data["upcoming"]] == ["2026-11-02"]


def test_occurrences_are_regular_cards_linked_to_the_rule(client: TestClient):
    rule = create_rule(client, content="Leg day", tagIds=[])

    card = card_on(client, "2026-10-28")

    assert card["recurrenceId"] == rule["id"]
    assert card["content"] == "Leg day"
    assert card["status"] == "pending"


def test_opening_the_board_twice_does_not_duplicate(client: TestClient):
    create_rule(client)

    board(client)
    board(client)

    assert len(all_cards(client)) == 4  # Mon, Wed, Fri + next Monday


def test_new_week_generates_the_new_occurrences(
    client: TestClient, set_now: Callable[[datetime], None]
):
    create_rule(client)

    set_now(datetime(2026, 11, 4, 9, 0))  # next Wednesday
    data = board(client)

    assert week_cards(data) == {
        "2026-11-02": ["Gym"],
        "2026-11-04": ["Gym"],
        "2026-11-06": ["Gym"],
    }
    assert [i["card"]["dueDate"] for i in data["upcoming"]] == ["2026-11-09"]
    # Last week's cards were not completed: they are overdue now
    assert [i["card"]["dueDate"] for i in data["overdue"]] == [
        "2026-10-26",
        "2026-10-28",
        "2026-10-30",
    ]


def test_monthly_rule_on_31(client: TestClient):
    create_rule(client, frequency="monthly", weekdays=[], monthDay=31, startDate="2026-10-01")

    data = board(client)

    assert week_cards(data) == {"2026-10-31": ["Gym"]}
    assert [i["card"]["dueDate"] for i in data["upcoming"]] == ["2026-11-30"]


def test_tags_are_copied_to_the_occurrences(client: TestClient):
    tag = client.post("/api/tags", json={"name": "Health"}).json()
    create_rule(client, tagIds=[tag["id"]])

    assert [t["name"] for t in card_on(client, "2026-10-30")["tags"]] == ["Health"]


# ---------- Validation ----------


@pytest.mark.parametrize(
    "overrides",
    [
        {"weekdays": []},  # weekly without days
        {"weekdays": [7]},  # weekday out of range
        {"frequency": "monthly", "weekdays": []},  # monthly without monthDay
        {"endDate": "2026-10-01"},  # ends before it starts
        {"frequency": "yearly"},  # unknown frequency
    ],
)
def test_invalid_rules_are_rejected(client: TestClient, overrides: dict):
    body = {
        "title": "Gym",
        "dueTime": "07:00",
        "frequency": "weekly",
        "weekdays": [0],
        "startDate": "2026-10-26",
    } | overrides

    assert client.post("/api/recurrences", json=body).status_code == 422


# ---------- Only this occurrence ----------


def test_deleting_only_this_occurrence_does_not_bring_it_back(client: TestClient):
    create_rule(client)
    wednesday = card_on(client, "2026-10-28")

    client.delete(f"/api/cards/{wednesday['id']}")
    data = board(client)

    assert "2026-10-28" not in week_cards(data)
    assert "2026-10-30" in week_cards(data)


def test_dragging_an_occurrence_does_not_duplicate_it(client: TestClient):
    create_rule(client)
    wednesday = card_on(client, "2026-10-28")

    client.patch(f"/api/cards/{wednesday['id']}", json={"dueDate": "2026-10-29"})
    data = board(client)

    assert "2026-10-28" not in week_cards(data)
    assert week_cards(data)["2026-10-29"] == ["Gym"]


def test_editing_only_this_occurrence(client: TestClient):
    create_rule(client)
    wednesday = card_on(client, "2026-10-28")

    client.patch(f"/api/cards/{wednesday['id']}", json={"title": "Gym + run"})

    titles = week_cards(board(client))
    assert titles["2026-10-28"] == ["Gym + run"]
    assert titles["2026-10-30"] == ["Gym"]


# ---------- This and the following ones ----------


def test_editing_following_changes_next_open_occurrences_and_the_rule(client: TestClient):
    rule = create_rule(client)
    friday = card_on(client, "2026-10-30")
    client.patch(f"/api/cards/{friday['id']}", json={"status": "done"})
    wednesday = card_on(client, "2026-10-28")

    response = client.patch(
        f"/api/cards/{wednesday['id']}",
        params={"scope": "following"},
        json={"title": "Pilates", "dueTime": "08:00"},
    )

    assert response.status_code == 200
    titles = {c["occurrenceDate"]: c["title"] for c in all_cards(client)}
    assert titles == {
        "2026-10-26": "Gym",  # before: unchanged
        "2026-10-28": "Pilates",  # this one
        "2026-10-30": "Gym",  # already done: unchanged
        "2026-11-02": "Pilates",  # next open one
    }
    updated_rule = client.get(f"/api/recurrences/{rule['id']}").json()
    assert updated_rule["title"] == "Pilates"
    assert updated_rule["dueTime"] == "08:00:00"


def test_deleting_following_ends_the_rule(client: TestClient, set_now: Callable[[datetime], None]):
    rule = create_rule(client)
    wednesday = card_on(client, "2026-10-28")

    response = client.delete(f"/api/cards/{wednesday['id']}", params={"scope": "following"})

    assert response.status_code == 204
    assert [c["occurrenceDate"] for c in all_cards(client)] == ["2026-10-26"]
    assert client.get(f"/api/recurrences/{rule['id']}").json()["endDate"] == "2026-10-27"
    # Nothing comes back, not even next week
    set_now(datetime(2026, 11, 4, 9, 0))
    board(client)
    assert len(all_cards(client)) == 1


def test_following_scope_on_a_normal_card_is_rejected(client: TestClient):
    card = client.post(
        "/api/cards", json={"title": "One-off", "dueDate": "2026-10-28", "dueTime": "10:00"}
    ).json()

    response = client.delete(f"/api/cards/{card['id']}", params={"scope": "following"})

    assert response.status_code == 422


# ---------- Changing or stopping the rule ----------


def test_changing_the_schedule_recreates_open_occurrences_from_today(client: TestClient):
    rule = create_rule(client)

    response = client.patch(f"/api/recurrences/{rule['id']}", json={"weekdays": [1, 3]})

    assert response.status_code == 200
    assert response.json()["weekdays"] == [1, 3]
    dates = sorted(c["occurrenceDate"] for c in all_cards(client))
    # Monday (past) stays; Wed/Fri/next Mon replaced by Thu + next Tuesday
    assert dates == ["2026-10-26", "2026-10-29", "2026-11-03"]


def test_removing_the_end_date_with_null(client: TestClient):
    rule = create_rule(client, endDate="2026-10-28")

    updated = client.patch(f"/api/recurrences/{rule['id']}", json={"endDate": None}).json()

    assert updated["endDate"] is None
    assert "2026-10-30" in week_cards(board(client))


def test_deleting_the_rule_keeps_past_cards_as_normal_cards(client: TestClient):
    rule = create_rule(client)

    assert client.delete(f"/api/recurrences/{rule['id']}").status_code == 204

    remaining = all_cards(client)
    assert [c["occurrenceDate"] for c in remaining] == ["2026-10-26"]
    assert remaining[0]["recurrenceId"] is None
    assert client.get(f"/api/recurrences/{rule['id']}").status_code == 404

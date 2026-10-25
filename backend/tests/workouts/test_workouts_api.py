"""Workouts API. Fixed clock: Wednesday 28 Oct 2026."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app

TODAY = "2026-10-28"
YESTERDAY = "2026-10-27"

PLANK = {"type": "time", "name": "Prancha", "durationSec": 30, "restSec": 15}
SQUAT = {"type": "reps", "name": "Agachamento", "sets": 3, "reps": 12, "restSec": 45}
RUN = {"type": "distance", "name": "Corrida", "km": 5.5}


@pytest.fixture(autouse=True)
def fixed_clock(client: TestClient):
    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 28, 7, 0)


def create_program(client: TestClient, name: str = "Metabólico", sessions: int = 0) -> dict:
    response = client.post("/api/workouts/programs", json={"name": name, "sessionCount": sessions})
    assert response.status_code == 201, response.text
    return response.json()


def create_standalone(client: TestClient, name: str = "Corrida", steps=None) -> dict:
    body = {"name": name, "steps": steps if steps is not None else [RUN]}
    response = client.post("/api/workouts/standalone", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def add_block(client: TestClient, source: dict, source_type: str, day: str = TODAY) -> dict:
    response = client.post(
        f"/api/workouts/days/{day}/blocks",
        json={"sourceType": source_type, "sourceId": source["id"]},
    )
    assert response.status_code == 201, response.text
    return response.json()


# ---------- Library ----------


def test_program_is_created_with_empty_numbered_sessions(client: TestClient):
    program = create_program(client, sessions=3)

    assert [s["number"] for s in program["sessions"]] == [1, 2, 3]
    assert all(s["steps"] == [] for s in program["sessions"])


def test_session_steps_mix_the_three_kinds(client: TestClient):
    program = create_program(client, sessions=1)
    session_id = program["sessions"][0]["id"]

    response = client.put(
        f"/api/workouts/sessions/{session_id}", json={"steps": [PLANK, SQUAT, RUN]}
    )

    assert response.status_code == 200
    assert response.json()["steps"] == [PLANK, SQUAT, RUN]


@pytest.mark.parametrize(
    "bad_step",
    [
        {"type": "swim", "name": "Natação"},  # unknown kind
        {"type": "time", "name": "Prancha"},  # missing duration
        {"type": "reps", "name": "Flexão", "sets": 0, "reps": 10},  # zero sets
        {"type": "distance", "name": "Corrida", "km": -1},  # negative distance
        {"type": "time", "name": " ", "durationSec": 30},  # empty name
    ],
)
def test_invalid_steps_are_rejected(client: TestClient, bad_step: dict):
    response = client.post("/api/workouts/standalone", json={"name": "X", "steps": [bad_step]})

    assert response.status_code == 422


def test_add_session_at_the_end(client: TestClient):
    program = create_program(client, sessions=2)

    response = client.post(
        f"/api/workouts/programs/{program['id']}/sessions", json={"steps": [PLANK]}
    )

    assert response.json()["number"] == 3


def test_deleting_a_session_renumbers_the_next_ones(client: TestClient):
    program = create_program(client, sessions=4)
    second = program["sessions"][1]
    client.put(f"/api/workouts/sessions/{program['sessions'][2]['id']}", json={"steps": [RUN]})

    assert client.delete(f"/api/workouts/sessions/{second['id']}").status_code == 204

    sessions = client.get("/api/workouts/library").json()["programs"][0]["sessions"]
    assert [s["number"] for s in sessions] == [1, 2, 3]
    assert sessions[1]["steps"] == [RUN]  # the old "Dia 3" is now "Dia 2"


def test_library_lists_programs_and_standalone_by_name(client: TestClient):
    create_program(client, "Yoga flow")
    create_program(client, "Metabólico")
    create_standalone(client, "Jump")
    create_standalone(client, "Corrida")

    library = client.get("/api/workouts/library").json()

    assert [p["name"] for p in library["programs"]] == ["Metabólico", "Yoga flow"]
    assert [w["name"] for w in library["standalone"]] == ["Corrida", "Jump"]


def test_edit_and_delete_standalone(client: TestClient):
    run = create_standalone(client)

    edited = client.patch(
        f"/api/workouts/standalone/{run['id']}", json={"name": "Corrida leve"}
    ).json()
    assert edited["name"] == "Corrida leve"
    assert edited["steps"] == [RUN]  # not sent: unchanged

    assert client.delete(f"/api/workouts/standalone/{run['id']}").status_code == 204
    assert client.get("/api/workouts/library").json()["standalone"] == []


# ---------- A day ----------


def test_adding_blocks_copies_title_and_steps(client: TestClient):
    program = create_program(client, sessions=3)
    third = program["sessions"][2]
    client.put(f"/api/workouts/sessions/{third['id']}", json={"steps": [PLANK, SQUAT]})
    run = create_standalone(client)

    add_block(client, third, "session")
    add_block(client, run, "standalone")

    day = client.get(f"/api/workouts/days/{TODAY}").json()
    assert [b["title"] for b in day["blocks"]] == ["Metabólico · Dia 3", "Corrida"]
    assert day["blocks"][0]["steps"] == [PLANK, SQUAT]
    assert day["blocks"][0]["state"] == "not_started"
    assert day["completed"] is False
    assert day["readOnly"] is False


def test_editing_the_library_does_not_change_a_used_block(client: TestClient):
    run = create_standalone(client)
    add_block(client, run, "standalone")

    client.patch(f"/api/workouts/standalone/{run['id']}", json={"name": "Trote", "steps": []})

    block = client.get(f"/api/workouts/days/{TODAY}").json()["blocks"][0]
    assert block["title"] == "Corrida"
    assert block["steps"] == [RUN]


def test_saving_timer_progress_marks_the_block_in_progress(client: TestClient):
    block = add_block(client, create_standalone(client), "standalone")

    response = client.patch(
        f"/api/workouts/blocks/{block['id']}", json={"stepIndex": 3, "remainingMs": 12000}
    )

    updated = response.json()
    assert updated["state"] == "in_progress"
    assert updated["stepIndex"] == 3
    assert updated["remainingMs"] == 12000


def test_day_is_completed_when_every_block_is_done(client: TestClient):
    first = add_block(client, create_standalone(client, "Corrida"), "standalone")
    second = add_block(client, create_standalone(client, "Yoga"), "standalone")

    client.patch(f"/api/workouts/blocks/{first['id']}", json={"state": "done"})
    assert client.get(f"/api/workouts/days/{TODAY}").json()["completed"] is False

    client.patch(f"/api/workouts/blocks/{second['id']}", json={"state": "done"})
    assert client.get(f"/api/workouts/days/{TODAY}").json()["completed"] is True


def test_unchecking_a_block_starts_it_over(client: TestClient):
    block = add_block(client, create_standalone(client), "standalone")
    client.patch(f"/api/workouts/blocks/{block['id']}", json={"stepIndex": 4, "remainingMs": 500})

    reset = client.patch(
        f"/api/workouts/blocks/{block['id']}", json={"state": "not_started"}
    ).json()

    assert (reset["state"], reset["stepIndex"], reset["remainingMs"]) == ("not_started", 0, None)


def test_remove_block_from_today(client: TestClient):
    block = add_block(client, create_standalone(client), "standalone")

    assert client.delete(f"/api/workouts/blocks/{block['id']}").status_code == 204
    assert client.get(f"/api/workouts/days/{TODAY}").json()["blocks"] == []


def test_unknown_source_is_404(client: TestClient):
    response = client.post(
        f"/api/workouts/days/{TODAY}/blocks",
        json={"sourceType": "standalone", "sourceId": "00000000-0000-0000-0000-000000000000"},
    )

    assert response.status_code == 404


# ---------- Past days are read-only ----------


def test_past_days_are_read_only(client: TestClient):
    run = create_standalone(client)

    response = client.post(
        f"/api/workouts/days/{YESTERDAY}/blocks",
        json={"sourceType": "standalone", "sourceId": run["id"]},
    )

    assert response.status_code == 422
    assert client.get(f"/api/workouts/days/{YESTERDAY}").json()["readOnly"] is True


def test_blocks_of_a_past_day_cannot_change(client: TestClient):
    block = add_block(client, create_standalone(client), "standalone")
    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 29, 7, 0)  # next day

    assert (
        client.patch(f"/api/workouts/blocks/{block['id']}", json={"state": "done"}).status_code
        == 422
    )
    assert client.delete(f"/api/workouts/blocks/{block['id']}").status_code == 422


# ---------- Month history ----------


def test_month_history(client: TestClient):
    run = create_standalone(client, "Corrida")
    yoga = create_standalone(client, "Yoga")
    # Two days: the 28th completed, the 30th only started
    done = add_block(client, run, "standalone", TODAY)
    client.patch(f"/api/workouts/blocks/{done['id']}", json={"state": "done"})
    add_block(client, yoga, "standalone", "2026-10-30")
    add_block(client, run, "standalone", "2026-11-02")  # next month: not included

    history = client.get("/api/workouts/history", params={"month": "2026-10"}).json()

    assert [d["day"] for d in history["days"]] == ["2026-10-28", "2026-10-30"]
    assert [d["completed"] for d in history["days"]] == [True, False]
    assert history["days"][0]["blocks"] == [{"title": "Corrida", "state": "done"}]
    assert history["completedDays"] == 1


def test_month_must_be_yyyy_mm(client: TestClient):
    assert client.get("/api/workouts/history", params={"month": "2026-13"}).status_code == 422


def test_remaining_time_can_be_cleared_with_null(client: TestClient):
    block = add_block(client, create_standalone(client), "standalone")
    client.patch(f"/api/workouts/blocks/{block['id']}", json={"stepIndex": 1, "remainingMs": 9000})

    updated = client.patch(
        f"/api/workouts/blocks/{block['id']}", json={"stepIndex": 2, "remainingMs": None}
    ).json()

    assert (updated["stepIndex"], updated["remainingMs"]) == (2, None)

from fastapi.testclient import TestClient


def test_defaults_before_saving(client: TestClient):
    assert client.get("/api/settings").json() == {"billReminderDay": 5, "weeklyWorkoutGoal": 5}


def test_update_one_setting_keeps_the_other(client: TestClient):
    client.patch("/api/settings", json={"weeklyWorkoutGoal": 3})

    assert client.get("/api/settings").json() == {"billReminderDay": 5, "weeklyWorkoutGoal": 3}


def test_limits(client: TestClient):
    assert client.patch("/api/settings", json={"weeklyWorkoutGoal": 8}).status_code == 422
    assert client.patch("/api/settings", json={"billReminderDay": 29}).status_code == 422

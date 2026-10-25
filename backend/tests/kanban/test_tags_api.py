from fastapi.testclient import TestClient


def create_tag(client: TestClient, name: str) -> dict:
    response = client.post("/api/tags", json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_create_and_list_tags_sorted_by_name(client: TestClient):
    create_tag(client, "Work")
    create_tag(client, "Home")

    response = client.get("/api/tags")

    assert response.status_code == 200
    assert [t["name"] for t in response.json()] == ["Home", "Work"]


def test_tag_name_is_trimmed(client: TestClient):
    tag = create_tag(client, "  Study  ")

    assert tag["name"] == "Study"


def test_empty_tag_name_is_rejected(client: TestClient):
    response = client.post("/api/tags", json={"name": "   "})

    assert response.status_code == 422


def test_repeated_tag_name_ignoring_case_is_a_conflict(client: TestClient):
    create_tag(client, "Home")

    response = client.post("/api/tags", json={"name": "home"})

    assert response.status_code == 409


def test_rename_tag(client: TestClient):
    tag = create_tag(client, "Helth")

    response = client.patch(f"/api/tags/{tag['id']}", json={"name": "Health"})

    assert response.status_code == 200
    assert response.json()["name"] == "Health"


def test_rename_to_another_existing_name_is_a_conflict(client: TestClient):
    create_tag(client, "Home")
    work = create_tag(client, "Work")

    response = client.patch(f"/api/tags/{work['id']}", json={"name": "HOME"})

    assert response.status_code == 409


def test_delete_tag(client: TestClient):
    tag = create_tag(client, "Old")

    assert client.delete(f"/api/tags/{tag['id']}").status_code == 204
    assert client.get("/api/tags").json() == []


def test_unknown_tag_returns_404(client: TestClient):
    response = client.delete("/api/tags/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json() == {"detail": "Tag not found"}

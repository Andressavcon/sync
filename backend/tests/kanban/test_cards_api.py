from fastapi.testclient import TestClient


def new_card(**overrides) -> dict:
    body = {"title": "Send proposal", "dueDate": "2026-10-30", "dueTime": "17:00"}
    return body | overrides


def create_card(client: TestClient, **overrides) -> dict:
    response = client.post("/api/cards", json=new_card(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_card_returns_camel_case_json_with_defaults(client: TestClient):
    card = create_card(client)

    assert card["title"] == "Send proposal"
    assert card["dueDate"] == "2026-10-30"
    assert card["dueTime"] == "17:00:00"
    assert card["status"] == "pending"
    assert card["content"] == ""
    assert card["completedAt"] is None
    assert card["tags"] == []


def test_create_card_with_tags(client: TestClient):
    tag = client.post("/api/tags", json={"name": "Work"}).json()

    card = create_card(client, tagIds=[tag["id"], tag["id"]])

    assert [t["name"] for t in card["tags"]] == ["Work"]


def test_card_with_unknown_tag_is_rejected(client: TestClient):
    response = client.post(
        "/api/cards", json=new_card(tagIds=["00000000-0000-0000-0000-000000000000"])
    )

    assert response.status_code == 422


def test_card_without_title_is_rejected(client: TestClient):
    response = client.post("/api/cards", json=new_card(title=""))

    assert response.status_code == 422


def test_list_cards_ordered_by_date_and_time(client: TestClient):
    create_card(client, title="Late", dueDate="2026-10-30", dueTime="18:00")
    create_card(client, title="Early", dueDate="2026-10-30", dueTime="08:00")
    create_card(client, title="Yesterday", dueDate="2026-10-29", dueTime="20:00")

    titles = [c["title"] for c in client.get("/api/cards").json()]

    assert titles == ["Yesterday", "Early", "Late"]


def test_patch_changes_only_the_fields_sent(client: TestClient):
    card = create_card(client, content="Final PDF")

    # Dragging to another day: new date, same time
    response = client.patch(f"/api/cards/{card['id']}", json={"dueDate": "2026-10-31"})

    updated = response.json()
    assert updated["dueDate"] == "2026-10-31"
    assert updated["dueTime"] == "17:00:00"
    assert updated["content"] == "Final PDF"


def test_marking_done_sets_completed_at_and_reopening_clears_it(client: TestClient):
    card = create_card(client)

    done = client.patch(f"/api/cards/{card['id']}", json={"status": "done"}).json()
    assert done["completedAt"] is not None

    reopened = client.patch(f"/api/cards/{card['id']}", json={"status": "pending"}).json()
    assert reopened["completedAt"] is None


def test_card_created_as_done_has_completed_at(client: TestClient):
    card = create_card(client, status="done")

    assert card["completedAt"] is not None


def test_replace_card_tags(client: TestClient):
    work = client.post("/api/tags", json={"name": "Work"}).json()
    home = client.post("/api/tags", json={"name": "Home"}).json()
    card = create_card(client, tagIds=[work["id"]])

    updated = client.patch(f"/api/cards/{card['id']}", json={"tagIds": [home["id"]]}).json()

    assert [t["name"] for t in updated["tags"]] == ["Home"]


def test_deleting_a_tag_removes_it_from_cards(client: TestClient):
    tag = client.post("/api/tags", json={"name": "Work"}).json()
    card = create_card(client, tagIds=[tag["id"]])

    client.delete(f"/api/tags/{tag['id']}")

    assert client.get(f"/api/cards/{card['id']}").json()["tags"] == []


def test_delete_card(client: TestClient):
    card = create_card(client)

    assert client.delete(f"/api/cards/{card['id']}").status_code == 204
    assert client.get(f"/api/cards/{card['id']}").status_code == 404

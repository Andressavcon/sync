from collections.abc import Callable
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.shopping.service import DEFAULT_CATEGORIES
from app.modules.users.models import User
from tests.shopping.conftest import START


def get_list(client: TestClient) -> dict:
    return client.get("/api/shopping/list").json()


def names(items: list[dict]) -> list[str]:
    return [i["name"] for i in items]


def check(client: TestClient, item_id: str, purchased: bool = True) -> None:
    response = client.patch(f"/api/shopping/items/{item_id}", json={"purchased": purchased})
    assert response.status_code == 200


# ---------- Categories ----------


def test_categories_keep_the_creation_order(client: TestClient, category):
    category("Hortifruti")
    category("Padaria")
    category("Limpeza")

    response = client.get("/api/shopping/categories").json()

    assert [c["name"] for c in response] == ["Hortifruti", "Padaria", "Limpeza"]
    assert [c["position"] for c in response] == [0, 1, 2]


def test_repeated_category_name_is_a_conflict(client: TestClient, category):
    category("Padaria")

    response = client.post("/api/shopping/categories", json={"name": "padaria"})

    assert response.status_code == 409


def test_rename_category(client: TestClient, category):
    bakery = category("Padria")

    response = client.patch(f"/api/shopping/categories/{bakery['id']}", json={"name": "Padaria"})

    assert response.json()["name"] == "Padaria"


def test_reorder_categories_like_the_market_aisles(client: TestClient, category):
    fruits = category("Hortifruti")
    bakery = category("Padaria")
    cleaning = category("Limpeza")

    response = client.put(
        "/api/shopping/categories/order",
        json={"categoryIds": [cleaning["id"], fruits["id"], bakery["id"]]},
    )

    assert [c["name"] for c in response.json()] == ["Limpeza", "Hortifruti", "Padaria"]


def test_reorder_must_send_every_category_once(client: TestClient, category):
    fruits = category("Hortifruti")
    category("Padaria")

    response = client.put("/api/shopping/categories/order", json={"categoryIds": [fruits["id"]]})

    assert response.status_code == 422


def test_deleting_a_category_deletes_its_items(client: TestClient, category, item):
    bakery = category("Padaria")
    item("Pão", bakery["id"])

    assert client.delete(f"/api/shopping/categories/{bakery['id']}").status_code == 204
    assert get_list(client)["totalItems"] == 0


# ---------- Items ----------


def test_item_needs_an_existing_category(client: TestClient):
    response = client.post(
        "/api/shopping/items",
        json={"name": "Leite", "categoryId": "00000000-0000-0000-0000-000000000000"},
    )

    assert response.status_code == 422


def test_item_name_is_required(client: TestClient, category):
    dairy = category("Laticínios")

    response = client.post("/api/shopping/items", json={"name": "  ", "categoryId": dairy["id"]})

    assert response.status_code == 422


def test_edit_item(client: TestClient, category, item):
    dairy = category("Laticínios")
    bakery = category("Padaria")
    milk = item("Leite", dairy["id"])

    response = client.patch(
        f"/api/shopping/items/{milk['id']}",
        json={"name": "Leite integral", "quantity": "2", "categoryId": bakery["id"]},
    )

    updated = response.json()
    assert updated["name"] == "Leite integral"
    assert updated["quantity"] == "2"
    assert updated["categoryId"] == bakery["id"]


# ---------- The list, as shown (section 8.2 / 8.3) ----------


def test_important_items_form_one_section_on_top(client: TestClient, category, item):
    fruits = category("Hortifruti")
    cleaning = category("Limpeza")
    item("Banana", fruits["id"])
    item("Detergente", cleaning["id"], important=True)
    item("Tomate", fruits["id"], important=True)

    shopping_list = get_list(client)

    assert names(shopping_list["important"]) == ["Detergente", "Tomate"]
    by_category = {c["category"]["name"]: names(c["items"]) for c in shopping_list["categories"]}
    assert by_category == {"Hortifruti": ["Banana"], "Limpeza": []}


def test_checked_items_go_to_the_end_in_the_order_they_were_checked(
    client: TestClient, category, item, set_utc_now: Callable
):
    fruits = category("Hortifruti")
    apple = item("Maçã", fruits["id"])
    banana = item("Banana", fruits["id"])
    item("Uva", fruits["id"])

    check(client, banana["id"])
    set_utc_now(START + timedelta(minutes=5))
    check(client, apple["id"])

    shopping_list = get_list(client)
    assert names(shopping_list["categories"][0]["items"]) == ["Uva", "Banana", "Maçã"]
    assert shopping_list["purchasedItems"] == 2
    assert shopping_list["totalItems"] == 3


def test_unchecking_puts_the_item_back_in_place(client: TestClient, category, item):
    fruits = category("Hortifruti")
    apple = item("Maçã", fruits["id"])
    item("Banana", fruits["id"])

    check(client, apple["id"])
    check(client, apple["id"], purchased=False)

    assert names(get_list(client)["categories"][0]["items"]) == ["Maçã", "Banana"]


# ---------- Completing the list (section 8.5) ----------


def test_empty_list_cannot_be_completed(client: TestClient):
    assert client.post("/api/shopping/list/complete").status_code == 422


def test_complete_archives_everything_and_keeps_unchecked_items(client: TestClient, category, item):
    fruits = category("Hortifruti")
    banana = item("Banana", fruits["id"], quantity="6")
    item("Uva", fruits["id"])
    check(client, banana["id"])

    response = client.post("/api/shopping/list/complete")

    assert response.status_code == 201
    archived = response.json()
    assert [(i["name"], i["purchased"]) for i in archived["items"]] == [
        ("Uva", False),
        ("Banana", True),
    ]
    assert archived["items"][1]["quantity"] == "6"
    assert archived["items"][1]["categoryName"] == "Hortifruti"
    # The new list keeps only what was not bought
    assert names(get_list(client)["categories"][0]["items"]) == ["Uva"]


def test_archive_does_not_change_when_the_category_is_renamed(client: TestClient, category, item):
    fruits = category("Hortifruti")
    item("Banana", fruits["id"])
    client.post("/api/shopping/list/complete")

    client.patch(f"/api/shopping/categories/{fruits['id']}", json={"name": "Frutas"})

    archives = client.get("/api/shopping/archives").json()
    assert archives[0]["items"][0]["categoryName"] == "Hortifruti"


def test_archives_are_kept_for_90_days(client: TestClient, category, item, set_utc_now: Callable):
    fruits = category("Hortifruti")
    item("Banana", fruits["id"])
    client.post("/api/shopping/list/complete")

    set_utc_now(START + timedelta(days=89))
    assert len(client.get("/api/shopping/archives").json()) == 1

    set_utc_now(START + timedelta(days=91))
    assert client.get("/api/shopping/archives").json() == []


# ---------- Suggestions (section 8.3) ----------


def complete_with(client: TestClient, category_id: str, item, *item_names: str) -> None:
    for name in item_names:
        item(name, category_id)
    created = get_list(client)
    for section in created["categories"]:
        for entry in section["items"]:
            check(client, entry["id"])  # bought: leaves the list on completion
    client.post("/api/shopping/list/complete")


def test_suggestions_come_from_archives_most_frequent_first(client: TestClient, category, item):
    market = category("Mercado")
    complete_with(client, market["id"], item, "Leite", "Pão")
    complete_with(client, market["id"], item, "leite", "Café")
    complete_with(client, market["id"], item, "Leite")

    suggestions = client.get("/api/shopping/suggestions").json()

    assert suggestions[0] == "Leite"  # 3 times, whatever the case
    assert set(suggestions[1:]) == {"Pão", "Café"}


def test_suggestions_filter_by_text_and_skip_items_already_on_the_list(
    client: TestClient, category, item
):
    market = category("Mercado")
    complete_with(client, market["id"], item, "Leite", "Leite condensado", "Pão")
    item("Leite", market["id"])

    response = client.get("/api/shopping/suggestions", params={"q": "lei"}).json()

    assert response == ["Leite condensado"]


# ---------- Default categories ----------


def test_new_user_gets_default_categories_once(client: TestClient, db: Session, api_user: User):
    api_user.shopping_defaults_created = False
    db.commit()

    first = [c["category"]["name"] for c in get_list(client)["categories"]]
    assert first == DEFAULT_CATEGORIES

    # Deleting all of them doesn't bring them back
    for category_id in [c["id"] for c in client.get("/api/shopping/categories").json()]:
        client.delete(f"/api/shopping/categories/{category_id}")
    assert get_list(client)["categories"] == []

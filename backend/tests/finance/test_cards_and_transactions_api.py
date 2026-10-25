"""Cards, invoices and transactions. Fixed clock: 28 Oct 2026."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app


@pytest.fixture(autouse=True)
def fixed_clock(client: TestClient):
    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 28, 12, 0)


@pytest.fixture
def nubank(client: TestClient) -> dict:
    """Closes on the 8th, due on the 15th."""
    response = client.post(
        "/api/finance/cards", json={"name": "Nubank", "dueDay": 15, "closingDay": 8}
    )
    assert response.status_code == 201, response.text
    return response.json()


def expense(client: TestClient, card: dict | None = None, **extra) -> dict:
    body = {
        "kind": "expense",
        "title": "SUPERMERCADO",
        "amount": 187.45,
        "day": "2026-10-28",
        "paymentMethod": "card" if card else "pix",
        "cardId": card["id"] if card else None,
    } | extra
    response = client.post("/api/finance/transactions", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def installments(client: TestClient, card: dict, **extra) -> list[dict]:
    body = {
        "title": "TV",
        "installmentAmount": 150,
        "installments": 3,
        "day": "2026-10-28",
        "cardId": card["id"],
    } | extra
    response = client.post("/api/finance/transactions/installments", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def summary(client: TestClient) -> dict:
    return client.get("/api/finance/cards").json()[0]


# ---------- Cards ----------


def test_card_summary_shows_the_current_invoice(client: TestClient, nubank: dict):
    expense(client, nubank)  # 28 Oct, after the closing on 8 Oct: November invoice

    card = summary(client)

    assert card["card"]["name"] == "Nubank"
    assert card["card"]["closingDayPurchaseGoesNext"] is True
    assert card["currentInvoice"] == {
        "month": "2026-11",
        "dueDate": "2026-11-15",
        "total": 187.45,
        "needsCheck": True,
    }
    assert card["futureCommitted"] == 0


def test_card_with_transactions_cannot_be_deleted_only_archived(client: TestClient, nubank: dict):
    expense(client, nubank)

    assert client.delete(f"/api/finance/cards/{nubank['id']}").status_code == 409

    archived = client.patch(f"/api/finance/cards/{nubank['id']}", json={"archived": True})
    assert archived.json()["archived"] is True


def test_empty_card_can_be_deleted(client: TestClient, nubank: dict):
    assert client.delete(f"/api/finance/cards/{nubank['id']}").status_code == 204
    assert client.get("/api/finance/cards").json() == []


def test_invalid_card_days_are_rejected(client: TestClient):
    response = client.post("/api/finance/cards", json={"name": "X", "dueDay": 32, "closingDay": 8})

    assert response.status_code == 422


# ---------- Transactions ----------


def test_card_expense_goes_to_the_suggested_invoice(client: TestClient, nubank: dict):
    before_closing = expense(client, nubank, day="2026-10-05")
    after_closing = expense(client, nubank, day="2026-10-09")

    assert before_closing["invoiceMonth"] == "2026-10"
    assert after_closing["invoiceMonth"] == "2026-11"


def test_invoice_can_be_chosen_by_hand(client: TestClient, nubank: dict):
    chosen = expense(client, nubank, invoiceMonth="2026-12")

    assert chosen["invoiceMonth"] == "2026-12"


def test_pix_and_boleto_have_no_card_or_invoice(client: TestClient, nubank: dict):
    pix = expense(client, None, cardId=nubank["id"], invoiceMonth="2026-11")

    assert (pix["cardId"], pix["invoiceMonth"]) == (None, None)


def test_money_is_exact(client: TestClient, nubank: dict):
    expense(client, nubank, amount=0.1)
    expense(client, nubank, amount=0.2)

    # With float this would be 0.30000000000000004
    assert summary(client)["currentInvoice"]["total"] == 0.3


@pytest.mark.parametrize(
    "overrides",
    [
        {"amount": -10},  # negative
        {"amount": 0},  # zero
        {"amount": 10.555},  # more than 2 decimal places
        {"title": " "},  # empty title
        {"kind": "income"},  # income can't be on a card
        {"cardId": None},  # card expense without a card
    ],
)
def test_invalid_transactions_are_rejected(client: TestClient, nubank: dict, overrides: dict):
    body = {
        "kind": "expense",
        "title": "X",
        "amount": 10,
        "day": "2026-10-28",
        "paymentMethod": "card",
        "cardId": nubank["id"],
    } | overrides

    assert client.post("/api/finance/transactions", json=body).status_code == 422


def test_archived_card_takes_no_new_expenses(client: TestClient, nubank: dict):
    client.patch(f"/api/finance/cards/{nubank['id']}", json={"archived": True})

    response = client.post(
        "/api/finance/transactions",
        json={
            "kind": "expense",
            "title": "X",
            "amount": 10,
            "day": "2026-10-28",
            "paymentMethod": "card",
            "cardId": nubank["id"],
        },
    )

    assert response.status_code == 422


def test_extra_income_can_count_in_available(client: TestClient):
    income = expense(client, None, kind="income", title="Freelance", countInAvailable=True)

    assert income["countInAvailable"] is True


def test_changing_the_date_moves_the_expense_to_another_invoice(client: TestClient, nubank: dict):
    purchase = expense(client, nubank, day="2026-10-05")

    moved = client.patch(f"/api/finance/transactions/{purchase['id']}", json={"day": "2026-10-20"})

    assert moved.json()["invoiceMonth"] == "2026-11"


def test_list_transactions_newest_first_between_dates(client: TestClient):
    expense(client, None, title="A", day="2026-10-01")
    expense(client, None, title="B", day="2026-10-20")
    expense(client, None, title="C", day="2026-09-30")

    response = client.get(
        "/api/finance/transactions", params={"start": "2026-10-01", "end": "2026-10-31"}
    )

    assert [t["title"] for t in response.json()] == ["B", "A"]


# ---------- Installments ----------


def test_installments_fall_in_the_next_invoices(client: TestClient, nubank: dict):
    created = installments(client, nubank)

    assert [(t["installmentNumber"], t["installmentTotal"]) for t in created] == [
        (1, 3),
        (2, 3),
        (3, 3),
    ]
    assert [t["invoiceMonth"] for t in created] == ["2026-11", "2026-12", "2027-01"]
    assert [t["day"] for t in created] == ["2026-10-28", "2026-11-28", "2026-12-28"]
    card = summary(client)
    assert card["currentInvoice"]["total"] == 150
    assert card["futureCommitted"] == 300


def test_installment_bought_on_day_31(client: TestClient, nubank: dict):
    created = installments(client, nubank, day="2026-10-31")

    assert [t["day"] for t in created] == ["2026-10-31", "2026-11-30", "2026-12-31"]


def test_edit_this_and_following_installments(client: TestClient, nubank: dict):
    first, second, _ = installments(client, nubank)

    client.patch(
        f"/api/finance/transactions/{second['id']}",
        params={"scope": "following"},
        json={"amount": 120, "title": "TV 50"},
    )

    by_number = {
        t["installmentNumber"]: (t["title"], t["amount"])
        for t in client.get("/api/finance/transactions").json()
    }
    assert by_number == {1: ("TV", 150), 2: ("TV 50", 120), 3: ("TV 50", 120)}


def test_edit_only_this_installment(client: TestClient, nubank: dict):
    _, second, _ = installments(client, nubank)

    client.patch(f"/api/finance/transactions/{second['id']}", json={"amount": 99})

    amounts = sorted(t["amount"] for t in client.get("/api/finance/transactions").json())
    assert amounts == [99, 150, 150]


def test_delete_this_and_following_installments(client: TestClient, nubank: dict):
    _, second, _ = installments(client, nubank)

    client.delete(f"/api/finance/transactions/{second['id']}", params={"scope": "following"})

    remaining = client.get("/api/finance/transactions").json()
    assert [t["installmentNumber"] for t in remaining] == [1]


def test_following_scope_needs_an_installment(client: TestClient, nubank: dict):
    single = expense(client, nubank)

    response = client.delete(
        f"/api/finance/transactions/{single['id']}", params={"scope": "following"}
    )

    assert response.status_code == 422


# ---------- Invoices ----------


def test_invoice_lists_installments_per_purchase(client: TestClient, nubank: dict):
    installments(client, nubank)
    expense(client, nubank, amount=50.5)

    invoice = client.get(f"/api/finance/cards/{nubank['id']}/invoices/2026-11").json()

    assert invoice["dueDate"] == "2026-11-15"
    assert invoice["closingDate"] == "2026-11-08"
    assert invoice["total"] == 200.5
    labels = [(t["title"], t["installmentNumber"]) for t in invoice["transactions"]]
    assert ("TV", 1) in labels


def test_confirming_the_closing_date_hides_the_alert_and_changes_suggestions(
    client: TestClient, nubank: dict
):
    # This month the November invoice closed early, on 27 Oct
    response = client.put(
        f"/api/finance/cards/{nubank['id']}/invoices/2026-11/closing",
        json={"closingDate": "2026-10-27"},
    )

    assert response.json()["confirmed"] is True
    assert response.json()["closingDate"] == "2026-10-27"
    # Today (28 Oct) is after it: the current invoice is now December's, not checked yet
    assert summary(client)["currentInvoice"]["month"] == "2026-12"
    assert expense(client, nubank)["invoiceMonth"] == "2026-12"


def test_paying_an_invoice_is_not_a_new_expense(client: TestClient, nubank: dict):
    expense(client, nubank)

    paid = client.put(
        f"/api/finance/cards/{nubank['id']}/invoices/2026-11/paid", json={"paid": True}
    ).json()

    assert paid["paid"] is True
    assert paid["paidAt"] is not None
    assert len(client.get("/api/finance/transactions").json()) == 1


def test_invoice_month_in_the_url_is_validated(client: TestClient, nubank: dict):
    response = client.get(f"/api/finance/cards/{nubank['id']}/invoices/2026-13")

    assert response.status_code == 422


def test_suggested_invoice_for_a_purchase_day(client: TestClient, nubank: dict):
    response = client.get(
        f"/api/finance/cards/{nubank['id']}/suggested-invoice", params={"day": "2026-10-09"}
    )

    assert response.json() == {"month": "2026-11", "dueDate": "2026-11-15"}

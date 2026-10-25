"""Fixed bills, pots, salary, available and month summary. Fixed clock: 28 Oct 2026."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_now
from app.main import app


@pytest.fixture(autouse=True)
def fixed_clock(client: TestClient):
    app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 28, 12, 0)


def post(client: TestClient, url: str, body: dict) -> dict:
    response = client.post(url, json=body)
    assert response.status_code in (200, 201), response.text
    return response.json()


def available(client: TestClient) -> dict:
    return client.get("/api/finance/available").json()


def set_salary(client: TestClient, amount: float = 4500, day: int = 5) -> None:
    client.put("/api/finance/salary", json={"amount": amount, "day": day})


# ---------- Salary ----------


def test_salary_starts_unconfigured(client: TestClient):
    assert client.get("/api/finance/salary").json() == {
        "amount": 0,
        "day": 5,
        "configured": False,
    }


def test_set_salary(client: TestClient):
    set_salary(client, 5200.5, 10)

    assert client.get("/api/finance/salary").json() == {
        "amount": 5200.5,
        "day": 10,
        "configured": True,
    }


# ---------- Fixed bills ----------


def test_bills_of_the_month(client: TestClient):
    post(client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5})
    post(client, "/api/finance/fixed-bills", {"name": "Gás", "amount": 90, "dueDay": 10})

    month = client.get("/api/finance/fixed-bills", params={"month": "2026-10"}).json()

    assert [(b["bill"]["name"], b["amount"], b["dueDate"]) for b in month["bills"]] == [
        ("Aluguel", 1200, "2026-10-05"),
        ("Gás", 90, "2026-10-10"),
    ]
    assert month["pendingTotal"] == 1290


def test_edit_this_months_value_and_pay(client: TestClient):
    gas = post(client, "/api/finance/fixed-bills", {"name": "Gás", "amount": 90, "dueDay": 10})

    paid = client.put(
        f"/api/finance/fixed-bills/{gas['id']}/months/2026-10", json={"amount": 110, "paid": True}
    ).json()

    assert (paid["amount"], paid["paid"]) == (110, True)
    assert paid["paidAt"] is not None
    october = client.get("/api/finance/fixed-bills", params={"month": "2026-10"}).json()
    assert october["pendingTotal"] == 0
    # The next month starts from the last value (section 9.4)
    november = client.get("/api/finance/fixed-bills", params={"month": "2026-11"}).json()
    assert (november["bills"][0]["amount"], november["bills"][0]["paid"]) == (110, False)


def test_unpay_a_bill(client: TestClient):
    gas = post(client, "/api/finance/fixed-bills", {"name": "Gás", "amount": 90, "dueDay": 10})
    url = f"/api/finance/fixed-bills/{gas['id']}/months/2026-10"
    client.put(url, json={"paid": True})

    unpaid = client.put(url, json={"paid": False}).json()

    assert (unpaid["paid"], unpaid["paidAt"]) == (False, None)


def test_delete_bill(client: TestClient):
    gas = post(client, "/api/finance/fixed-bills", {"name": "Gás", "amount": 90, "dueDay": 10})

    assert client.delete(f"/api/finance/fixed-bills/{gas['id']}").status_code == 204
    assert client.get("/api/finance/fixed-bills", params={"month": "2026-10"}).json()["bills"] == []


# ---------- Pots ----------


def test_pots_deposit_withdraw_and_total(client: TestClient):
    trip = post(client, "/api/finance/pots", {"name": "Viagem"})
    post(client, "/api/finance/pots", {"name": "Emergência"})

    post(client, f"/api/finance/pots/{trip['id']}/deposit", {"amount": 500})
    after = post(client, f"/api/finance/pots/{trip['id']}/withdraw", {"amount": 150})

    assert after["balance"] == 350
    pots = client.get("/api/finance/pots").json()
    assert [p["name"] for p in pots["pots"]] == ["Emergência", "Viagem"]
    assert pots["total"] == 350


def test_cannot_withdraw_more_than_the_pot_has(client: TestClient):
    trip = post(client, "/api/finance/pots", {"name": "Viagem"})
    post(client, f"/api/finance/pots/{trip['id']}/deposit", {"amount": 100})

    response = client.post(f"/api/finance/pots/{trip['id']}/withdraw", json={"amount": 101})

    assert response.status_code == 422


def test_pot_with_money_cannot_be_deleted(client: TestClient):
    trip = post(client, "/api/finance/pots", {"name": "Viagem"})
    post(client, f"/api/finance/pots/{trip['id']}/deposit", {"amount": 100})

    assert client.delete(f"/api/finance/pots/{trip['id']}").status_code == 422

    post(client, f"/api/finance/pots/{trip['id']}/withdraw", {"amount": 100})
    assert client.delete(f"/api/finance/pots/{trip['id']}").status_code == 204


def test_saving_reduces_available_but_adjusting_does_not(client: TestClient):
    set_salary(client)
    trip = post(client, "/api/finance/pots", {"name": "Viagem"})

    post(client, f"/api/finance/pots/{trip['id']}/deposit", {"amount": 500})
    assert available(client)["total"] == 4000

    client.put(f"/api/finance/pots/{trip['id']}/balance", json={"balance": 1000})
    assert available(client)["total"] == 4000  # correction only

    post(client, f"/api/finance/pots/{trip['id']}/withdraw", {"amount": 200})
    assert available(client)["total"] == 4200


def test_deleting_an_adjusted_pot_does_not_change_available(client: TestClient):
    set_salary(client)
    trip = post(client, "/api/finance/pots", {"name": "Viagem"})
    post(client, f"/api/finance/pots/{trip['id']}/deposit", {"amount": 100})
    client.put(f"/api/finance/pots/{trip['id']}/balance", json={"balance": 0})

    client.delete(f"/api/finance/pots/{trip['id']}")

    assert available(client)["total"] == 4400


# ---------- Available and summary (section 9.6) ----------


def test_available_with_everything(client: TestClient):
    set_salary(client)  # 4500, day 5 -> cycle 5 Oct .. 4 Nov
    post(client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5})
    nubank = post(client, "/api/finance/cards", {"name": "Nubank", "dueDay": 15, "closingDay": 8})
    # 5 Oct, before closing on the 8th: October invoice, due 15 Oct (in the cycle)
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "expense",
            "title": "Mercado",
            "amount": 300,
            "day": "2026-10-05",
            "paymentMethod": "card",
            "cardId": nubank["id"],
        },
    )
    # 20 Oct: November invoice, due 15 Nov -> next cycle, doesn't count now
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "expense",
            "title": "Farmácia",
            "amount": 65,
            "day": "2026-10-20",
            "paymentMethod": "card",
            "cardId": nubank["id"],
        },
    )
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "expense",
            "title": "Presente",
            "amount": 80,
            "day": "2026-10-27",
            "paymentMethod": "pix",
        },
    )
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "income",
            "title": "Freela",
            "amount": 200,
            "day": "2026-10-20",
            "paymentMethod": "pix",
            "countInAvailable": True,
        },
    )
    pot = post(client, "/api/finance/pots", {"name": "Viagem"})
    post(client, f"/api/finance/pots/{pot['id']}/deposit", {"amount": 500})

    result = available(client)

    assert result == {
        "cycleStart": "2026-10-05",
        "cycleLastDay": "2026-11-04",
        "daysLeft": 8,
        "salary": 4500,
        "fixedBills": 1200,
        "invoices": 300,
        "oneOffExpenses": 80,
        "saved": 500,
        "extraIncome": 200,
        "total": 2620,  # 4500 - 1200 - 300 - 80 - 500 + 200
        "weeksLeft": 2,
        "perWeek": 1310,
    }


def test_month_summary(client: TestClient):
    set_salary(client)
    post(client, "/api/finance/fixed-bills", {"name": "Aluguel", "amount": 1200, "dueDay": 5})
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "expense",
            "title": "Presente",
            "amount": 80,
            "day": "2026-10-27",
            "paymentMethod": "pix",
        },
    )
    post(
        client,
        "/api/finance/transactions",
        {
            "kind": "income",
            "title": "Freela",
            "amount": 600,
            "day": "2026-10-20",
            "paymentMethod": "pix",
        },
    )

    summary = client.get("/api/finance/summary", params={"month": "2026-10"}).json()

    assert summary == {"month": "2026-10", "income": 5100, "expenses": 1280, "balance": 3820}

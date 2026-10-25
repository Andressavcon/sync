"""Fills the development user with fictional demo data (for screenshots and trying the app).

    uv run python -m scripts.seed_demo

Only runs without login (development or the public demo): it ERASES the development user's
data first. The demo service runs it on every start, so each start begins with fresh data.
Everything goes through the real API (like an integration test), so every business rule applies.
Dates are relative to today, so the data always looks fresh.
"""

import sys
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, date, datetime, time, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.auth import DEV_USER_EMAIL
from app.core.clock import get_now, get_utc_now
from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.modules.users.models import User

client = TestClient(app)


def call(method: str, url: str, json: dict | None = None) -> dict | list | None:
    response = client.request(method, url, json=json)
    if response.status_code >= 400:
        sys.exit(f"{method} {url} failed ({response.status_code}): {response.text}")
    return response.json() if response.content else None


def post(url: str, json: dict | None = None):
    return call("POST", url, json)


def put(url: str, json: dict):
    return call("PUT", url, json)


def patch(url: str, json: dict):
    return call("PATCH", url, json)


@contextmanager
def pretend_today_is(day: date) -> Iterator[None]:
    """Moves the API clock to another day (past workout days are read-only "today")."""
    moment = datetime.combine(day, time(19, 0))
    app.dependency_overrides[get_now] = lambda: moment
    app.dependency_overrides[get_utc_now] = lambda: moment.replace(tzinfo=UTC) + timedelta(hours=3)
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def reset_dev_user() -> None:
    """Deletes the development user; ON DELETE CASCADE removes all of its data."""
    with SessionLocal() as db:
        db.execute(delete(User).where(User.email == DEV_USER_EMAIL))
        db.commit()


# ---------- Kanban ----------


def seed_kanban(today: date) -> None:
    tag = {
        name: post("/api/tags", {"name": name})["id"]
        for name in ["Trabalho", "Pessoal", "Casa", "Estudos", "Saúde"]
    }
    week_start = today - timedelta(days=today.weekday())

    # (day of the week, time, title, tags, notes)
    week_cards = [
        (0, "09:00", "Reunião de planejamento da sprint", ["Trabalho"], ""),
        (0, "19:30", "Mercado da semana", ["Casa"], ""),
        (1, "17:00", "Enviar relatório mensal", ["Trabalho"], ""),
        (1, "12:00", "Pagar a conta de luz", ["Casa"], ""),
        (2, "15:30", "Consulta no dentista", ["Saúde"], "Levar a carteirinha do convênio."),
        (2, "20:00", "Estudar FastAPI: dependências", ["Estudos"], ""),
        (3, "10:00", "Revisar o PR do módulo de login", ["Trabalho"], ""),
        (3, "18:00", "Ligar para a vó", ["Pessoal"], ""),
        (4, "14:00", "Entregar o protótipo para o cliente", ["Trabalho"], ""),
        (4, "21:00", "Cinema com a Ju", ["Pessoal"], ""),
        (5, "10:00", "Faxina e organizar o armário", ["Casa"], ""),
        (5, "16:00", "Escrever o post do Log de Dev", ["Estudos", "Pessoal"], ""),
        (6, "09:00", "Feira", ["Casa"], "Frutas da estação, ovos e flores."),
        (6, "20:00", "Planejar a semana", ["Pessoal"], ""),
    ]
    late_title = "Enviar relatório mensal"  # left undone, to show the late icon
    for weekday, hour, title, tags, notes in week_cards:
        day = week_start + timedelta(days=weekday)
        if day < today:
            status = "pending" if title == late_title else "done"
        elif day == today:
            status = "in_progress" if hour < "12:00" else "pending"
        else:
            status = "pending"
        post(
            "/api/cards",
            {
                "title": title,
                "content": notes,
                "status": status,
                "dueDate": day.isoformat(),
                "dueTime": hour,
                "tagIds": [tag[t] for t in tags],
            },
        )

    # Overdue: from a past week
    post(
        "/api/cards",
        {
            "title": "Renovar a CNH",
            "content": "Agendar no site do Detran e levar o comprovante de residência.",
            "dueDate": (week_start - timedelta(days=3)).isoformat(),
            "dueTime": "11:00",
            "tagIds": [tag["Pessoal"]],
        },
    )

    # Upcoming events, with reminders
    for days_ahead, hour, title, tags, remind in [
        (9, "19:00", "Aniversário da Ana", ["Pessoal"], 14),
        (16, "09:00", "Prova da certificação AWS", ["Estudos"], 30),
        (30, "08:00", "Viagem para a praia", ["Pessoal"], 7),
        (45, "14:00", "Check-up anual", ["Saúde"], None),
    ]:
        post(
            "/api/cards",
            {
                "title": title,
                "dueDate": (today + timedelta(days=days_ahead)).isoformat(),
                "dueTime": hour,
                "tagIds": [tag[t] for t in tags],
                "remindDaysBefore": remind,
            },
        )

    # Recurring task: occurrences already past this week are marked as done
    post(
        "/api/recurrences",
        {
            "title": "Aula de inglês",
            "content": "Revisar o vocabulário da aula anterior.",
            "dueTime": "19:00",
            "tagIds": [tag["Estudos"]],
            "frequency": "weekly",
            "weekdays": [1, 3],
            "startDate": week_start.isoformat(),
        },
    )
    board = call("GET", "/api/kanban/board")
    for column in board["days"]:
        for item in column["cards"]:
            card = item["card"]
            if card["recurrenceId"] and date.fromisoformat(card["dueDate"]) < today:
                patch(f"/api/cards/{card['id']}", {"status": "done"})


# ---------- Shopping list ----------


def seed_shopping(today: date) -> None:
    category = {c["name"]: c["id"] for c in call("GET", "/api/shopping/categories")}
    if not category:  # the defaults are created when the list is first opened
        call("GET", "/api/shopping/list")
        category = {c["name"]: c["id"] for c in call("GET", "/api/shopping/categories")}

    def add(name: str, where: str, quantity: str = "", important: bool = False) -> str:
        item = {"name": name, "categoryId": category[where], "quantity": quantity}
        return post("/api/shopping/items", item | {"important": important})["id"]

    # Two previous purchases: archived lists feed the suggestions
    past_purchases = [
        [
            ("Banana", "Hortifruti"),
            ("Tomate", "Hortifruti"),
            ("Peito de frango", "Açougue"),
            ("Pão integral", "Padaria"),
            ("Leite", "Laticínios"),
            ("Café", "Mercearia"),
            ("Arroz", "Mercearia"),
            ("Detergente", "Limpeza"),
            ("Pasta de dente", "Higiene"),
        ],
        [
            ("Banana", "Hortifruti"),
            ("Alface", "Hortifruti"),
            ("Carne moída", "Açougue"),
            ("Leite", "Laticínios"),
            ("Iogurte", "Laticínios"),
            ("Café", "Mercearia"),
            ("Feijão", "Mercearia"),
            ("Sabão em pó", "Limpeza"),
            ("Pilhas", "Outros"),
        ],
    ]
    for weeks_ago, items in zip([2, 1], past_purchases, strict=True):
        for name, where in items:
            patch(f"/api/shopping/items/{add(name, where)}", {"purchased": True})
        with pretend_today_is(today - timedelta(weeks=weeks_ago)):
            post("/api/shopping/list/complete")

    # The current list: some items already in the cart
    add("Café", "Mercearia", "2 pacotes", important=True)
    add("Leite", "Laticínios", "6 caixas", important=True)
    add("Ração da Mel", "Outros", "1 saco", important=True)
    in_cart = [
        add("Banana", "Hortifruti", "1 dúzia"),
        add("Pão integral", "Padaria"),
    ]
    add("Tomate", "Hortifruti", "1 kg")
    add("Cebola", "Hortifruti", "500 g")
    add("Abacate", "Hortifruti", "2")
    add("Peito de frango", "Açougue", "1 kg")
    add("Queijo muçarela", "Laticínios", "300 g")
    add("Arroz", "Mercearia", "5 kg")
    add("Azeite", "Mercearia")
    add("Água sanitária", "Limpeza")
    add("Esponja", "Limpeza", "4")
    add("Shampoo", "Higiene")
    add("Vela de aniversário", "Outros")
    for item_id in in_cart:
        patch(f"/api/shopping/items/{item_id}", {"purchased": True})


# ---------- Workouts ----------


def seed_workouts(today: date) -> None:
    metabolic = post("/api/workouts/programs", {"name": "Metabólico 21 dias", "sessionCount": 21})
    circuits = [
        ["Polichinelo", "Agachamento com salto", "Prancha", "Burpee", "Mountain climber"],
        ["Corrida estacionária", "Afundo alternado", "Abdominal bicicleta", "Flexão", "Skater"],
        ["Pular corda", "Agachamento sumô", "Prancha lateral", "Burpee", "Abdominal remador"],
    ]
    for session in metabolic["sessions"]:
        exercises = circuits[(session["number"] - 1) % len(circuits)]
        steps = [{"type": "time", "name": "Aquecimento", "durationSec": 180, "restSec": 30}]
        steps += [
            {"type": "time", "name": name, "durationSec": 40, "restSec": 20} for name in exercises
        ]
        steps.append({"type": "reps", "name": "Abdominal", "sets": 3, "reps": 20, "restSec": 30})
        put(f"/api/workouts/sessions/{session['id']}", {"steps": steps})

    strength = post(
        "/api/workouts/standalone",
        {
            "name": "Força: membros inferiores",
            "steps": [
                {"type": "reps", "name": "Agachamento livre", "sets": 4, "reps": 12, "restSec": 60},
                {"type": "reps", "name": "Stiff", "sets": 4, "reps": 10, "restSec": 90},
                {"type": "reps", "name": "Elevação pélvica", "sets": 3, "reps": 15, "restSec": 60},
                {"type": "time", "name": "Alongamento", "durationSec": 300},
            ],
        },
    )
    run = post(
        "/api/workouts/standalone",
        {"name": "Corrida", "steps": [{"type": "distance", "name": "Corrida leve", "km": 5}]},
    )
    yoga = post(
        "/api/workouts/standalone",
        {
            "name": "Yoga pós-treino",
            "steps": [
                {"type": "time", "name": "Respiração", "durationSec": 120},
                {"type": "time", "name": "Postura do cachorro", "durationSec": 60, "restSec": 10},
                {"type": "time", "name": "Postura da criança", "durationSec": 90, "restSec": 10},
                {"type": "time", "name": "Torção deitada", "durationSec": 60},
            ],
        },
    )

    def add_block(day: date, source: tuple[str, str], state: str) -> None:
        source_type, source_id = source
        block = post(
            f"/api/workouts/days/{day.isoformat()}/blocks",
            {"sourceType": source_type, "sourceId": source_id},
        )
        if state != "not_started":
            patch(f"/api/workouts/blocks/{block['id']}", {"state": state})

    sessions = metabolic["sessions"]
    session_number = 0
    # This month and the 5 days before today: about 5 days a week, done
    first_day = min(today.replace(day=1), today - timedelta(days=5))
    day = first_day
    while day < today:
        rest_day = day.weekday() == 6 or (day.weekday() == 2 and (today - day).days > 7)
        if not rest_day and day != today - timedelta(days=2):  # one missed day, to show it
            with pretend_today_is(day):
                add_block(day, ("session", sessions[session_number % len(sessions)]["id"]), "done")
                session_number += 1
                if day.weekday() in (1, 3):
                    add_block(day, ("standalone", run["id"]), "done")
                if day.weekday() == 5:
                    add_block(day, ("standalone", strength["id"]), "done")
                add_block(day, ("standalone", yoga["id"]), "done")
        day += timedelta(days=1)

    # Today: one done, one in progress, one not started
    add_block(today, ("session", sessions[session_number % len(sessions)]["id"]), "done")
    add_block(today, ("standalone", run["id"]), "in_progress")
    add_block(today, ("standalone", yoga["id"]), "not_started")


# ---------- Finance ----------


def seed_finance(today: date) -> None:
    put("/api/finance/salary", {"amount": 6500, "day": 5})

    card = {
        name: post("/api/finance/cards", {"name": name, "dueDay": due, "closingDay": closing})["id"]
        for name, due, closing in [
            ("Nubank", 15, 8),
            ("Banco do Brasil", 10, 3),
            ("Mercado Pago", 20, 13),
        ]
    }

    def expense(days_ago: int, title: str, amount: float, method: str, card_name: str = ""):
        data = {
            "kind": "expense",
            "title": title,
            "amount": amount,
            "day": (today - timedelta(days=days_ago)).isoformat(),
            "paymentMethod": method,
        }
        if card_name:
            data["cardId"] = card[card_name]
        post("/api/finance/transactions", data)

    for days_ago, title, amount, method, card_name in [
        (1, "SUPERMERCADO", 412.37, "card", "Nubank"),
        (2, "iFood", 68.90, "card", "Nubank"),
        (3, "Farmácia", 54.20, "card", "Mercado Pago"),
        (4, "Uber", 23.45, "card", "Nubank"),
        (5, "Feira", 47.00, "pix", ""),
        (6, "Posto de gasolina", 220.00, "card", "Banco do Brasil"),
        (8, "Spotify", 21.90, "card", "Nubank"),
        (9, "Cabeleireiro", 120.00, "pix", ""),
        (11, "Netflix", 44.90, "card", "Mercado Pago"),
        (12, "Padaria", 32.50, "pix", ""),
        (14, "Curso de inglês", 189.00, "boleto", ""),
        (16, "Restaurante", 96.80, "card", "Banco do Brasil"),
        (19, "Pet shop", 135.60, "card", "Mercado Pago"),
        (23, "SUPERMERCADO", 387.15, "card", "Nubank"),
    ]:
        expense(days_ago, title, amount, method, card_name)

    post(
        "/api/finance/transactions",
        {
            "kind": "income",
            "title": "Freela: landing page",
            "amount": 800,
            "day": (today - timedelta(days=7)).isoformat(),
            "paymentMethod": "pix",
            "countInAvailable": False,
        },
    )

    for months_ago, title, amount, count, card_name in [
        (4, "Notebook", 350.00, 12, "Nubank"),
        (1, "Geladeira", 289.90, 10, "Banco do Brasil"),
        (0, "Tênis de corrida", 166.33, 3, "Mercado Pago"),
    ]:
        post(
            "/api/finance/transactions/installments",
            {
                "title": title,
                "installmentAmount": amount,
                "installments": count,
                "day": (today - timedelta(days=30 * months_ago + 2)).isoformat(),
                "cardId": card[card_name],
            },
        )

    # Nubank's closing date already checked this month; the others still show the alert
    summary = {c["card"]["name"]: c for c in call("GET", "/api/finance/cards")}
    nubank_month = summary["Nubank"]["currentInvoice"]["month"]
    year, month = map(int, nubank_month.split("-"))
    put(
        f"/api/finance/cards/{card['Nubank']}/invoices/{nubank_month}/closing",
        {"closingDate": date(year, month, 8).isoformat()},
    )

    month_key = today.strftime("%Y-%m")
    for name, amount, due_day in [
        ("Aluguel", 1800.00, 10),
        ("Condomínio", 450.00, 10),
        ("Energia", 180.00, 12),
        ("Internet", 119.90, 15),
        ("Celular", 59.90, 20),
        ("Gás", 95.00, 25),
    ]:
        bill = post("/api/finance/fixed-bills", {"name": name, "amount": amount, "dueDay": due_day})
        if due_day <= today.day - 3:
            put(f"/api/finance/fixed-bills/{bill['id']}/months/{month_key}", {"paid": True})

    for name, deposit, balance in [
        ("Viagem", 300, 1450),
        ("Emergência", 0, 3800),
        ("Presente da Ana", 120, 0),
    ]:
        pot = post("/api/finance/pots", {"name": name})
        if balance:
            put(f"/api/finance/pots/{pot['id']}/balance", {"balance": balance})
        if deposit:
            post(f"/api/finance/pots/{pot['id']}/deposit", {"amount": deposit})


def main() -> None:
    if settings.environment == "production" or settings.supabase_url:
        sys.exit("Demo data is only for development mode (no SUPABASE_URL).")

    today = get_now().date()
    reset_dev_user()
    seed_kanban(today)
    seed_shopping(today)
    seed_workouts(today)
    seed_finance(today)
    print(f"Demo data created for {DEV_USER_EMAIL} ({settings.database_url}).")


if __name__ == "__main__":
    main()

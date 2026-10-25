# Sync. — Back-end

Python + FastAPI + SQLAlchemy + Alembic.

```bash
uv sync                                  # install dependencies (creates .venv)
uv run alembic upgrade head              # create/update the database
uv run fastapi dev app/main.py           # development server: http://localhost:8000
uv run pytest                            # tests
uv run ruff check . && uv run ruff format .   # lint + format
```

Interactive API docs: http://localhost:8000/docs

Configuration: copy `.env.example` to `.env`. Without `SUPABASE_URL` there is no login and a
development user is used.

## Modules (`app/modules/`)

| Module | What it does | Pure rules (tested without database) |
|---|---|---|
| `kanban` | Tags, cards, week board, recurring cards | `board.py`, `recurrence.py` |
| `shopping` | Categories, items, archived lists, suggestions | — |
| `workouts` | Library (programs, standalone), day blocks, timer progress, history | — |
| `finance` | Cards, invoices, transactions, installments, fixed bills, pots, salary, available money | `invoices.py`, `available.py` |
| `notifications` | In-app reminders of cards | `rules.py` |
| `settings` | User preferences | — |
| `dashboard` | Home screen: only reads the other modules | — |

Each module has `models.py` (tables), `schemas.py` (JSON in/out), `repository.py` (queries),
`service.py` (rules) and `router.py` (endpoints).

Architecture and conventions: see the [main README](../README.md#architecture).

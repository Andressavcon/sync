# Sync. — Back-end

Python + FastAPI + SQLAlchemy.

```bash
uv sync                                  # install dependencies (creates .venv)
uv run fastapi dev app/main.py           # development server: http://localhost:8000
uv run pytest                            # tests
uv run ruff check . && uv run ruff format .   # lint + format
```

Interactive API docs: http://localhost:8000/docs

Architecture and conventions: see [docs/documentacao.md](../docs/documentacao.md), section 16.

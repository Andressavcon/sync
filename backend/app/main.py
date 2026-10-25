from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import register_exception_handlers
from app.modules.kanban.router import router as kanban_router

app = FastAPI(title=settings.app_name, version="0.1.0")
register_exception_handlers(app)
app.include_router(kanban_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    """Checks that the API is up and the database answers."""
    db.execute(text("SELECT 1"))
    return {"status": "ok"}

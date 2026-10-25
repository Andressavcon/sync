from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import register_exception_handlers
from app.modules.dashboard.router import router as dashboard_router
from app.modules.finance.router import router as finance_router
from app.modules.kanban.router import router as kanban_router
from app.modules.notifications.router import router as notifications_router
from app.modules.settings.router import router as settings_router
from app.modules.shopping.router import router as shopping_router
from app.modules.workouts.router import router as workouts_router

app = FastAPI(title=settings.app_name, version="0.1.0")
register_exception_handlers(app)
app.include_router(kanban_router)
app.include_router(shopping_router)
app.include_router(workouts_router)
app.include_router(finance_router)
app.include_router(settings_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)

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

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser
from app.core.clock import Now
from app.core.database import DbSession
from app.modules.dashboard.schemas import DashboardRead
from app.modules.dashboard.service import DashboardService


def get_dashboard_service(db: DbSession) -> DashboardService:
    return DashboardService(db)


ServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardRead)
def get_dashboard(user: CurrentUser, service: ServiceDep, now: Now) -> DashboardRead:
    """Everything the home screen shows, in one request."""
    return service.get(user.id, now)

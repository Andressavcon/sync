from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser
from app.core.database import DbSession
from app.modules.settings.models import UserSettings
from app.modules.settings.schemas import SettingsRead, SettingsUpdate
from app.modules.settings.service import SettingsService


def get_settings_service(db: DbSession) -> SettingsService:
    return SettingsService(db)


ServiceDep = Annotated[SettingsService, Depends(get_settings_service)]

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
def get_settings(user: CurrentUser, service: ServiceDep) -> UserSettings:
    return service.get(user.id)


@router.patch("", response_model=SettingsRead)
def update_settings(data: SettingsUpdate, user: CurrentUser, service: ServiceDep) -> UserSettings:
    return service.update(user.id, data)

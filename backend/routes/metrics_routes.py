from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_roles
from ..database import get_db
from ..models.user import UserRole, User
from ..schemas.common import success_response
from ..services.metrics_service import admin_metrics


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/admin")
def get_admin_metrics(db: Session = Depends(get_db), _: User = Depends(require_roles([UserRole.admin]))):
    payload = admin_metrics(db)
    return success_response(payload)

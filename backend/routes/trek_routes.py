from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..cache import (
    get_cached_json,
    invalidate_trek_cache,
    set_cached_json,
    trek_detail_cache_key,
    trek_list_cache_key,
)
from ..database import get_db
from ..models.user import UserRole, User
from ..schemas.common import success_response
from ..schemas.treks import TrekCreateRequest, TrekUpdateRequest
from ..services import trek_service


router = APIRouter(prefix="/treks", tags=["treks"])


def _trek_to_dict(t):
    return {
        "id": t.id,
        "name": t.name,
        "location": t.location,
        "difficulty": t.difficulty.value,
        "duration_days": t.duration_days,
        "available_slots": t.available_slots,
        "max_slots": t.max_slots,
        "staff_id": t.assigned_staff_id,
        "status": t.status.value,
        "start_date": t.start_date,
        "end_date": t.end_date,
        "description": t.description,
        "price": t.price,
        "image_url": t.image_url,
    }


@router.get("")
async def list_treks(
    search: str | None = None,
    difficulty: str | None = None,
    location: str | None = None,
    duration_max: int | None = None,
    db: Session = Depends(get_db),
):
    cache_params = {
        "search": search or "",
        "difficulty": difficulty or "",
        "location": location or "",
        "duration_max": duration_max or "",
    }
    cache_key = trek_list_cache_key(cache_params)
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return success_response(cached, message="OK (cached)")

    treks = trek_service.list_treks(db, search, difficulty, location, duration_max)
    payload = [_trek_to_dict(t) for t in treks]
    await set_cached_json(cache_key, payload, ttl_seconds=600)
    return success_response(payload)


@router.get("/{trek_id}")
async def get_trek(trek_id: int, db: Session = Depends(get_db)):
    cache_key = trek_detail_cache_key(trek_id)
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return success_response(cached, message="OK (cached)")

    trek = trek_service.get_trek_or_404(db, trek_id)
    payload = _trek_to_dict(trek)
    await set_cached_json(cache_key, payload, ttl_seconds=600)
    return success_response(payload)


@router.post("")
async def create_trek(
    payload: TrekCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    trek = trek_service.create_trek(db, payload.model_dump())
    await invalidate_trek_cache(trek.id)
    return success_response(_trek_to_dict(trek), message="Trek created")


@router.patch("/{trek_id}")
async def update_trek(
    trek_id: int,
    payload: TrekUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trek = trek_service.get_trek_or_404(db, trek_id)
    updates = payload.model_dump(exclude_unset=True)

    if current_user.role == UserRole.admin:
        updated = trek_service.update_trek_admin(db, trek, updates)
        await invalidate_trek_cache(trek_id)
        return success_response(_trek_to_dict(updated), message="Trek updated")

    if current_user.role == UserRole.staff:
        updated = trek_service.update_trek_staff(db, trek, current_user, updates)
        await invalidate_trek_cache(trek_id)
        return success_response(_trek_to_dict(updated), message="Trek updated")

    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.delete("/{trek_id}")
async def delete_trek(
    trek_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    trek = trek_service.get_trek_or_404(db, trek_id)
    trek_service.delete_trek(db, trek)
    await invalidate_trek_cache(trek_id)
    return success_response({"ok": True}, message="Trek deleted")

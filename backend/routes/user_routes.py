from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models.user import UserRole, User
from ..schemas.common import success_response
from ..schemas.users import StaffCreateRequest, UserUpdateRequest, MyProfileUpdateRequest
from ..services import user_service


router = APIRouter(prefix="/users", tags=["users"])


def _user_public(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role.value,
        "active": u.active,
        "blacklisted": u.blacklisted,
        "phone": u.phone or "",
        "bio": u.bio or "",
        "avatar": u.avatar_url or "",
        "joined": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("")
def list_users(
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    users = user_service.search_users(db, q or "") if q else user_service.list_users(db)
    payload = [_user_public(u) for u in users]
    return success_response(payload)


@router.post("/staff")
def create_staff(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    staff_user = user_service.create_staff_user(db, payload.name, payload.email, payload.password)
    return success_response(_user_public(staff_user), message="Staff created")


# /me must come before /{user_id} so the literal path wins
@router.patch("/me")
def update_my_profile(
    payload: MyProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes")
    updated = user_service.update_user_admin(db, current_user, updates)
    return success_response(_user_public(updated), message="Profile updated")


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return success_response(_user_public(current_user))


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    user = user_service.get_user_or_404(db, user_id)
    return success_response(_user_public(user))


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    user = user_service.get_user_or_404(db, user_id)
    updated = user_service.update_user_admin(db, user, payload.model_dump(exclude_unset=True))
    return success_response(_user_public(updated), message="User updated")

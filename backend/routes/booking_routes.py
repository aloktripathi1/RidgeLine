from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..cache import invalidate_trek_cache
from ..database import get_db
from ..models.booking import Booking, BookingStatus
from ..models.user import UserRole, User
from ..schemas.bookings import BookingCreateRequest, BookingUpdateRequest, BookingExportRequest
from ..schemas.common import success_response
from ..services import booking_service, trek_service
from ..tasks.tasks import export_booking_history_csv


router = APIRouter(prefix="/bookings", tags=["bookings"])


def _booking_to_dict(b, include_user: bool, include_trek: bool):
    payload = {
        "id": b.id,
        "user_id": b.user_id,
        "trek_id": b.trek_id,
        "booked_on": b.booking_date,
        "status": b.status.value,
    }
    if include_trek and b.trek is not None:
        t = b.trek
        payload["trek"] = {
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
    if include_user and b.user is not None:
        u = b.user
        payload["user"] = {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "active": u.active,
            "blacklisted": u.blacklisted,
        }
    return payload


@router.get("/me")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.trekker])),
):
    bookings = booking_service.list_my_bookings(db, current_user.id)
    payload = [_booking_to_dict(b, include_user=False, include_trek=True) for b in bookings]
    return success_response(payload)


@router.get("")
def all_bookings(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    from sqlalchemy.orm import selectinload
    bookings = (
        db.query(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.trek))
        .order_by(Booking.booking_date.desc(), Booking.id.desc())
        .all()
    )
    payload = [_booking_to_dict(b, include_user=True, include_trek=True) for b in bookings]
    return success_response(payload)


@router.get("/trek/{trek_id}")
def trek_bookings(
    trek_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trek = trek_service.get_trek_or_404(db, trek_id)

    is_admin = current_user.role == UserRole.admin
    is_assigned_staff = current_user.role == UserRole.staff and trek.assigned_staff_id == current_user.id
    if not is_admin and not is_assigned_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    bookings = booking_service.list_bookings_for_trek(db, trek_id)
    payload = [_booking_to_dict(b, include_user=True, include_trek=False) for b in bookings]
    return success_response(payload)


@router.post("")
async def create_booking(
    payload: BookingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.trekker])),
):
    trek = trek_service.get_trek_or_404(db, payload.trek_id)
    booking = booking_service.create_booking(db, current_user, trek)
    await invalidate_trek_cache(trek.id)
    return success_response(_booking_to_dict(booking, include_user=False, include_trek=False), message="Booked")


@router.patch("/{booking_id}")
async def update_booking(
    booking_id: int,
    payload: BookingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = booking_service.get_booking_or_404(db, booking_id)

    if payload.status == BookingStatus.Cancelled.value:
        if current_user.role != UserRole.trekker:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trekkers can cancel their own bookings")
        updated = booking_service.cancel_booking(db, booking, current_user)
        await invalidate_trek_cache(updated.trek_id)
        return success_response(_booking_to_dict(updated, include_user=False, include_trek=False), message="Cancelled")

    if payload.status == BookingStatus.Completed.value:
        if current_user.role != UserRole.staff:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned staff can mark bookings complete")
        updated = booking_service.complete_booking_by_staff(db, booking, current_user)
        await invalidate_trek_cache(updated.trek_id)
        return success_response(_booking_to_dict(updated, include_user=False, include_trek=False), message="Completed")

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported booking update")


@router.post("/export")
def export_bookings(
    _: BookingExportRequest,
    current_user: User = Depends(require_roles([UserRole.trekker])),
):
    async_result = export_booking_history_csv.delay(user_id=current_user.id)
    return success_response({"job_id": async_result.id, "status": "queued"}, message="Export queued")

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models.booking import Booking, BookingStatus
from ..models.notification import Notification
from ..models.user import User, UserRole
from ..schemas.common import success_response
from ..services.notification_service import push

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "read": n.read,
        "link": n.link,
        "created_at": n.created_at.isoformat(),
    }


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread = sum(1 for n in notifs if not n.read)
    return success_response({"notifications": [_to_dict(n) for n in notifs], "unread": unread})


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,  # noqa: E712
    ).update({"read": True})
    db.commit()
    return success_response(None, "All notifications marked as read")


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.get(Notification, notif_id)
    if not n or n.user_id != current_user.id:
        raise HTTPException(404, "Notification not found")
    n.read = True
    db.commit()
    return success_response(None)


class BroadcastRequest(BaseModel):
    trek_id: int
    title: str
    body: str
    type: str = "info"


@router.post("/broadcast")
def broadcast(
    payload: BroadcastRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
):
    bookings = (
        db.query(Booking)
        .filter(
            Booking.trek_id == payload.trek_id,
            Booking.status.in_([BookingStatus.Booked, BookingStatus.Completed]),
        )
        .all()
    )
    for b in bookings:
        push(db, b.user_id, payload.title, payload.body, payload.type, link="#/me/bookings")
    db.commit()
    return success_response({"sent": len(bookings)}, f"Broadcast sent to {len(bookings)} trekkers")

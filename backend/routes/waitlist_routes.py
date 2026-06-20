from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models.trek import Trek
from ..models.user import User
from ..models.waitlist import WaitlistEntry
from ..schemas.common import success_response

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.post("/{trek_id}")
def join_waitlist(
    trek_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trek = db.get(Trek, trek_id)
    if not trek:
        raise HTTPException(404, "Trek not found")
    if trek.available_slots > 0:
        raise HTTPException(400, "Trek still has open slots — book directly")

    existing = db.query(WaitlistEntry).filter(
        WaitlistEntry.trek_id == trek_id,
        WaitlistEntry.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(409, "Already on the waitlist for this trek")

    entry = WaitlistEntry(trek_id=trek_id, user_id=current_user.id, joined_at=datetime.utcnow())
    db.add(entry)
    db.commit()

    position = db.query(WaitlistEntry).filter(WaitlistEntry.trek_id == trek_id).count()
    return success_response({"position": position}, f"Added to waitlist — you are #{position}")


@router.delete("/{trek_id}")
def leave_waitlist(
    trek_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.trek_id == trek_id,
        WaitlistEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(404, "You are not on this waitlist")
    db.delete(entry)
    db.commit()
    return success_response(None, "Removed from waitlist")


@router.get("/me")
def my_waitlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(WaitlistEntry)
        .filter(WaitlistEntry.user_id == current_user.id)
        .order_by(WaitlistEntry.joined_at)
        .all()
    )
    trek_ids = {e.trek_id for e in entries}
    treks = {t.id: t for t in db.query(Trek).filter(Trek.id.in_(trek_ids)).all()} if trek_ids else {}

    result = []
    for e in entries:
        trek = treks.get(e.trek_id)
        position = (
            db.query(WaitlistEntry)
            .filter(WaitlistEntry.trek_id == e.trek_id, WaitlistEntry.joined_at <= e.joined_at)
            .count()
        )
        result.append({
            "trek_id": e.trek_id,
            "trek_name": trek.name if trek else "—",
            "trek_location": trek.location if trek else "",
            "trek_start_date": trek.start_date if trek else None,
            "position": position,
            "joined_at": e.joined_at.isoformat(),
        })
    return success_response(result)


@router.get("/check/{trek_id}")
def check_waitlist(
    trek_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.trek_id == trek_id,
        WaitlistEntry.user_id == current_user.id,
    ).first()
    on_list = entry is not None
    position = None
    if on_list:
        position = (
            db.query(WaitlistEntry)
            .filter(WaitlistEntry.trek_id == trek_id, WaitlistEntry.joined_at <= entry.joined_at)
            .count()
        )
    return success_response({"on_waitlist": on_list, "position": position})

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.booking import Booking, BookingStatus
from ..models.trek import TrekStatus, Trek
from ..models.user import User


def list_my_bookings(db: Session, user_id: int) -> list[Booking]:
    return (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .order_by(Booking.booking_date.desc(), Booking.id.desc())
        .all()
    )


def list_bookings_for_trek(db: Session, trek_id: int) -> list[Booking]:
    return (
        db.query(Booking)
        .filter(Booking.trek_id == trek_id)
        .order_by(Booking.booking_date.desc(), Booking.id.desc())
        .all()
    )


def _has_active_booking(db: Session, user_id: int, trek_id: int) -> bool:
    existing = (
        db.query(Booking)
        .filter(
            Booking.user_id == user_id,
            Booking.trek_id == trek_id,
            Booking.status == BookingStatus.Booked,
        )
        .first()
    )
    return existing is not None


def create_booking(db: Session, user: User, trek: Trek) -> Booking:
    if trek.status != TrekStatus.Open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trek is not open for booking")
    if trek.available_slots <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No slots available")
    if _has_active_booking(db, user.id, trek.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an active booking for this trek")

    now = datetime.utcnow()
    booking = Booking(
        user_id=user.id,
        trek_id=trek.id,
        booking_date=now,
        status=BookingStatus.Booked,
    )
    trek.available_slots -= 1

    db.add(booking)
    db.add(trek)
    db.commit()
    db.refresh(booking)
    return booking


def get_booking_or_404(db: Session, booking_id: int) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


def cancel_booking(db: Session, booking: Booking, user: User) -> Booking:
    if booking.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify someone else's booking")
    if booking.status != BookingStatus.Booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only booked reservations can be cancelled")

    booking.status = BookingStatus.Cancelled
    trek = booking.trek
    if trek is not None:
        trek.available_slots += 1
        if trek.available_slots > trek.max_slots:
            trek.available_slots = trek.max_slots
        db.add(trek)
        # Notify the first person on the waitlist that a slot opened up
        _notify_next_on_waitlist(db, trek)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def _notify_next_on_waitlist(db: Session, trek) -> None:
    from ..models.waitlist import WaitlistEntry
    from ..services.notification_service import push

    next_entry = (
        db.query(WaitlistEntry)
        .filter(WaitlistEntry.trek_id == trek.id)
        .order_by(WaitlistEntry.joined_at)
        .first()
    )
    if next_entry:
        push(
            db,
            next_entry.user_id,
            title=f"A slot opened on {trek.name}!",
            body="A cancellation just freed up a spot. Book now before it fills again.",
            type="success",
            link="#/catalog",
        )


def complete_booking_by_staff(db: Session, booking: Booking, staff_user: User) -> Booking:
    trek = booking.trek
    if trek is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking has no trek")
    if trek.assigned_staff_id != staff_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned staff can update bookings for this trek")
    if booking.status != BookingStatus.Booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only booked reservations can be completed")

    booking.status = BookingStatus.Completed
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

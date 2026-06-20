from __future__ import annotations

from datetime import date, datetime, timedelta
import csv
import os
from pathlib import Path

from sqlalchemy.orm import Session

from ..database import session_scope
from ..models.booking import Booking, BookingStatus
from ..models.trek import Trek
from ..models.user import User, UserRole
from ..services.email_service import send_email
from .celery_app import celery_app


def _exports_dir() -> Path:
    base = Path(__file__).resolve().parent.parent
    exports = base / "exports"
    exports.mkdir(parents=True, exist_ok=True)
    return exports


def _upcoming_treks(db: Session, start: date, end: date) -> list[Trek]:
    return (
        db.query(Trek)
        .filter(Trek.start_date >= start, Trek.start_date <= end)
        .order_by(Trek.start_date.asc())
        .all()
    )


@celery_app.task(
    name="ridgeline.backend.tasks.tasks.daily_upcoming_treks_reminder",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=120,
)
def daily_upcoming_treks_reminder() -> dict:
    today = date.today()
    horizon = today + timedelta(days=7)

    with session_scope() as db:
        treks = _upcoming_treks(db, today, horizon)
        if not treks:
            return {"sent": 0}

        bookings = db.query(Booking).filter(Booking.status == BookingStatus.Booked).all()

        trek_ids = {t.id for t in treks}
        relevant = [b for b in bookings if b.trek_id in trek_ids]

        sent = 0
        for booking in relevant:
            user = db.query(User).filter(User.id == booking.user_id).first()
            trek = db.query(Trek).filter(Trek.id == booking.trek_id).first()
            if user is None or trek is None:
                continue

            subject = f"Upcoming trek reminder: {trek.name}"
            html = (
                f"<h3>Upcoming trek</h3>"
                f"<p><strong>{trek.name}</strong> starts on <strong>{trek.start_date}</strong>.</p>"
                f"<p>Please arrive on time and carry essentials as per the instructions.</p>"
            )
            send_email(user.email, subject, html)
            sent += 1

        return {"sent": sent}


@celery_app.task(
    name="ridgeline.backend.tasks.tasks.monthly_admin_report",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=300,
)
def monthly_admin_report() -> dict:
    now = datetime.utcnow()
    first_day_this_month = datetime(now.year, now.month, 1)
    last_month_end = first_day_this_month - timedelta(days=1)
    last_month_start = datetime(last_month_end.year, last_month_end.month, 1)

    with session_scope() as db:
        admin = (
            db.query(User)
            .filter(User.role == UserRole.admin)
            .order_by(User.id.asc())
            .first()
        )
        if admin is None:
            return {"sent": 0}

        bookings = (
            db.query(Booking)
            .filter(Booking.booking_date >= last_month_start, Booking.booking_date <= last_month_end)
            .all()
        )
        treks_conducted_ids = {b.trek_id for b in bookings if b.status != BookingStatus.Cancelled}
        treks_conducted = db.query(Trek).filter(Trek.id.in_(treks_conducted_ids)).all() if treks_conducted_ids else []

        users_participated_ids = {b.user_id for b in bookings if b.status != BookingStatus.Cancelled}
        users_participated = (
            db.query(User).filter(User.id.in_(users_participated_ids)).all() if users_participated_ids else []
        )

        popularity: dict[int, int] = {}
        for b in bookings:
            if b.status == BookingStatus.Cancelled:
                continue
            popularity[b.trek_id] = popularity.get(b.trek_id, 0) + 1

        popular_sorted = sorted(popularity.items(), key=lambda x: x[1], reverse=True)[:5]
        popular_lines = []
        for trek_id, count in popular_sorted:
            trek = db.query(Trek).filter(Trek.id == trek_id).first()
            if trek is None:
                continue
            popular_lines.append(f"<li>{trek.name}: {count} participants</li>")

        html = (
            f"<h2>Monthly Admin Report</h2>"
            f"<p>Period: {last_month_start.date()} to {last_month_end.date()}</p>"
            f"<ul>"
            f"<li>Treks conducted: {len(treks_conducted)}</li>"
            f"<li>Users participated: {len(users_participated)}</li>"
            f"</ul>"
            f"<h3>Popular treks</h3>"
            f"<ol>{''.join(popular_lines) or '<li>No activity</li>'}</ol>"
        )

        send_email(admin.email, "Ridgeline · Monthly Admin Report", html)
        return {"sent": 1}


@celery_app.task(
    name="ridgeline.backend.tasks.tasks.export_booking_history_csv",
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
)
def export_booking_history_csv(user_id: int) -> dict:
    with session_scope() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            return {"ok": False, "reason": "User not found"}

        bookings = (
            db.query(Booking)
            .filter(Booking.user_id == user_id)
            .order_by(Booking.booking_date.desc())
            .all()
        )
        exports_dir = _exports_dir()
        filename = f"bookings_user_{user_id}.csv"
        path = exports_dir / filename

        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["booking_id", "trek_id", "trek_name", "booking_date", "status"]) 
            for booking in bookings:
                trek = booking.trek
                writer.writerow(
                    [
                        booking.id,
                        booking.trek_id,
                        trek.name if trek else "",
                        booking.booking_date.isoformat(),
                        booking.status.value,
                    ]
                )

        html = (
            f"<p>Your booking history export is ready.</p>"
            f"<p>File: <strong>{path.name}</strong></p>"
            f"<p>(In this demo, files are saved on the server at {path.as_posix()})</p>"
        )
        send_email(user.email, "Ridgeline · Your bookings CSV is ready", html)

        return {"ok": True, "path": str(path)}

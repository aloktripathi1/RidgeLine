from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from ..models.booking import Booking, BookingStatus
from ..models.trek import Trek, TrekStatus
from ..models.user import User


def admin_metrics(db: Session) -> dict:
    treks = db.query(Trek).all()
    users = db.query(User).all()
    bookings = db.query(Booking).all()

    total_treks = len(treks)
    active_users = len([u for u in users if u.active and not u.blacklisted])
    total_bookings = len(bookings)
    open_treks = len([t for t in treks if t.status == TrekStatus.Open])

    popular_rows: list[dict] = []
    for trek in treks:
        non_cancelled = [b for b in bookings if b.trek_id == trek.id and b.status != BookingStatus.Cancelled]
        popular_rows.append({"trek": trek.name, "booked": len(non_cancelled)})
    popular_rows.sort(key=lambda x: x["booked"], reverse=True)
    popular = popular_rows[:6]

    trend = _booking_trend_last_6_months(bookings)

    return {
        "total_treks": total_treks,
        "active_users": active_users,
        "total_bookings": total_bookings,
        "open_treks": open_treks,
        "popular": popular,
        "trend": trend,
    }


def _booking_trend_last_6_months(bookings: list[Booking]) -> list[dict]:
    now = datetime.utcnow()
    # month buckets: include current month and previous 5
    months: list[tuple[int, int]] = []
    year = now.year
    month = now.month
    for _ in range(6):
        months.append((year, month))
        month -= 1
        if month <= 0:
            month = 12
            year -= 1
    months.reverse()

    counts = defaultdict(int)
    for booking in bookings:
        dt = booking.booking_date
        counts[(dt.year, dt.month)] += 1

    out: list[dict] = []
    for y, m in months:
        label = datetime(y, m, 1).strftime("%b")
        out.append({"month": label, "bookings": counts[(y, m)]})
    return out

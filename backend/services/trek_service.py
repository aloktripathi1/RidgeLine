from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.trek import Trek, TrekDifficulty, TrekStatus
from ..models.user import User

import logging
logger = logging.getLogger(__name__)


def _parse_difficulty(value: str) -> TrekDifficulty:
    try:
        return TrekDifficulty(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid difficulty")


def _parse_status(value: str) -> TrekStatus:
    try:
        return TrekStatus(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid trek status")


def _compute_end_date(start_date: date, duration_days: int) -> date:
    if duration_days <= 0:
        return start_date
    return start_date + timedelta(days=duration_days - 1)


def list_treks(
    db: Session,
    search: str | None,
    difficulty: str | None,
    location: str | None,
    duration_max: int | None,
) -> list[Trek]:
    query = db.query(Trek)

    if difficulty:
        difficulty_enum = _parse_difficulty(difficulty)
        query = query.filter(Trek.difficulty == difficulty_enum)

    if location:
        query = query.filter(Trek.location == location)

    if duration_max is not None:
        query = query.filter(Trek.duration_days <= duration_max)

    if search:
        cleaned = search.strip().lower()
        if cleaned:
            like = f"%{cleaned}%"
            query = query.filter(
                (Trek.name.ilike(like))
                | (Trek.location.ilike(like))
                | (Trek.description.ilike(like))
            )

    return query.order_by(Trek.start_date.asc(), Trek.id.asc()).all()


def get_trek_or_404(db: Session, trek_id: int) -> Trek:
    trek = db.query(Trek).filter(Trek.id == trek_id).first()
    if trek is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trek not found")
    return trek


def create_trek(db: Session, payload: dict) -> Trek:
    now = datetime.utcnow()

    max_slots = int(payload["max_slots"])
    available_slots_value = payload.get("available_slots")
    if available_slots_value is None:
        available_slots = max_slots
    else:
        available_slots = int(available_slots_value)

    if available_slots > max_slots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Available slots cannot exceed max slots")

    duration_days = int(payload["duration_days"])
    start_date = payload["start_date"]

    end_date = payload.get("end_date")
    if end_date is None:
        end_date = _compute_end_date(start_date, duration_days)

    trek = Trek(
        name=payload["name"],
        location=payload["location"],
        difficulty=_parse_difficulty(payload["difficulty"]),
        duration_days=duration_days,
        available_slots=available_slots,
        max_slots=max_slots,
        assigned_staff_id=payload.get("staff_id"),
        status=_parse_status(payload.get("status") or TrekStatus.Pending.value),
        start_date=start_date,
        end_date=end_date,
        description=payload["description"],
        price=int(payload["price"]),
        image_url=payload.get("image_url"),
        created_at=now,
        updated_at=now,
    )
    db.add(trek)
    db.commit()
    db.refresh(trek)
    return trek


def update_trek_admin(db: Session, trek: Trek, payload: dict) -> Trek:
    now = datetime.utcnow()

    # Accept frontend field name alias.
    if "staff_id" in payload and "assigned_staff_id" not in payload:
        payload["assigned_staff_id"] = payload.get("staff_id")

    if "difficulty" in payload and payload["difficulty"] is not None:
        trek.difficulty = _parse_difficulty(payload["difficulty"])

    if "status" in payload and payload["status"] is not None:
        trek.status = _parse_status(payload["status"])

    for field_name in [
        "name",
        "location",
        "duration_days",
        "available_slots",
        "max_slots",
        "assigned_staff_id",
        "start_date",
        "end_date",
        "description",
        "price",
        "image_url",
    ]:
        if field_name not in payload:
            continue
        field_value = payload[field_name]
        if field_value is None:
            continue
        setattr(trek, field_name, field_value)

    if trek.available_slots > trek.max_slots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Available slots cannot exceed max slots")
    if trek.available_slots < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Available slots cannot be negative")

    if trek.end_date is None:
        trek.end_date = _compute_end_date(trek.start_date, trek.duration_days)

    trek.updated_at = now
    db.add(trek)
    db.commit()
    db.refresh(trek)
    return trek


def update_trek_staff(db: Session, trek: Trek, staff_user: User, payload: dict) -> Trek:
    if trek.assigned_staff_id != staff_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned staff can modify this trek")

    allowed_fields = {"available_slots", "status"}
    filtered_payload: dict = {}
    for key, value in payload.items():
        if key not in allowed_fields:
            continue
        if value is None:
            continue
        filtered_payload[key] = value

    now = datetime.utcnow()
    if "available_slots" in filtered_payload:
        new_slots = int(filtered_payload["available_slots"])
        if new_slots < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Available slots cannot be negative")
        if new_slots > trek.max_slots:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Available slots cannot exceed max slots")
        trek.available_slots = new_slots

    if "status" in filtered_payload:
        trek.status = _parse_status(filtered_payload["status"])

    trek.updated_at = now
    db.add(trek)
    db.commit()
    db.refresh(trek)
    return trek


def delete_trek(db: Session, trek: Trek) -> None:
    db.delete(trek)
    db.commit()

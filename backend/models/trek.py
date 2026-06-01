from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class TrekDifficulty(str, Enum):
    Easy = "Easy"
    Moderate = "Moderate"
    Hard = "Hard"


class TrekStatus(str, Enum):
    Pending = "Pending"
    Approved = "Approved"
    Open = "Open"
    Closed = "Closed"
    Completed = "Completed"


class Trek(Base):
    __tablename__ = "treks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    difficulty: Mapped[TrekDifficulty] = mapped_column(SAEnum(TrekDifficulty), nullable=False, index=True)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)

    available_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    max_slots: Mapped[int] = mapped_column(Integer, nullable=False)

    assigned_staff_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[TrekStatus] = mapped_column(SAEnum(TrekStatus), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    assigned_staff = relationship("User", back_populates="assigned_treks", foreign_keys=[assigned_staff_id])
    bookings = relationship("Booking", back_populates="trek")

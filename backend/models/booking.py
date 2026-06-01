from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class BookingStatus(str, Enum):
    Booked = "Booked"
    Cancelled = "Cancelled"
    Completed = "Completed"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trek_id: Mapped[int] = mapped_column(Integer, ForeignKey("treks.id", ondelete="CASCADE"), index=True)
    booking_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), nullable=False, index=True)

    user = relationship("User", back_populates="bookings")
    trek = relationship("Trek", back_populates="bookings")

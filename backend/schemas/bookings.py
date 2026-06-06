from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from .treks import TrekPublic
from .auth import UserPublic


class BookingPublic(BaseModel):
    id: int
    user_id: int
    trek_id: int
    booked_on: datetime
    status: str
    trek: TrekPublic | None = None
    user: UserPublic | None = None


class BookingCreateRequest(BaseModel):
    user_id: int | None = None
    trek_id: int


class BookingUpdateRequest(BaseModel):
    status: str


class BookingExportRequest(BaseModel):
    userId: int | None = None

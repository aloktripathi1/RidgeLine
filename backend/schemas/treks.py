from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class TrekPublic(BaseModel):
    id: int
    name: str
    location: str
    difficulty: str
    duration_days: int
    available_slots: int
    max_slots: int
    staff_id: int | None
    status: str
    start_date: date
    end_date: date | None
    description: str
    price: int
    image_url: str | None


class TrekCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    location: str = Field(min_length=2, max_length=120)
    difficulty: str
    duration_days: int = Field(ge=1, le=30)
    max_slots: int = Field(ge=1, le=100)
    available_slots: int | None = Field(default=None, ge=0, le=100)
    staff_id: int | None = None
    status: str = "Pending"
    start_date: date
    end_date: date | None = None
    description: str = Field(min_length=20, max_length=2000)
    price: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=500)


class TrekUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=200)
    location: str | None = Field(default=None, min_length=2, max_length=120)
    difficulty: str | None = None
    duration_days: int | None = Field(default=None, ge=1, le=30)
    max_slots: int | None = Field(default=None, ge=1, le=100)
    available_slots: int | None = Field(default=None, ge=0, le=100)
    staff_id: int | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = Field(default=None, min_length=20, max_length=2000)
    price: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=500)

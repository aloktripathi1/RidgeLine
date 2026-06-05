from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class StaffCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    active: bool | None = None
    blacklisted: bool | None = None

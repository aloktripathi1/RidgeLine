from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="At least 8 characters")


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    active: bool
    blacklisted: bool


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserPublic

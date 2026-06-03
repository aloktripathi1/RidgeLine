from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    active: bool
    blacklisted: bool


class AuthResponse(BaseModel):
    token: str
    user: UserPublic

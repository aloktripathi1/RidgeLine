from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, verify_password
from ..database import get_db
from ..models.user import User
from ..schemas.auth import LoginRequest, RegisterRequest
from ..schemas.common import success_response
from ..services.user_service import create_trekker_user, get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.blacklisted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account blacklisted")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    token = create_access_token(user)
    return success_response(
        {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "active": user.active,
                "blacklisted": user.blacklisted,
            },
        },
        message="Logged in",
    )


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = create_trekker_user(db, payload.name, payload.email, payload.password)
    token = create_access_token(user)
    return success_response(
        {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "active": user.active,
                "blacklisted": user.blacklisted,
            },
        },
        message="Registered",
    )

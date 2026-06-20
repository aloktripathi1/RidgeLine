from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from .models.user import User, UserRole
from .settings import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Empty hash means OAuth-only account — password login is not allowed.
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user: User) -> str:
    now = datetime.utcnow()
    expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expires_at = now + expires_delta

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise _unauthorized("Invalid token")

    subject = payload.get("sub")
    if not subject:
        raise _unauthorized("Invalid token subject")

    try:
        user_id = int(subject)
    except ValueError:
        raise _unauthorized("Invalid token subject")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise _unauthorized("User not found")
    if user.blacklisted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account blacklisted")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

    return user


def require_roles(allowed_roles: list[UserRole]):
    def _dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return current_user

    return _dependency

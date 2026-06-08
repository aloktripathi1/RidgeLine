from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..models.user import User, UserRole


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_trekker_user(db: Session, name: str, email: str, password: str) -> User:
    existing = get_user_by_email(db, email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.utcnow()
    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.trekker,
        active=True,
        blacklisted=False,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_staff_user(db: Session, name: str, email: str, password: str) -> User:
    existing = get_user_by_email(db, email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.utcnow()
    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.staff,
        active=True,
        blacklisted=False,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id.asc()).all()


def search_users(db: Session, query: str) -> list[User]:
    cleaned = (query or "").strip().lower()
    if not cleaned:
        return list_users(db)
    like = f"%{cleaned}%"
    return (
        db.query(User)
        .filter((User.name.ilike(like)) | (User.email.ilike(like)))
        .order_by(User.id.asc())
        .all()
    )


def update_user_admin(db: Session, user: User, updates: dict) -> User:
    allowed_fields = {"name", "email", "active", "blacklisted"}
    for field_name, field_value in updates.items():
        if field_name not in allowed_fields:
            continue
        if field_value is None:
            continue
        setattr(user, field_name, field_value)

    user.updated_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

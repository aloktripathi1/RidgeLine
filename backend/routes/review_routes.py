from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models.booking import Booking, BookingStatus
from ..models.review import Review
from ..models.user import User, UserRole
from ..schemas.common import success_response

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    body: str = Field(default="", max_length=1000)


@router.post("")
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.trekker])),
):
    booking = db.get(Booking, payload.booking_id)
    if not booking or booking.user_id != current_user.id:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.Completed:
        raise HTTPException(400, "Reviews are only allowed after completing a trek")

    existing = db.query(Review).filter(Review.booking_id == payload.booking_id).first()
    if existing:
        raise HTTPException(409, "You already submitted a review for this trek")

    review = Review(
        trek_id=booking.trek_id,
        user_id=current_user.id,
        booking_id=payload.booking_id,
        rating=payload.rating,
        body=payload.body,
        created_at=datetime.utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return success_response({"id": review.id}, "Review submitted — thank you!")


@router.get("/trek/{trek_id}")
def trek_reviews(trek_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .filter(Review.trek_id == trek_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    user_ids = {r.user_id for r in reviews}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    result = []
    for r in reviews:
        u = users.get(r.user_id)
        result.append({
            "id": r.id,
            "rating": r.rating,
            "body": r.body,
            "created_at": r.created_at.isoformat(),
            "user_name": u.name if u else "Anonymous",
        })

    avg = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0
    return success_response({
        "reviews": result,
        "avg_rating": avg,
        "count": len(reviews),
    })


@router.get("/my-reviewed-bookings")
def my_reviewed_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reviewed = db.query(Review.booking_id).filter(Review.user_id == current_user.id).all()
    return success_response([r[0] for r in reviewed])

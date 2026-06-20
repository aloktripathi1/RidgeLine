from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from ..models.notification import Notification


def push(
    db: Session,
    user_id: int,
    title: str,
    body: str = "",
    type: str = "info",
    link: str = "",
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        link=link,
        created_at=datetime.utcnow(),
    )
    db.add(n)
    return n

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from .settings import settings


Base = declarative_base()


def _build_sqlite_url(sqlite_path: str) -> str:
    if sqlite_path.startswith("sqlite:"):
        return sqlite_path
    absolute_path = os.path.abspath(sqlite_path)
    return f"sqlite:///{absolute_path}"


engine = create_engine(
    _build_sqlite_url(settings.sqlite_path),
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Session:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Session:
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_database() -> None:
    """Create tables and seed the single Admin user on first run."""

    # Import models so they are registered on Base.metadata.
    from .models import booking  # noqa: F401
    from .models import staff_profile  # noqa: F401
    from .models import trek  # noqa: F401
    from datetime import date, timedelta

    from .models.user import User, UserRole
    from .models.trek import Trek, TrekDifficulty, TrekStatus
    from .models.booking import Booking, BookingStatus
    from .auth import hash_password

    Base.metadata.create_all(bind=engine)

    with session_scope() as db:
        existing_admin = (
            db.query(User)
            .filter(User.role == UserRole.admin)
            .order_by(User.id.asc())
            .first()
        )
        if existing_admin is not None:
            return

        now = datetime.utcnow()
        admin_user = User(
            name=settings.seed_admin_name,
            email=settings.seed_admin_email,
            hashed_password=hash_password(settings.seed_admin_password),
            role=UserRole.admin,
            active=True,
            blacklisted=False,
            created_at=now,
            updated_at=now,
        )
        db.add(admin_user)

        if not settings.seed_demo_data:
            return

        # Demo users that match the frontend's "Try a demo account" buttons.
        staff_1 = User(
            name="Devraj Pawar",
            email="devraj@ridgeline.app",
            hashed_password=hash_password("staff123"),
            role=UserRole.staff,
            active=True,
            blacklisted=False,
            phone="+91 99300 44556",
            bio="Trek leader · wilderness first responder. Specialises in Uttarakhand winter routes.",
            avatar_url="https://i.pravatar.cc/200?img=15",
            created_at=now,
            updated_at=now,
        )
        staff_2 = User(
            name="Karma Lhamo",
            email="karma@ridgeline.app",
            hashed_password=hash_password("staff123"),
            role=UserRole.staff,
            active=True,
            blacklisted=False,
            phone="+91 97400 66778",
            bio="Sikkim & Ladakh specialist. High-altitude expedition lead since 2019.",
            avatar_url="https://i.pravatar.cc/200?img=45",
            created_at=now,
            updated_at=now,
        )
        trekker_1 = User(
            name="Riya Sharma",
            email="riya@trekker.app",
            hashed_password=hash_password("trek123"),
            role=UserRole.trekker,
            active=True,
            blacklisted=False,
            phone="+91 90000 12345",
            bio="Weekend wanderer chasing ridgelines.",
            avatar_url="https://i.pravatar.cc/200?img=47",
            created_at=now,
            updated_at=now,
        )
        trekker_2 = User(
            name="Vikram Iyer",
            email="vikram@trekker.app",
            hashed_password=hash_password("trek123"),
            role=UserRole.trekker,
            active=True,
            blacklisted=False,
            phone="+91 90000 54321",
            bio="Software by day, summits by season.",
            avatar_url="https://i.pravatar.cc/200?img=12",
            created_at=now,
            updated_at=now,
        )
        db.add_all([staff_1, staff_2, trekker_1, trekker_2])
        db.flush()

        def end_date(start: date, duration: int) -> date:
            if duration <= 0:
                return start
            return start + timedelta(days=duration - 1)

        # A small trek catalog so the UI isn't empty on first run.
        trek_1_start = date.today() + timedelta(days=24)
        trek_2_start = date.today() + timedelta(days=32)
        trek_3_start = date.today() + timedelta(days=45)

        treks = [
            Trek(
                name="Hampta Pass Crossing",
                location="Himachal Pradesh",
                difficulty=TrekDifficulty.Moderate,
                duration_days=5,
                max_slots=20,
                available_slots=20,
                assigned_staff_id=staff_1.id,
                status=TrekStatus.Open,
                start_date=trek_1_start,
                end_date=end_date(trek_1_start, 5),
                description="A classic crossover trek from lush valleys to dramatic high-altitude terrain.",
                price=9500,
                image_url="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
            Trek(
                name="Sandakphu Ridge",
                location="West Bengal",
                difficulty=TrekDifficulty.Easy,
                duration_days=6,
                max_slots=18,
                available_slots=18,
                assigned_staff_id=staff_2.id,
                status=TrekStatus.Open,
                start_date=trek_2_start,
                end_date=end_date(trek_2_start, 6),
                description="Walk the spine of the Singalila range with legendary Himalayan panoramas.",
                price=11000,
                image_url="https://images.unsplash.com/photo-1486870591958-9b9d0d1dde9b?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
            Trek(
                name="Rupin Pass",
                location="Uttarakhand",
                difficulty=TrekDifficulty.Hard,
                duration_days=8,
                max_slots=16,
                available_slots=16,
                assigned_staff_id=staff_2.id,
                status=TrekStatus.Open,
                start_date=trek_3_start,
                end_date=end_date(trek_3_start, 8),
                description="Eight days of varied terrain culminating in a high snow pass at 15,250 ft.",
                price=14500,
                image_url="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
        ]
        db.add_all(treks)
        db.flush()

        # Sample bookings to drive staff participants table + admin charts.
        bookings = [
            Booking(
                user_id=trekker_1.id,
                trek_id=treks[0].id,
                booking_date=datetime.utcnow() - timedelta(days=7),
                status=BookingStatus.Booked,
            ),
            Booking(
                user_id=trekker_2.id,
                trek_id=treks[1].id,
                booking_date=datetime.utcnow() - timedelta(days=3),
                status=BookingStatus.Booked,
            ),
        ]
        db.add_all(bookings)

        treks[0].available_slots -= 1
        treks[1].available_slots -= 1
        db.add_all(treks)

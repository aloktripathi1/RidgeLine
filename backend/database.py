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
    from .models import review  # noqa: F401
    from .models import waitlist  # noqa: F401
    from .models import notification  # noqa: F401
    from datetime import date, timedelta

    from .models.user import User, UserRole
    from .models.trek import Trek, TrekDifficulty, TrekStatus
    from .models.booking import Booking, BookingStatus
    from .auth import hash_password
    from sqlalchemy import inspect, text

    Base.metadata.create_all(bind=engine)

    # Inline migration: add oauth_provider column to existing databases.
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("users")}
        if "oauth_provider" not in existing_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)"))
                conn.commit()

    with session_scope() as db:
        now = datetime.utcnow()

        # --- Idempotent data migrations (run on every startup) ---

        # Fix Sandakphu Ridge image: old photo was a generic sunset silhouette;
        # replace with the actual Kanchenjunga range panorama seen from the ridge.
        sandakphu = db.query(Trek).filter(Trek.name == "Sandakphu Ridge").first()
        if sandakphu and "1486870591958" in (sandakphu.image_url or ""):
            sandakphu.image_url = (
                "https://images.unsplash.com/photo-X1fiJchaKF4"
                "?auto=format&fit=crop&w=1200&q=70"
            )

        # Seed the three additional demo treks if they don't exist yet.
        if settings.seed_demo_data:
            _new_names = {"Kedarkantha Peak", "Valley of Flowers", "Pin Parvati Pass"}
            _existing = {
                t.name
                for t in db.query(Trek).filter(Trek.name.in_(_new_names)).all()
            }
            if _new_names - _existing:
                _s1 = db.query(User).filter(User.email == "devraj@ridgeline.app").first()
                _s2 = db.query(User).filter(User.email == "karma@ridgeline.app").first()
                _today = date.today()

                def _end(start: date, days: int) -> date:
                    return start + timedelta(days=days - 1)

                _extra: list[Trek] = []
                if "Kedarkantha Peak" not in _existing and _s1:
                    _t = _today + timedelta(days=55)
                    _extra.append(Trek(
                        name="Kedarkantha Peak",
                        location="Uttarakhand",
                        difficulty=TrekDifficulty.Moderate,
                        duration_days=6,
                        max_slots=15,
                        available_slots=15,
                        assigned_staff_id=_s1.id,
                        status=TrekStatus.Open,
                        start_date=_t,
                        end_date=_end(_t, 6),
                        description="A stunning winter summit trek through snow-clad forests and frozen lakes, reaching 12,500 ft for a 360-degree Himalayan panorama.",
                        price=8500,
                        image_url="https://images.unsplash.com/photo-xvNE3FW8Vd8?auto=format&fit=crop&w=1200&q=70",
                        created_at=now,
                        updated_at=now,
                    ))
                if "Valley of Flowers" not in _existing and _s2:
                    _t = _today + timedelta(days=68)
                    _extra.append(Trek(
                        name="Valley of Flowers",
                        location="Uttarakhand",
                        difficulty=TrekDifficulty.Easy,
                        duration_days=5,
                        max_slots=20,
                        available_slots=20,
                        assigned_staff_id=_s2.id,
                        status=TrekStatus.Open,
                        start_date=_t,
                        end_date=_end(_t, 5),
                        description="A UNESCO World Heritage walk through alpine meadows ablaze with hundreds of Himalayan wildflowers set against the backdrop of Nanda Devi.",
                        price=7500,
                        image_url="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=70",
                        created_at=now,
                        updated_at=now,
                    ))
                if "Pin Parvati Pass" not in _existing and _s1:
                    _t = _today + timedelta(days=80)
                    _extra.append(Trek(
                        name="Pin Parvati Pass",
                        location="Himachal Pradesh",
                        difficulty=TrekDifficulty.Hard,
                        duration_days=11,
                        max_slots=12,
                        available_slots=12,
                        assigned_staff_id=_s1.id,
                        status=TrekStatus.Pending,
                        start_date=_t,
                        end_date=_end(_t, 11),
                        description="One of India's most demanding crossovers linking the lush Parvati Valley to stark Spiti at 17,457 ft across glaciers and moraines.",
                        price=21000,
                        image_url="https://images.unsplash.com/photo-BpkQNEq_LlM?auto=format&fit=crop&w=1200&q=70",
                        created_at=now,
                        updated_at=now,
                    ))
                if _extra:
                    db.add_all(_extra)

        # --- End of data migrations ---

        existing_admin = (
            db.query(User)
            .filter(User.role == UserRole.admin)
            .order_by(User.id.asc())
            .first()
        )
        if existing_admin is not None:
            return
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

        # Trek catalog seeded on first run.
        t1s = date.today() + timedelta(days=24)
        t2s = date.today() + timedelta(days=32)
        t3s = date.today() + timedelta(days=45)
        t4s = date.today() + timedelta(days=55)
        t5s = date.today() + timedelta(days=68)
        t6s = date.today() + timedelta(days=80)

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
                start_date=t1s,
                end_date=end_date(t1s, 5),
                description="A classic crossover trek from lush Kullu valleys to the dramatic moonscape of Lahaul, cresting a high glacial saddle at 14,100 ft.",
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
                start_date=t2s,
                end_date=end_date(t2s, 6),
                description="Walk the spine of the Singalila range to West Bengal's highest peak for the iconic Sleeping Buddha view of Kanchenjunga, Makalu, and Everest.",
                price=11000,
                image_url="https://images.unsplash.com/photo-X1fiJchaKF4?auto=format&fit=crop&w=1200&q=70",
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
                start_date=t3s,
                end_date=end_date(t3s, 8),
                description="Eight days of varied terrain — waterfalls, hanging villages, and snow bridges — culminating in a dramatic high snow pass at 15,250 ft.",
                price=14500,
                image_url="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
            Trek(
                name="Kedarkantha Peak",
                location="Uttarakhand",
                difficulty=TrekDifficulty.Moderate,
                duration_days=6,
                max_slots=15,
                available_slots=15,
                assigned_staff_id=staff_1.id,
                status=TrekStatus.Open,
                start_date=t4s,
                end_date=end_date(t4s, 6),
                description="A stunning winter summit trek through snow-clad forests and frozen lakes, reaching 12,500 ft for a 360-degree Himalayan panorama.",
                price=8500,
                image_url="https://images.unsplash.com/photo-xvNE3FW8Vd8?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
            Trek(
                name="Valley of Flowers",
                location="Uttarakhand",
                difficulty=TrekDifficulty.Easy,
                duration_days=5,
                max_slots=20,
                available_slots=20,
                assigned_staff_id=staff_2.id,
                status=TrekStatus.Open,
                start_date=t5s,
                end_date=end_date(t5s, 5),
                description="A UNESCO World Heritage walk through alpine meadows ablaze with hundreds of Himalayan wildflowers set against the backdrop of Nanda Devi.",
                price=7500,
                image_url="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=70",
                created_at=now,
                updated_at=now,
            ),
            Trek(
                name="Pin Parvati Pass",
                location="Himachal Pradesh",
                difficulty=TrekDifficulty.Hard,
                duration_days=11,
                max_slots=12,
                available_slots=12,
                assigned_staff_id=staff_1.id,
                status=TrekStatus.Pending,
                start_date=t6s,
                end_date=end_date(t6s, 11),
                description="One of India's most demanding crossovers linking the lush Parvati Valley to stark Spiti at 17,457 ft across glaciers and moraines.",
                price=21000,
                image_url="https://images.unsplash.com/photo-BpkQNEq_LlM?auto=format&fit=crop&w=1200&q=70",
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

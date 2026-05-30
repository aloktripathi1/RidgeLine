from __future__ import annotations

from dataclasses import dataclass
import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value or default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    val = raw.strip().lower()
    if val in {"1", "true", "yes", "y", "on"}:
        return True
    if val in {"0", "false", "no", "n", "off"}:
        return False
    return default


@dataclass(frozen=True)
class Settings:
    app_name: str = _env("TMA_APP_NAME", "Trekking Management Application")
    api_prefix: str = _env("TMA_API_PREFIX", "/api")

    sqlite_path: str = _env("TMA_SQLITE_PATH", "./tma.sqlite3")

    jwt_secret_key: str = _env("TMA_JWT_SECRET_KEY", "dev-only-change-me")
    jwt_algorithm: str = _env("TMA_JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = _env_int("TMA_JWT_EXPIRE_MINUTES", 60 * 24)

    redis_url: str = _env("TMA_REDIS_URL", "redis://localhost:6379/0")

    celery_broker_url: str = _env("TMA_CELERY_BROKER_URL", "redis://localhost:6379/1")
    celery_result_backend: str = _env("TMA_CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    celery_timezone: str = _env("TMA_CELERY_TIMEZONE", "Asia/Kolkata")

    seed_admin_email: str = _env("TMA_SEED_ADMIN_EMAIL", "admin@ridgeline.app")
    seed_admin_password: str = _env("TMA_SEED_ADMIN_PASSWORD", "admin123")
    seed_admin_name: str = _env("TMA_SEED_ADMIN_NAME", "Asha Menon")
    seed_demo_data: bool = _env_bool("TMA_SEED_DEMO_DATA", True)

    email_from_address: str = _env("TMA_EMAIL_FROM", "noreply@ridgeline.app")
    email_mode: str = _env("TMA_EMAIL_MODE", "console")  # console | smtp (stub)


settings = Settings()

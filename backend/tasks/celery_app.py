from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from ..settings import settings


celery_app = Celery(
    "tma",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["ridgeline.backend.tasks.tasks"],
)

celery_app.conf.update(
    timezone=settings.celery_timezone,
    enable_utc=True,
    task_track_started=True,
)

celery_app.conf.beat_schedule = {
    "daily-upcoming-treks-reminder": {
        "task": "ridgeline.backend.tasks.tasks.daily_upcoming_treks_reminder",
        "schedule": crontab(minute=0, hour=8),
    },
    "monthly-admin-report": {
        "task": "ridgeline.backend.tasks.tasks.monthly_admin_report",
        "schedule": crontab(minute=0, hour=9, day_of_month=1),
    },
}

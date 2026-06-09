from __future__ import annotations

import logging

from ..settings import settings


logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, html_body: str) -> None:
    """Send an email.

    This project ships with a safe default: "console" mode.
    In real deployments you'd plug SMTP or a provider API.
    """

    if settings.email_mode.lower() == "console":
        logger.info("EMAIL to=%s subject=%s\n%s", to_address, subject, html_body)
        return

    # SMTP provider wiring is intentionally left as a stub.
    logger.warning("Email mode '%s' is not implemented; falling back to console", settings.email_mode)
    logger.info("EMAIL to=%s subject=%s\n%s", to_address, subject, html_body)

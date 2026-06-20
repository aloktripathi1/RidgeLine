from __future__ import annotations

import secrets
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from ..auth import create_access_token
from ..database import get_db
from ..models.user import User, UserRole
from ..services.user_service import get_user_by_email
from ..settings import settings

router = APIRouter(prefix="/auth", tags=["oauth"])

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _callback_uri(request: Request) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/auth/google/callback"


@router.get("/google")
async def google_login(request: Request):
    if not settings.google_client_id:
        return RedirectResponse(url="/#/login?error=google_not_configured")

    state = secrets.token_urlsafe(16)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _callback_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    resp = RedirectResponse(url=f"{_AUTH_URL}?{urlencode(params)}")
    resp.set_cookie("_oauth_state", state, max_age=300, httponly=True, samesite="lax")
    return resp


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    if error:
        return RedirectResponse(url="/#/login?error=oauth_cancelled")

    stored = request.cookies.get("_oauth_state")
    if not state or state != stored:
        return RedirectResponse(url="/#/login?error=state_mismatch")

    async with httpx.AsyncClient(timeout=10) as client:
        tok_resp = await client.post(_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": _callback_uri(request),
            "grant_type": "authorization_code",
        })
        if tok_resp.status_code != 200:
            return RedirectResponse(url="/#/login?error=token_failed")

        access_token = tok_resp.json().get("access_token")

        info_resp = await client.get(
            _USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if info_resp.status_code != 200:
        return RedirectResponse(url="/#/login?error=userinfo_failed")

    ui = info_resp.json()
    email = ui.get("email")
    if not email:
        return RedirectResponse(url="/#/login?error=no_email")

    name = ui.get("name") or email.split("@")[0]
    avatar = ui.get("picture", "")

    user = get_user_by_email(db, email)
    if user is None:
        now = datetime.utcnow()
        user = User(
            name=name,
            email=email,
            hashed_password="",
            oauth_provider="google",
            role=UserRole.trekker,
            active=True,
            blacklisted=False,
            avatar_url=avatar,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.blacklisted or not user.active:
            return RedirectResponse(url="/#/login?error=account_disabled")
        # Link Google to an existing email/password account silently.
        if not user.oauth_provider:
            user.oauth_provider = "google"
            db.commit()

    token = create_access_token(user)
    resp = RedirectResponse(url=f"/#/auth/callback?token={token}")
    resp.delete_cookie("_oauth_state")
    return resp

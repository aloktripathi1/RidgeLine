from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates

from .database import init_database
from .settings import settings
from .routes.auth_routes import router as auth_router
from .routes.trek_routes import router as trek_router
from .routes.user_routes import router as user_router
from .routes.booking_routes import router as booking_router
from .routes.metrics_routes import router as metrics_router


logger = logging.getLogger(__name__)


def _frontend_root() -> Path:
    return Path(__file__).resolve().parents[1] / "frontend"


frontend_root = _frontend_root()
templates = Jinja2Templates(directory=str(frontend_root / "templates"))


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    api = FastAPI(title=settings.app_name)

    @api.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        payload = {"success": False, "data": {}, "message": str(exc.detail), "detail": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=payload)

    @api.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        payload = {
            "success": False,
            "data": {"errors": exc.errors()},
            "message": "Validation error",
            "detail": "Validation error",
        }
        return JSONResponse(status_code=422, content=payload)

    api.include_router(auth_router)
    api.include_router(trek_router)
    api.include_router(user_router)
    api.include_router(booking_router)
    api.include_router(metrics_router)
    app.mount(settings.api_prefix, api)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount(
        "/static",
        StaticFiles(directory=str(frontend_root / "static")),
        name="static",
    )

    @app.on_event("startup")
    def _startup() -> None:
        init_database()
        logger.info("Database ready at %s", settings.sqlite_path)
        logger.info("Seed admin: %s / %s", settings.seed_admin_email, settings.seed_admin_password)

    @app.get("/", response_class=HTMLResponse)
    def index(request: Request):
        return templates.TemplateResponse(
            request,
            "index.html",
            {"api_base": settings.api_prefix},
        )

    return app


app = create_app()

from __future__ import annotations

from typing import Any


def success_response(data: Any, message: str = "OK") -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}


def error_response(message: str, data: Any | None = None) -> dict[str, Any]:
    return {"success": False, "data": data or {}, "message": message}

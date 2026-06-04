from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as redis

from .settings import settings


logger = logging.getLogger(__name__)

TREK_LIST_TTL: int = 600
TREK_DETAIL_TTL: int = 300
USER_LIST_TTL: int = 300

_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        client = redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        _redis_client = client
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable; caching disabled (%s)", exc)
        _redis_client = None
        return None


def trek_list_cache_key(params: dict[str, Any]) -> str:
    stable = json.dumps(params, sort_keys=True, default=str)
    return f"tma:treks:list:{stable}"


def trek_detail_cache_key(trek_id: int) -> str:
    return f"tma:treks:detail:{trek_id}"


async def get_cached_json(key: str) -> Any | None:
    client = await get_redis()
    if client is None:
        return None
    raw = await client.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def set_cached_json(key: str, value: Any, ttl_seconds: int) -> None:
    client = await get_redis()
    if client is None:
        return
    payload = json.dumps(value, default=str)
    await client.setex(key, ttl_seconds, payload)


async def invalidate_trek_cache(trek_id: int | None = None) -> None:
    client = await get_redis()
    if client is None:
        return
    try:
        # Invalidate all trek list caches and optionally one detail.
        list_keys = await client.keys("tma:treks:list:*")
        if list_keys:
            await client.delete(*list_keys)
        if trek_id is not None:
            await client.delete(trek_detail_cache_key(trek_id))
    except Exception as exc:
        logger.warning("Failed to invalidate cache (%s)", exc)

"""Redis client configuration and health diagnostics."""

import time
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

# Global async Redis client
_redis_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    """Returns or initializes the singleton async Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
    return _redis_client


async def close_redis_client() -> None:
    """Closes active Redis connections on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


async def check_redis_connection() -> dict[str, Any]:
    """Pings Redis and measures latency."""
    start_time = time.perf_counter()
    try:
        client = get_redis_client()
        pong = await client.ping()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        if pong:
            return {
                "status": "connected",
                "latency_ms": latency_ms,
            }
        return {
            "status": "degraded",
            "latency_ms": latency_ms,
            "error": "Ping returned unexpected response",
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "disconnected",
            "latency_ms": latency_ms,
            "error": str(e),
        }

"""Lightweight asynchronous rate limiter with Redis and in-memory fallback."""

import logging
import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)

# In-memory sliding-window cache: key -> list of timestamps
_in_memory_rate_cache: dict[str, list[float]] = defaultdict(list)


class RateLimiter:
    """FastAPI dependency for endpoint rate limiting.

    Supports Redis with automatic in-memory fallback. Automatically bypassed in testing mode.
    """

    def __init__(self, requests_per_minute: int = 60, burst_limit: int | None = None) -> None:
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.burst_limit = burst_limit or requests_per_minute

    async def __call__(self, request: Request) -> None:
        # Bypass rate limiting in testing mode to preserve test speed and reliability
        if settings.APP_ENV == "testing" or not settings.RATE_LIMITING_ENABLED:
            return

        # Determine client identifier (IP or Authenticated User ID)
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or (
            request.client.host if request.client else "unknown_client"
        )
        endpoint = request.url.path
        rate_key = f"rate_limit:{client_ip}:{endpoint}"
        now = time.time()

        try:
            redis_client = get_redis_client()
            # Try Redis sliding window using sorted sets or increment key
            current_minute = int(now // self.window_seconds)
            redis_key = f"{rate_key}:{current_minute}"

            # Increment count
            count = await redis_client.incr(redis_key)
            if count == 1:
                await redis_client.expire(redis_key, self.window_seconds + 5)

            if count > self.requests_per_minute:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Rate limit exceeded: Maximum {self.requests_per_minute} "
                        "requests per minute allowed."
                    ),
                    headers={"Retry-After": str(self.window_seconds)},
                )
            return
        except HTTPException:
            raise
        except Exception as err:
            logger.debug(
                "Redis rate limiting unavailable (%s), falling back to in-memory: %s", rate_key, err
            )

        # In-Memory Fallback
        cutoff = now - self.window_seconds
        timestamps = [t for t in _in_memory_rate_cache[rate_key] if t > cutoff]
        if len(timestamps) >= self.requests_per_minute:
            _in_memory_rate_cache[rate_key] = timestamps
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: Maximum {self.requests_per_minute} "
                    "requests per minute allowed."
                ),
                headers={"Retry-After": str(self.window_seconds)},
            )

        timestamps.append(now)
        _in_memory_rate_cache[rate_key] = timestamps


def rate_limit(requests_per_minute: int = 60) -> Callable:
    """Factory helper for rate limiting dependencies."""
    return RateLimiter(requests_per_minute=requests_per_minute)

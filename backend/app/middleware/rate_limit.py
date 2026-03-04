"""
Rate limiting middleware for RostraCore API.

Uses Redis for distributed rate limiting that persists across restarts.
Falls back to in-memory storage if Redis is unavailable.
"""

import time
import logging
from typing import Dict, Tuple, Optional
from collections import defaultdict
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


def _get_redis_client():
    """Get a Redis client, or None if Redis is unavailable."""
    try:
        import redis
        client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
        client.ping()
        return client
    except Exception as e:
        logger.warning(f"Redis unavailable for rate limiting, using in-memory fallback: {e}")
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.

    Tracks requests per IP address and enforces limits:
    - Per minute limit (default: 60 requests)
    - Per hour limit (default: 1000 requests)

    Storage:
    - Primary: Redis (persists across restarts, works in distributed deployments)
    - Fallback: In-memory dictionary (if Redis is unavailable)
    """

    def __init__(self, app):
        super().__init__(app)

        # Try to connect to Redis
        self._redis: Optional[object] = _get_redis_client()

        # In-memory fallback storage
        self._memory_store: Dict[str, list] = defaultdict(list)

        # Rate limits from config
        self.per_minute_limit = settings.RATE_LIMIT_PER_MINUTE
        self.per_hour_limit = settings.RATE_LIMIT_PER_HOUR

        # Whitelisted paths (no rate limiting)
        self.whitelist_paths = [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]

        storage_type = "Redis" if self._redis else "in-memory"
        logger.info(f"Rate limiter initialized with {storage_type} storage")

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxy headers."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        if request.client:
            return request.client.host

        return "unknown"

    def _check_rate_limit_redis(self, ip: str, current_time: float) -> Tuple[bool, str, int]:
        """Check rate limit using Redis sliding window."""
        try:
            minute_key = f"rate:{ip}:minute"
            hour_key = f"rate:{ip}:hour"
            now_ms = int(current_time * 1000)

            pipe = self._redis.pipeline()

            # Remove expired entries and count remaining
            one_minute_ago = now_ms - 60_000
            one_hour_ago = now_ms - 3_600_000

            # Minute window
            pipe.zremrangebyscore(minute_key, 0, one_minute_ago)
            pipe.zcard(minute_key)

            # Hour window
            pipe.zremrangebyscore(hour_key, 0, one_hour_ago)
            pipe.zcard(hour_key)

            results = pipe.execute()
            minute_count = results[1]
            hour_count = results[3]

            # Check per-minute limit
            if minute_count >= self.per_minute_limit:
                return (False, f"Rate limit exceeded: {self.per_minute_limit} requests per minute", 60)

            # Check per-hour limit
            if hour_count >= self.per_hour_limit:
                return (False, f"Rate limit exceeded: {self.per_hour_limit} requests per hour", 300)

            # Record this request
            pipe2 = self._redis.pipeline()
            pipe2.zadd(minute_key, {str(now_ms): now_ms})
            pipe2.expire(minute_key, 120)  # TTL: 2 minutes
            pipe2.zadd(hour_key, {str(now_ms): now_ms})
            pipe2.expire(hour_key, 7200)  # TTL: 2 hours
            pipe2.execute()

            return (True, "", 0)

        except Exception as e:
            logger.warning(f"Redis rate limit check failed, allowing request: {e}")
            return (True, "", 0)

    def _check_rate_limit_memory(self, ip: str, current_time: float) -> Tuple[bool, str, int]:
        """Check rate limit using in-memory storage (fallback)."""
        one_minute_ago = current_time - 60
        one_hour_ago = current_time - 3600

        # Clean old entries
        if ip in self._memory_store:
            self._memory_store[ip] = [t for t in self._memory_store[ip] if t > one_hour_ago]
            if not self._memory_store[ip]:
                del self._memory_store[ip]

        entries = self._memory_store.get(ip, [])

        minute_count = sum(1 for t in entries if t > one_minute_ago)
        hour_count = len(entries)

        if minute_count >= self.per_minute_limit:
            return (False, f"Rate limit exceeded: {self.per_minute_limit} requests per minute", 60)

        if hour_count >= self.per_hour_limit:
            return (False, f"Rate limit exceeded: {self.per_hour_limit} requests per hour", 300)

        # Record request
        self._memory_store[ip].append(current_time)

        return (True, "", 0)

    async def dispatch(self, request: Request, call_next):
        """Process each request through rate limiting."""
        if not settings.ENABLE_RATE_LIMITING:
            return await call_next(request)

        if request.url.path in self.whitelist_paths:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        current_time = time.time()

        # Use Redis if available, otherwise fall back to memory
        if self._redis:
            is_allowed, error_message, retry_after = self._check_rate_limit_redis(client_ip, current_time)
        else:
            is_allowed, error_message, retry_after = self._check_rate_limit_memory(client_ip, current_time)

        if not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": error_message,
                    "retry_after": retry_after,
                    "type": "rate_limit_exceeded"
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit-Minute": str(self.per_minute_limit),
                    "X-RateLimit-Limit-Hour": str(self.per_hour_limit),
                }
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit-Minute"] = str(self.per_minute_limit)
        response.headers["X-RateLimit-Limit-Hour"] = str(self.per_hour_limit)

        return response


class LoginRateLimiter:
    """
    Specialized rate limiter for login attempts.
    Uses Redis when available, in-memory fallback otherwise.

    Limits: 5 failed login attempts per IP per 15 minutes.
    """

    def __init__(self):
        self._redis = _get_redis_client()
        self._memory_store: Dict[str, list] = defaultdict(list)
        self.max_attempts = 5
        self.window_seconds = 900  # 15 minutes

    def check_and_record(self, ip: str, was_successful: bool) -> Tuple[bool, int]:
        """Check if login is allowed and record the attempt."""
        if self._redis:
            return self._check_redis(ip, was_successful)
        return self._check_memory(ip, was_successful)

    def _check_redis(self, ip: str, was_successful: bool) -> Tuple[bool, int]:
        """Redis-backed login rate check."""
        try:
            key = f"login_fails:{ip}"
            failed_count = self._redis.get(key)
            failed_count = int(failed_count) if failed_count else 0

            if failed_count >= self.max_attempts:
                ttl = self._redis.ttl(key)
                return (False, max(ttl, 0))

            if not was_successful:
                pipe = self._redis.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.window_seconds)
                pipe.execute()

            remaining = self.max_attempts - failed_count - (0 if was_successful else 1)
            return (True, remaining)
        except Exception:
            return (True, self.max_attempts)

    def _check_memory(self, ip: str, was_successful: bool) -> Tuple[bool, int]:
        """In-memory login rate check (fallback)."""
        current_time = time.time()
        cutoff = current_time - self.window_seconds

        if ip in self._memory_store:
            self._memory_store[ip] = [
                (ts, ok) for ts, ok in self._memory_store[ip] if ts > cutoff
            ]
            if not self._memory_store[ip]:
                del self._memory_store[ip]

        failed = sum(1 for _, ok in self._memory_store.get(ip, []) if not ok)

        if failed >= self.max_attempts:
            oldest = min(ts for ts, _ in self._memory_store[ip])
            retry_after = int(oldest + self.window_seconds - current_time)
            return (False, retry_after)

        self._memory_store.setdefault(ip, []).append((current_time, was_successful))
        remaining = self.max_attempts - failed - (0 if was_successful else 1)
        return (True, remaining)


# Global instance
login_rate_limiter = LoginRateLimiter()

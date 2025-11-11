"""
Rate limiting middleware for RostraCore API.

This middleware provides protection against brute force attacks by limiting
the number of requests from a single IP address within a time window.

For MVP: Uses in-memory storage (resets on server restart)
For Production: Should be upgraded to Redis for distributed rate limiting
"""

import time
from typing import Dict, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.

    Tracks requests per IP address and enforces limits:
    - Per minute limit (default: 60 requests)
    - Per hour limit (default: 1000 requests)

    Storage:
    - MVP: In-memory dictionary (simple, but resets on restart)
    - Production: Should use Redis for distributed systems
    """

    def __init__(self, app):
        super().__init__(app)

        # In-memory storage: {ip_address: [(timestamp, count)]}
        self.request_history: Dict[str, list] = defaultdict(list)

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

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.

        Handles proxy headers (X-Forwarded-For) for deployments behind
        load balancers or reverse proxies.
        """
        # Check for X-Forwarded-For header (proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()

        # Check for X-Real-IP header (nginx)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"

    def _clean_old_entries(self, ip: str, current_time: float):
        """
        Remove entries older than 1 hour to prevent memory bloat.

        This keeps the in-memory storage size manageable.
        """
        one_hour_ago = current_time - 3600

        if ip in self.request_history:
            self.request_history[ip] = [
                (timestamp, count)
                for timestamp, count in self.request_history[ip]
                if timestamp > one_hour_ago
            ]

            # Remove IP entirely if no recent requests
            if not self.request_history[ip]:
                del self.request_history[ip]

    def _check_rate_limit(self, ip: str, current_time: float) -> Tuple[bool, str, int]:
        """
        Check if IP has exceeded rate limits.

        Returns:
            (is_allowed, error_message, retry_after_seconds)
        """
        # Clean old entries first
        self._clean_old_entries(ip, current_time)

        # Calculate time windows
        one_minute_ago = current_time - 60
        one_hour_ago = current_time - 3600

        # Count requests in each window
        requests_last_minute = sum(
            count for timestamp, count in self.request_history[ip]
            if timestamp > one_minute_ago
        )

        requests_last_hour = sum(
            count for timestamp, count in self.request_history[ip]
            if timestamp > one_hour_ago
        )

        # Check per-minute limit
        if requests_last_minute >= self.per_minute_limit:
            return (
                False,
                f"Rate limit exceeded: {self.per_minute_limit} requests per minute",
                60  # Retry after 1 minute
            )

        # Check per-hour limit
        if requests_last_hour >= self.per_hour_limit:
            # Calculate when the oldest request in the hour will expire
            oldest_timestamp = min(
                timestamp for timestamp, _ in self.request_history[ip]
                if timestamp > one_hour_ago
            )
            retry_after = int(oldest_timestamp + 3600 - current_time)

            return (
                False,
                f"Rate limit exceeded: {self.per_hour_limit} requests per hour",
                retry_after
            )

        return (True, "", 0)

    def _record_request(self, ip: str, current_time: float):
        """Record a new request from the IP."""
        self.request_history[ip].append((current_time, 1))

    async def dispatch(self, request: Request, call_next):
        """
        Process each request through rate limiting.

        Skips rate limiting if:
        - Feature is disabled (ENABLE_RATE_LIMITING=False)
        - Path is whitelisted (health checks, docs, etc.)
        """
        # Skip rate limiting if disabled
        if not settings.ENABLE_RATE_LIMITING:
            return await call_next(request)

        # Skip rate limiting for whitelisted paths
        if request.url.path in self.whitelist_paths:
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)
        current_time = time.time()

        # Check rate limit
        is_allowed, error_message, retry_after = self._check_rate_limit(
            client_ip,
            current_time
        )

        if not is_allowed:
            # Rate limit exceeded - return 429 Too Many Requests
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

        # Record this request
        self._record_request(client_ip, current_time)

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit-Minute"] = str(self.per_minute_limit)
        response.headers["X-RateLimit-Limit-Hour"] = str(self.per_hour_limit)

        return response


class LoginRateLimiter:
    """
    Specialized rate limiter for login attempts.

    This is stricter than the general API rate limiter to prevent
    brute force password attacks.

    Limits:
    - 5 failed login attempts per IP per 15 minutes
    - Account lockout after MAX_LOGIN_ATTEMPTS (handled separately)
    """

    def __init__(self):
        # In-memory storage: {ip_address: [(timestamp, was_successful)]}
        self.login_attempts: Dict[str, list] = defaultdict(list)

        # Limits
        self.max_attempts = 5
        self.window_seconds = 900  # 15 minutes

    def _clean_old_attempts(self, ip: str, current_time: float):
        """Remove login attempts older than the time window."""
        cutoff_time = current_time - self.window_seconds

        if ip in self.login_attempts:
            self.login_attempts[ip] = [
                (timestamp, success)
                for timestamp, success in self.login_attempts[ip]
                if timestamp > cutoff_time
            ]

            if not self.login_attempts[ip]:
                del self.login_attempts[ip]

    def check_and_record(self, ip: str, was_successful: bool) -> Tuple[bool, int]:
        """
        Check if login is allowed and record the attempt.

        Returns:
            (is_allowed, remaining_attempts)
        """
        current_time = time.time()

        # Clean old attempts
        self._clean_old_attempts(ip, current_time)

        # Count recent failed attempts
        failed_attempts = sum(
            1 for _, success in self.login_attempts.get(ip, [])
            if not success
        )

        # Check if limit exceeded
        if failed_attempts >= self.max_attempts:
            # Calculate retry after time
            oldest_attempt = min(
                timestamp for timestamp, _ in self.login_attempts[ip]
            )
            retry_after = int(oldest_attempt + self.window_seconds - current_time)

            return (False, retry_after)

        # Record this attempt
        self.login_attempts[ip].append((current_time, was_successful))

        # Calculate remaining attempts
        remaining = self.max_attempts - failed_attempts - (0 if was_successful else 1)

        return (True, remaining)


# Global instance for login rate limiting
login_rate_limiter = LoginRateLimiter()

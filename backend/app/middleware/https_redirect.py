"""
HTTPS Redirect Middleware for Railway deployment.

Forces all redirect responses (301, 302, 307, 308) to use HTTPS URLs.
This fixes Mixed Content errors when FastAPI is behind Railway's SSL termination proxy.

The problem: FastAPI generates http:// URLs in redirect Location headers because
it doesn't know the original request came via HTTPS (Railway terminates SSL at edge).

This middleware intercepts all redirect responses and converts http:// to https://
in the Location header for railway.app domains.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class ForceHTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Middleware that forces HTTPS in redirect Location headers.

    Works by intercepting all responses and checking if:
    1. Response is a redirect (status 301, 302, 307, 308)
    2. Location header contains http:// for railway.app domain

    If both conditions are true, replaces http:// with https://
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Check if this is a redirect response
        if response.status_code in (301, 302, 307, 308):
            location = response.headers.get('location', '')

            # Force HTTPS for railway.app URLs
            if location.startswith('http://') and 'railway.app' in location:
                new_location = location.replace('http://', 'https://', 1)

                # Create new headers with updated location
                new_headers = dict(response.headers)
                new_headers['location'] = new_location

                logger.debug(f"Forcing HTTPS redirect: {location} -> {new_location}")

                # Return new response with corrected Location header
                return Response(
                    content=response.body if hasattr(response, 'body') else b'',
                    status_code=response.status_code,
                    headers=new_headers,
                    media_type=response.media_type
                )

        return response

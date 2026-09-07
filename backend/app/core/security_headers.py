"""Security headers middleware for FastAPI."""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds essential HTTP security headers to all incoming responses."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking / frame embedding
        response.headers["X-Frame-Options"] = "DENY"

        # Enable XSS filter in older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Restrict referrer leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Enforce HTTPS via HSTS (1 year duration with subdomains)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Permissions policy for sensitive device APIs
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response

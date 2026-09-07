"""Main FastAPI application entrypoint."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.redis import close_redis_client
from app.core.security_headers import SecurityHeadersMiddleware

logger = logging.getLogger("skillsync")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan event handler for startup and graceful shutdown."""
    # Startup logic
    logger.info("[*] Starting %s v%s [%s]", settings.APP_NAME, settings.VERSION, settings.APP_ENV)
    print(f"[*] API Documentation available at http://{settings.HOST}:{settings.PORT}/docs")
    yield
    # Shutdown logic
    logger.info("[*] Gracefully terminating application connections...")
    await close_redis_client()
    await engine.dispose()
    logger.info("[*] Shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    description="SkillSync AI - AI-Powered Skill Development & Employment Ecosystem API",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure HTTP Security Headers
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception) -> JSONResponse:
    """Safely catch unhandled internal exceptions to prevent leakage of internal system details."""
    logger.error("Unhandled server exception on %s: %s", request.url.path, exc, exc_info=True)
    if settings.DEBUG and settings.APP_ENV != "production":
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact system support."},
    )


# Mount Versioned API Routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root_ping() -> JSONResponse:
    """Root ping endpoint providing service info and links to documentation."""
    return JSONResponse(
        content={
            "service": settings.APP_NAME,
            "version": settings.VERSION,
            "environment": settings.APP_ENV,
            "docs": "/docs",
            "health": f"{settings.API_V1_PREFIX}/health",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

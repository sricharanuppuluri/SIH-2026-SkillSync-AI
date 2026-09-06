"""Main FastAPI application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.redis import close_redis_client


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan event handler for startup and graceful shutdown."""
    # Startup logic
    print(f"[*] Starting {settings.APP_NAME} v{settings.VERSION} [{settings.APP_ENV}]")
    print(f"[*] API Documentation available at http://{settings.HOST}:{settings.PORT}/docs")
    yield
    # Shutdown logic
    print("[*] Gracefully terminating application connections...")
    await close_redis_client()
    await engine.dispose()
    print("[*] Shutdown complete.")


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

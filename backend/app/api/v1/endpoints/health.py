"""Health check endpoint handler."""

import asyncio

from fastapi import APIRouter, status

from app.ai.ollama_client import check_ollama_status
from app.core.config import settings
from app.core.database import check_database_connection
from app.core.redis import check_redis_connection
from app.schemas.health import (
    AISubsystemStatus,
    DatabaseStatus,
    HealthResponse,
    RedisStatus,
    SubsystemsDetail,
)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Diagnostic Ping",
    description="Returns connectivity status for FastAPI, PostgreSQL, Redis, and local Ollama AI.",
)
async def get_health() -> HealthResponse:
    """Runs concurrent health probes across database, cache, and AI engine."""
    db_task = check_database_connection()
    redis_task = check_redis_connection()
    ai_task = check_ollama_status()

    db_res, redis_res, ai_res = await asyncio.gather(
        db_task, redis_task, ai_task, return_exceptions=True
    )

    # Format database check result
    if isinstance(db_res, Exception):
        db_detail = DatabaseStatus(
            status="disconnected",
            error=str(db_res),
        )
    else:
        db_detail = DatabaseStatus(**db_res)

    # Format redis check result
    if isinstance(redis_res, Exception):
        redis_detail = RedisStatus(
            status="disconnected",
            error=str(redis_res),
        )
    else:
        redis_detail = RedisStatus(**redis_res)

    # Format AI check result
    if isinstance(ai_res, Exception):
        ai_detail = AISubsystemStatus(
            status="offline",
            target_model=settings.OLLAMA_MODEL,
            error=str(ai_res),
        )
    else:
        ai_detail = AISubsystemStatus(**ai_res)

    # Determine overall status:
    # If DB and Redis are connected, system is "healthy"
    # If DB or Redis is disconnected, system is "degraded" (in dev)
    overall_status = "healthy"
    if db_detail.status != "connected" or redis_detail.status != "connected":
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        service="skillsync-api",
        version=settings.VERSION,
        environment=settings.APP_ENV,
        subsystems=SubsystemsDetail(
            database=db_detail,
            redis=redis_detail,
            ai_engine=ai_detail,
        ),
    )

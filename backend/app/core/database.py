"""Database configuration and session management using SQLAlchemy 2.0 Async."""

import time
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# Create async engine with connection pooling
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async database sessions in route handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> dict[str, Any]:
    """Tests database connectivity and checks for pgvector extension presence."""
    start_time = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            # Simple ping
            await session.execute(text("SELECT 1"))
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Check pgvector extension status
            vector_check = await session.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            )
            has_vector = vector_check.scalar() is not None

            return {
                "status": "connected",
                "latency_ms": latency_ms,
                "pgvector_enabled": has_vector,
            }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "disconnected",
            "latency_ms": latency_ms,
            "pgvector_enabled": False,
            "error": str(e),
        }

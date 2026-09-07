"""Tests for system health check endpoints and subsystem diagnostics."""

import pytest
from httpx import AsyncClient

from app.ai.ollama_client import check_ollama_status
from app.schemas.health import HealthResponse


@pytest.mark.asyncio
async def test_health_endpoint_returns_200_and_valid_schema(async_client: AsyncClient):
    """Verifies that GET /api/v1/health returns HTTP 200 and conforms to HealthResponse schema."""
    response = await async_client.get("/api/v1/health")

    assert response.status_code == 200
    data = response.json()

    # Schema validation via Pydantic
    health_obj = HealthResponse(**data)
    assert health_obj.service == "skillsync-api"
    assert health_obj.version == "0.1.0"
    assert health_obj.status in ["healthy", "degraded", "unhealthy"]

    # Subsystem presence verification
    assert health_obj.subsystems.database.status in ["connected", "disconnected", "degraded"]
    assert health_obj.subsystems.redis.status in ["connected", "disconnected", "degraded"]
    assert health_obj.subsystems.ai_engine.status in ["available", "offline", "degraded"]


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Verifies that the root endpoint returns HTTP 200 with service metadata."""
    response = await async_client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["service"] == "SkillSync AI"
    assert "docs" in data
    assert "health" in data


@pytest.mark.asyncio
async def test_ollama_status_graceful_handling():
    """Verifies that Ollama status probe returns a non-throwing dictionary even when offline."""
    result = await check_ollama_status()
    assert isinstance(result, dict)
    assert "status" in result
    assert result["status"] in ["available", "offline", "degraded"]
    assert "target_model" in result

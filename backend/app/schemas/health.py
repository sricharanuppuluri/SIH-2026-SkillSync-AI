"""Health check schema definitions."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class DatabaseStatus(BaseModel):
    status: str = Field(..., description="Status: connected, disconnected, degraded")
    latency_ms: float | None = Field(None, description="Query round-trip latency in ms")
    pgvector_enabled: bool | None = Field(None, description="Whether pgvector is installed")
    error: str | None = Field(None, description="Error message if disconnected")


class RedisStatus(BaseModel):
    status: str = Field(..., description="Status: connected, disconnected, degraded")
    latency_ms: float | None = Field(None, description="Ping round-trip latency in ms")
    error: str | None = Field(None, description="Error message if disconnected")


class AISubsystemStatus(BaseModel):
    status: str = Field(..., description="Availability status: available, offline, degraded")
    latency_ms: float | None = Field(None, description="Ollama API latency in ms")
    target_model: str = Field(..., description="Target LLM model configured")
    available_models: list[str] | None = Field(None, description="Models pulled in Ollama")
    model_ready: bool | None = Field(None, description="Whether target model is available")
    message: str | None = Field(None, description="Human readable message")
    error: str | None = Field(None, description="Error details if unreachable")


class SubsystemsDetail(BaseModel):
    database: DatabaseStatus
    redis: RedisStatus
    ai_engine: AISubsystemStatus


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall status: healthy, degraded, or unhealthy")
    service: str = Field(default="skillsync-api", description="Service identifier")
    version: str = Field(default="0.1.0", description="Service semantic version")
    environment: str = Field(..., description="Environment: development, staging, production")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Server UTC timestamp"
    )
    subsystems: SubsystemsDetail = Field(..., description="Connected subsystem statuses")

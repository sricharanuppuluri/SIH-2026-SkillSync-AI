"""Local Ollama client abstraction for health diagnostics and LLM inference."""

import time
from typing import Any

import httpx

from app.core.config import settings


async def check_ollama_status() -> dict[str, Any]:
    """Checks whether the local Ollama daemon is reachable and lists available models."""
    start_time = time.perf_counter()
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(url)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code == 200:
                data = response.json()
                models = [model.get("name") for model in data.get("models", [])]
                return {
                    "status": "available",
                    "latency_ms": latency_ms,
                    "target_model": settings.OLLAMA_MODEL,
                    "available_models": models,
                    "model_ready": settings.OLLAMA_MODEL in models,
                }
            return {
                "status": "degraded",
                "latency_ms": latency_ms,
                "error": f"Ollama returned HTTP {response.status_code}",
            }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "offline",
            "latency_ms": latency_ms,
            "target_model": settings.OLLAMA_MODEL,
            "message": (
                "Local Ollama daemon is offline or not installed. "
                "Local AI features disabled."
            ),
            "error": str(e),
        }

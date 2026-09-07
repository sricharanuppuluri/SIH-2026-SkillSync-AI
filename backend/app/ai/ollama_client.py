"""Local Ollama client abstraction for health diagnostics and LLM inference."""

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaStatus:
    """Ollama connection status constants."""

    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
    INVALID_RESPONSE = "INVALID_RESPONSE"


class OllamaError(Exception):
    """Base exception for Ollama client errors."""

    def __init__(self, message: str, status: str = OllamaStatus.UNAVAILABLE) -> None:
        super().__init__(message)
        self.status = status


class OllamaTimeoutError(OllamaError):
    def __init__(self, message: str = "Ollama request timed out") -> None:
        super().__init__(message, OllamaStatus.TIMEOUT)


class OllamaUnavailableError(OllamaError):
    def __init__(self, message: str = "Ollama service is unavailable") -> None:
        super().__init__(message, OllamaStatus.UNAVAILABLE)


class OllamaModelNotFoundError(OllamaError):
    def __init__(self, model: str) -> None:
        super().__init__(
            f"Model '{model}' is not available in Ollama", OllamaStatus.MODEL_NOT_FOUND
        )


class OllamaInvalidResponseError(OllamaError):
    def __init__(self, message: str = "Invalid or malformed response from Ollama") -> None:
        super().__init__(message, OllamaStatus.INVALID_RESPONSE)


async def check_ollama_status() -> dict[str, Any]:
    """Check whether the local Ollama daemon is reachable and lists available models.

    Returns legacy lowercase status strings ('available', 'offline', 'degraded')
    for compatibility with the health endpoint schema.
    """
    start_time = time.perf_counter()
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(url)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code == 200:
                data = response.json()
                models = [model.get("name") for model in data.get("models", [])]
                model_ready = settings.OLLAMA_MODEL in models
                return {
                    "status": "available",
                    "latency_ms": latency_ms,
                    "target_model": settings.OLLAMA_MODEL,
                    "available_models": models,
                    "model_ready": model_ready,
                }
            return {
                "status": "degraded",
                "latency_ms": latency_ms,
                "error": f"Ollama returned HTTP {response.status_code}",
            }
    except httpx.TimeoutException:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "offline",
            "latency_ms": latency_ms,
            "target_model": settings.OLLAMA_MODEL,
            "message": "Local Ollama daemon timed out.",
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        msg = "Local Ollama daemon is offline or not installed. Local AI features disabled."
        return {
            "status": "offline",
            "latency_ms": latency_ms,
            "target_model": settings.OLLAMA_MODEL,
            "message": msg,
            "error": str(e),
        }


async def generate_json(
    prompt: str,
    system_prompt: str | None = None,
    timeout: float | None = None,
) -> dict[str, Any]:
    """Send a prompt to Ollama and return the parsed JSON response.

    Args:
        prompt: The user prompt text.
        system_prompt: Optional system instructions.
        timeout: Request timeout in seconds (defaults to settings.OLLAMA_TIMEOUT).

    Returns:
        Parsed JSON dictionary from the model response.

    Raises:
        OllamaTimeoutError: Request timed out.
        OllamaUnavailableError: Connection failed.
        OllamaModelNotFoundError: The configured model is not available.
        OllamaInvalidResponseError: Model returned non-JSON or empty output.
    """
    effective_timeout = timeout if timeout is not None else settings.OLLAMA_TIMEOUT
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"

    payload: dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,  # Low temperature for deterministic extraction
            "num_predict": 2048,
        },
    }
    if system_prompt:
        payload["system"] = system_prompt

    logger.debug("Sending request to Ollama model=%s url=%s", settings.OLLAMA_MODEL, url)

    try:
        async with httpx.AsyncClient(timeout=effective_timeout) as client:
            response = await client.post(url, json=payload)
    except httpx.TimeoutException as exc:
        logger.warning("Ollama request timed out after %.1fs", effective_timeout)
        raise OllamaTimeoutError() from exc
    except httpx.ConnectError as exc:
        logger.warning("Ollama connection refused: %s", exc)
        raise OllamaUnavailableError("Cannot connect to Ollama service") from exc
    except Exception as exc:
        logger.warning("Ollama request failed: %s", exc)
        raise OllamaUnavailableError(str(exc)) from exc

    if response.status_code == 404:
        raise OllamaModelNotFoundError(settings.OLLAMA_MODEL)

    if response.status_code != 200:
        raise OllamaUnavailableError(f"Ollama returned HTTP {response.status_code}")

    try:
        data = response.json()
    except Exception as exc:
        raise OllamaInvalidResponseError("Ollama response was not valid JSON") from exc

    raw_text: str = data.get("response", "")
    if not raw_text or not raw_text.strip():
        raise OllamaInvalidResponseError("Ollama returned an empty response")

    # Parse the JSON content from the model response
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        # Try to extract first JSON object from response (some models add extra text)
        import re

        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        logger.warning("Ollama response was not parseable JSON: %.200s", raw_text)
        raise OllamaInvalidResponseError(
            f"Model response was not valid JSON: {raw_text[:200]}"
        ) from exc

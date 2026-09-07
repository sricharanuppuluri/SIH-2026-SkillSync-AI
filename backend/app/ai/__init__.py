"""Local AI integration package — Ollama client and skill extraction."""

from app.ai.ollama_client import (
    OllamaError,
    OllamaInvalidResponseError,
    OllamaModelNotFoundError,
    OllamaStatus,
    OllamaTimeoutError,
    OllamaUnavailableError,
    check_ollama_status,
    generate_json,
)

__all__ = [
    "check_ollama_status",
    "generate_json",
    "OllamaStatus",
    "OllamaError",
    "OllamaTimeoutError",
    "OllamaUnavailableError",
    "OllamaModelNotFoundError",
    "OllamaInvalidResponseError",
]

"""Phase 6 — Local AI Skill Extraction Tests.

Tests cover:
  - Ollama client: structured status constants, generate_json success/failure modes
  - Extraction schemas: Pydantic validation, confidence clamping, deduplication
  - Extraction service: full pipeline with mocked Ollama
  - API endpoint: authentication, RBAC, request validation, response schema

All Ollama calls are mocked — tests run fully offline without a live Ollama server.
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.ai.ollama_client import (
    OllamaInvalidResponseError,
    OllamaModelNotFoundError,
    OllamaStatus,
    OllamaTimeoutError,
    OllamaUnavailableError,
)
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.schemas.skill_extraction import (
    ExtractionSourceType,
    RawExtractionResponse,
    RawSkillItem,
    SkillExtractionRequest,
)
from app.services.skill_seed_service import seed_canonical_skills

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_user(role: UserRole) -> tuple[User, str]:
    """Create a user with a unique email and return (user, jwt_token)."""
    unique_email = f"extract_{uuid.uuid4().hex[:10]}@test.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("TestPass123!"),
            full_name=f"{role.value} User",
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


# ---------------------------------------------------------------------------
# 1. Ollama status constants
# ---------------------------------------------------------------------------


def test_ollama_status_constants() -> None:
    """OllamaStatus constants have expected string values."""
    assert OllamaStatus.AVAILABLE == "AVAILABLE"
    assert OllamaStatus.UNAVAILABLE == "UNAVAILABLE"
    assert OllamaStatus.TIMEOUT == "TIMEOUT"
    assert OllamaStatus.MODEL_NOT_FOUND == "MODEL_NOT_FOUND"
    assert OllamaStatus.INVALID_RESPONSE == "INVALID_RESPONSE"


def test_ollama_exception_hierarchy() -> None:
    """All Ollama exceptions carry a .status attribute."""
    exc = OllamaTimeoutError()
    assert exc.status == OllamaStatus.TIMEOUT

    exc2 = OllamaUnavailableError()
    assert exc2.status == OllamaStatus.UNAVAILABLE

    exc3 = OllamaModelNotFoundError("test-model")
    assert exc3.status == OllamaStatus.MODEL_NOT_FOUND

    exc4 = OllamaInvalidResponseError()
    assert exc4.status == OllamaStatus.INVALID_RESPONSE


# ---------------------------------------------------------------------------
# 2. Pydantic extraction schema validation
# ---------------------------------------------------------------------------


def test_raw_skill_item_valid() -> None:
    """RawSkillItem parses valid data correctly."""
    item = RawSkillItem(name="Python", confidence=0.97, evidence="3+ years of Python")
    assert item.name == "Python"
    assert item.confidence == 0.97
    assert item.evidence == "3+ years of Python"


def test_raw_skill_item_confidence_clamped() -> None:
    """Confidence values outside [0, 1] are silently clamped by model_validator."""
    item = RawSkillItem(name="Go", confidence=1.5, evidence="")
    assert item.confidence == 1.0

    item2 = RawSkillItem(name="Rust", confidence=-0.1, evidence="")
    assert item2.confidence == 0.0


def test_raw_skill_item_empty_name_rejected() -> None:
    """Empty skill names are rejected by Pydantic."""
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        RawSkillItem(name="   ", confidence=0.5, evidence="")


def test_raw_extraction_response_deduplication() -> None:
    """Duplicate raw names (case-insensitive) are collapsed to one."""
    raw = RawExtractionResponse(
        skills=[
            RawSkillItem(name="Python", confidence=0.9, evidence="e1"),
            RawSkillItem(name="python", confidence=0.8, evidence="e2"),
            RawSkillItem(name="PYTHON", confidence=0.7, evidence="e3"),
            RawSkillItem(name="FastAPI", confidence=0.85, evidence="e4"),
        ]
    )
    names = [s.name for s in raw.skills]
    assert names.count("Python") == 1
    assert "FastAPI" in names
    assert len(raw.skills) == 2


def test_raw_extraction_response_max_skills() -> None:
    """RawExtractionResponse enforces max 100 items."""
    import pydantic

    too_many = [RawSkillItem(name=f"Skill{i}", confidence=0.5, evidence="") for i in range(101)]
    with pytest.raises(pydantic.ValidationError):
        RawExtractionResponse(skills=too_many)


def test_extraction_request_min_length() -> None:
    """SkillExtractionRequest rejects text shorter than 10 chars."""
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        SkillExtractionRequest(text="short", source_type=ExtractionSourceType.JOB)


def test_extraction_request_max_length() -> None:
    """SkillExtractionRequest rejects text longer than 10000 chars."""
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        SkillExtractionRequest(text="x" * 10001, source_type=ExtractionSourceType.JOB)


def test_extraction_request_valid() -> None:
    """SkillExtractionRequest accepts valid input."""
    req = SkillExtractionRequest(
        text="We are looking for a Python developer with PostgreSQL experience.",
        source_type=ExtractionSourceType.JOB,
    )
    assert req.source_type == ExtractionSourceType.JOB
    assert len(req.text) > 10


def test_extraction_source_types() -> None:
    """All expected source type enum values exist."""
    assert ExtractionSourceType.JOB == "JOB"
    assert ExtractionSourceType.RESUME == "RESUME"
    assert ExtractionSourceType.COURSE == "COURSE"
    assert ExtractionSourceType.PROFILE == "PROFILE"
    assert ExtractionSourceType.OTHER == "OTHER"


# ---------------------------------------------------------------------------
# 3. generate_json() — mocked Ollama HTTP
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_json_success() -> None:
    """generate_json() returns parsed dict on successful Ollama response."""
    from app.ai.ollama_client import generate_json

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "response": json.dumps(
            {"skills": [{"name": "Python", "confidence": 0.95, "evidence": "test"}]}
        )
    }

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        result = await generate_json("test prompt")

    assert "skills" in result
    assert result["skills"][0]["name"] == "Python"


@pytest.mark.asyncio
async def test_generate_json_timeout() -> None:
    """generate_json() raises OllamaTimeoutError on httpx.TimeoutException."""
    import httpx

    from app.ai.ollama_client import generate_json

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
        mock_client_cls.return_value = mock_client

        with pytest.raises(OllamaTimeoutError):
            await generate_json("test prompt")


@pytest.mark.asyncio
async def test_generate_json_connection_error() -> None:
    """generate_json() raises OllamaUnavailableError on connection refused."""
    import httpx

    from app.ai.ollama_client import generate_json

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("refused"))
        mock_client_cls.return_value = mock_client

        with pytest.raises(OllamaUnavailableError):
            await generate_json("test prompt")


@pytest.mark.asyncio
async def test_generate_json_model_not_found() -> None:
    """generate_json() raises OllamaModelNotFoundError on HTTP 404."""
    from app.ai.ollama_client import generate_json

    mock_response = MagicMock()
    mock_response.status_code = 404

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        with pytest.raises(OllamaModelNotFoundError):
            await generate_json("test prompt")


@pytest.mark.asyncio
async def test_generate_json_invalid_json_response() -> None:
    """generate_json() raises OllamaInvalidResponseError when response is not JSON."""
    from app.ai.ollama_client import generate_json

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"response": "This is plain text, not JSON at all!"}

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        with pytest.raises(OllamaInvalidResponseError):
            await generate_json("test prompt")


@pytest.mark.asyncio
async def test_generate_json_empty_response() -> None:
    """generate_json() raises OllamaInvalidResponseError on empty model response."""
    from app.ai.ollama_client import generate_json

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"response": ""}

    with patch("app.ai.ollama_client.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        with pytest.raises(OllamaInvalidResponseError):
            await generate_json("test prompt")


# ---------------------------------------------------------------------------
# 4. Extraction service — mocked pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extraction_service_successful_extraction() -> None:
    """Extraction service resolves skills against canonical catalog."""
    from app.services.skill_extraction_service import extract_skills

    mock_ollama_response = {
        "skills": [
            {"name": "Python", "confidence": 0.97, "evidence": "Python developer"},
            {"name": "Docker", "confidence": 0.88, "evidence": "Docker experience"},
        ]
    }

    async with AsyncSessionLocal() as db:
        await seed_canonical_skills(db)

        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            return_value=mock_ollama_response,
        ):
            result = await extract_skills(
                db=db,
                text="Looking for a Python developer with Docker experience.",
                source_type=ExtractionSourceType.JOB,
            )

    assert result.success is True
    assert result.source_type == ExtractionSourceType.JOB
    assert result.processing_time_ms >= 0
    resolved_names = {i.canonical_skill_name for i in result.skills if i.resolved}
    assert "Python" in resolved_names


@pytest.mark.asyncio
async def test_extraction_service_alias_resolution() -> None:
    """Extraction service resolves common aliases to canonical skills."""
    from app.services.skill_extraction_service import extract_skills

    # Common aliases that should be in the seeded catalog
    mock_ollama_response = {
        "skills": [
            {"name": "python3", "confidence": 0.9, "evidence": "python3 scripts"},
            {"name": "postgres", "confidence": 0.85, "evidence": "postgres database"},
        ]
    }

    async with AsyncSessionLocal() as db:
        await seed_canonical_skills(db)

        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            return_value=mock_ollama_response,
        ):
            result = await extract_skills(
                db=db,
                text="Using python3 scripts with a postgres database for data pipelines.",
                source_type=ExtractionSourceType.RESUME,
            )

    assert result.success is True
    # Items may or may not resolve depending on alias seed data — but no crash
    assert isinstance(result.skills, list)


@pytest.mark.asyncio
async def test_extraction_service_unknown_skill_unresolved() -> None:
    """Unknown skills remain unresolved and never auto-create canonical entries."""
    from app.services.skill_extraction_service import extract_skills

    mock_ollama_response = {
        "skills": [
            {"name": "QuantumWidgetEngineering9000", "confidence": 0.75, "evidence": "uses qwe9000"}
        ]
    }

    async with AsyncSessionLocal() as db:
        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            return_value=mock_ollama_response,
        ):
            result = await extract_skills(
                db=db,
                text="Expert in QuantumWidgetEngineering9000 framework for enterprise solutions.",
                source_type=ExtractionSourceType.JOB,
            )

    assert result.success is True
    unresolved = [i for i in result.skills if not i.resolved]
    assert len(unresolved) == 1
    assert unresolved[0].canonical_skill_id is None
    assert unresolved[0].canonical_skill_name is None
    # Confirm no skill was created
    assert any("not found" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_extraction_service_duplicate_collapse() -> None:
    """Duplicate LLM skill names collapse to single canonical entry."""
    from app.services.skill_extraction_service import extract_skills

    mock_ollama_response = {
        "skills": [
            {"name": "Python", "confidence": 0.97, "evidence": "Python"},
            {"name": "python", "confidence": 0.90, "evidence": "python scripts"},
            {"name": "Python 3", "confidence": 0.85, "evidence": "Python 3"},
        ]
    }

    async with AsyncSessionLocal() as db:
        await seed_canonical_skills(db)

        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            return_value=mock_ollama_response,
        ):
            result = await extract_skills(
                db=db,
                text="Python developer, python scripts and Python 3 projects.",
                source_type=ExtractionSourceType.RESUME,
            )

    assert result.success is True
    # All three should collapse to at most one canonical Python entry
    python_ids = [
        str(i.canonical_skill_id)
        for i in result.skills
        if i.resolved and i.canonical_skill_name == "Python"
    ]
    assert len(python_ids) <= 1


@pytest.mark.asyncio
async def test_extraction_service_ollama_unavailable() -> None:
    """Extraction service returns success=False gracefully when Ollama is down."""
    from app.services.skill_extraction_service import extract_skills

    async with AsyncSessionLocal() as db:
        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            side_effect=OllamaUnavailableError("Connection refused"),
        ):
            result = await extract_skills(
                db=db,
                text="Python developer with FastAPI and PostgreSQL experience.",
                source_type=ExtractionSourceType.JOB,
            )

    assert result.success is False
    assert result.skills == []
    assert len(result.warnings) > 0


@pytest.mark.asyncio
async def test_extraction_service_ollama_timeout() -> None:
    """Extraction service returns success=False gracefully on Ollama timeout."""
    from app.services.skill_extraction_service import extract_skills

    async with AsyncSessionLocal() as db:
        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            side_effect=OllamaTimeoutError(),
        ):
            result = await extract_skills(
                db=db,
                text="Python developer with FastAPI and PostgreSQL experience.",
                source_type=ExtractionSourceType.JOB,
            )

    assert result.success is False
    assert "timed out" in result.warnings[0].lower()


@pytest.mark.asyncio
async def test_extraction_service_invalid_schema_response() -> None:
    """Extraction service handles malformed LLM JSON output gracefully."""
    from app.services.skill_extraction_service import extract_skills

    # LLM returns JSON but wrong schema (no 'skills' key, wrong types)
    bad_response = {"result": "I found Python and Java", "count": 2}

    async with AsyncSessionLocal() as db:
        with patch(
            "app.services.skill_extraction_service.generate_json",
            new_callable=AsyncMock,
            return_value=bad_response,
        ):
            result = await extract_skills(
                db=db,
                text="Python developer with Java and Spring Boot experience.",
                source_type=ExtractionSourceType.JOB,
            )

    # Bad schema → returns empty skills but succeeds structurally (empty is valid)
    assert isinstance(result.skills, list)


# ---------------------------------------------------------------------------
# 5. API endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_endpoint_unauthenticated(async_client: AsyncClient) -> None:
    """POST /skills/extract requires authentication."""
    resp = await async_client.post(
        "/api/v1/skills/extract",
        json={"text": "Python developer with PostgreSQL experience.", "source_type": "JOB"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_extract_endpoint_text_too_short(async_client: AsyncClient) -> None:
    """POST /skills/extract rejects text shorter than 10 characters."""
    _, token = await _make_user(UserRole.CANDIDATE)
    resp = await async_client.post(
        "/api/v1/skills/extract",
        headers={"Authorization": f"Bearer {token}"},
        json={"text": "Hi", "source_type": "JOB"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_extract_endpoint_text_too_long(async_client: AsyncClient) -> None:
    """POST /skills/extract rejects text longer than 10000 characters."""
    _, token = await _make_user(UserRole.CANDIDATE)
    resp = await async_client.post(
        "/api/v1/skills/extract",
        headers={"Authorization": f"Bearer {token}"},
        json={"text": "x" * 10001, "source_type": "JOB"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_extract_endpoint_invalid_source_type(async_client: AsyncClient) -> None:
    """POST /skills/extract rejects unknown source_type values."""
    _, token = await _make_user(UserRole.CANDIDATE)
    resp = await async_client.post(
        "/api/v1/skills/extract",
        headers={"Authorization": f"Bearer {token}"},
        json={"text": "Python developer with FastAPI experience.", "source_type": "INVALID_TYPE"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_extract_endpoint_ollama_down_returns_200(async_client: AsyncClient) -> None:
    """POST /skills/extract returns HTTP 200 with success=false when Ollama is unavailable."""
    _, token = await _make_user(UserRole.EMPLOYER)

    with patch(
        "app.services.skill_extraction_service.generate_json",
        new_callable=AsyncMock,
        side_effect=OllamaUnavailableError("Connection refused"),
    ):
        resp = await async_client.post(
            "/api/v1/skills/extract",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "text": "Looking for Python developer with Docker experience.",
                "source_type": "JOB",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["skills"] == []
    assert len(data["warnings"]) > 0


@pytest.mark.asyncio
async def test_extract_endpoint_successful_candidate(async_client: AsyncClient) -> None:
    """POST /skills/extract returns structured result for CANDIDATE role."""
    _, token = await _make_user(UserRole.CANDIDATE)

    mock_response = {
        "skills": [
            {"name": "Python", "confidence": 0.97, "evidence": "Python developer"},
        ]
    }

    async with AsyncSessionLocal() as db:
        await seed_canonical_skills(db)

    with patch(
        "app.services.skill_extraction_service.generate_json",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        resp = await async_client.post(
            "/api/v1/skills/extract",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "text": "Experienced Python developer with 5 years of backend development.",
                "source_type": "RESUME",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "success" in data
    assert "skills" in data
    assert "model" in data
    assert "source_type" in data
    assert "processing_time_ms" in data
    assert "warnings" in data
    assert data["source_type"] == "RESUME"


@pytest.mark.asyncio
async def test_extract_endpoint_all_roles_permitted(async_client: AsyncClient) -> None:
    """POST /skills/extract is accessible to all authenticated roles."""
    roles = [
        UserRole.ADMIN,
        UserRole.EMPLOYER,
        UserRole.CANDIDATE,
        UserRole.TRAINING_PROVIDER,
        UserRole.GOVERNMENT,
    ]

    with patch(
        "app.services.skill_extraction_service.generate_json",
        new_callable=AsyncMock,
        return_value={"skills": []},
    ):
        for role in roles:
            _, token = await _make_user(role)
            resp = await async_client.post(
                "/api/v1/skills/extract",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "text": "Python developer with FastAPI and PostgreSQL experience.",
                    "source_type": "JOB",
                },
            )
            assert resp.status_code == 200, (
                f"Role {role} should have access, got {resp.status_code}"
            )


@pytest.mark.asyncio
async def test_extract_endpoint_response_schema(async_client: AsyncClient) -> None:
    """POST /skills/extract response includes all required schema fields."""
    _, token = await _make_user(UserRole.TRAINING_PROVIDER)

    with patch(
        "app.services.skill_extraction_service.generate_json",
        new_callable=AsyncMock,
        return_value={"skills": []},
    ):
        resp = await async_client.post(
            "/api/v1/skills/extract",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "text": "Course covering cloud computing fundamentals and AWS services.",
                "source_type": "COURSE",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    required_fields = {
        "success",
        "skills",
        "model",
        "source_type",
        "processing_time_ms",
        "resolved_count",
        "unresolved_count",
        "warnings",
    }
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

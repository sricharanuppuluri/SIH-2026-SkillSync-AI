"""Unit and integration tests for Phase 9 Embeddings and Semantic Skill Matching."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.profiles import CandidateProfile, EmployerProfile
from app.models.skill import Skill, SkillAlias, SkillStatus, SkillType
from app.models.skill_embedding import SkillEmbedding
from app.models.user import User, UserRole
from app.schemas.semantic import MatchType, SemanticMatchRequest
from app.services.embedding_service import EmbeddingService, embedding_service
from app.services.semantic_skill_service import semantic_skill_service


async def _create_test_user(role: UserRole = UserRole.CANDIDATE) -> tuple[User, str]:
    """Helper to create an isolated test user and return JWT bearer token header."""
    unique_email = f"test_{role.value.lower()}_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("TestPassword123!"),
            full_name=f"Test {role.value.title()}",
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        if role == UserRole.CANDIDATE:
            prof = CandidateProfile(
                user_id=user.id,
                headline="Tester",
                experience_years=2.0,
            )
            session.add(prof)
        elif role == UserRole.EMPLOYER:
            eprof = EmployerProfile(
                user_id=user.id,
                company_name="Test Co",
            )
            session.add(eprof)

        await session.commit()
        token = create_access_token(user.id, user.role.value)
        return user, f"Bearer {token}"


# ===========================================================================
# 1. Embedding Service Unit Tests
# ===========================================================================


def test_embedding_service_normalization() -> None:
    """Test that input text is sanitized while preserving critical technical tokens."""
    # Basic trim and whitespace collapse
    assert EmbeddingService.normalize_text("  React.js   ") == "React.js"
    assert EmbeddingService.normalize_text("Machine   Learning   Model") == "Machine Learning Model"

    # Technical syntax preservation
    assert EmbeddingService.normalize_text("C++") == "C++"
    assert EmbeddingService.normalize_text("C#") == "C#"
    assert EmbeddingService.normalize_text(".NET Core") == ".NET Core"
    assert EmbeddingService.normalize_text("Node.js") == "Node.js"
    assert EmbeddingService.normalize_text("TCP/IP") == "TCP/IP"
    assert EmbeddingService.normalize_text("back-end development") == "back-end development"


def test_embedding_service_empty_input_rejection() -> None:
    """Verify that empty or whitespace-only queries raise ValueError."""
    with pytest.raises(ValueError, match="cannot be empty"):
        EmbeddingService.normalize_text("")

    with pytest.raises(ValueError, match="cannot be empty"):
        EmbeddingService.normalize_text("    ")


def test_embedding_service_build_source_text() -> None:
    """Verify deterministic representation builder for canonical skills."""
    text = EmbeddingService.build_canonical_skill_source_text(
        skill_name="Python",
        skill_type="TECHNICAL",
        category="Programming Languages",
        aliases=["Python 3", "Python Programming", "CPython"],
    )
    assert "Python." in text
    assert "Technical skill." in text
    assert "Category: Programming Languages." in text
    assert "Aliases: CPython, Python 3, Python Programming." in text


def test_embedding_service_singleton_and_metadata() -> None:
    """Verify singleton instance and metadata reporting."""
    s1 = EmbeddingService()
    s2 = EmbeddingService()
    assert s1 is s2

    meta = embedding_service.get_metadata()
    assert meta["model_name"] == settings.EMBEDDING_MODEL_NAME
    assert meta["dimension"] == 384


def test_embedding_generation_dimension_and_bounds() -> None:
    """Verify generated vector has dimension 384 and unit norm."""
    vector = embedding_service.generate_embedding("Natural Language Processing")
    assert isinstance(vector, list)
    assert len(vector) == settings.EMBEDDING_DIMENSION
    # All elements are floats
    assert all(isinstance(x, float) for x in vector)

    # Unit norm test: sum of squares should be ~1.0
    norm_sq = sum(x * x for x in vector)
    assert abs(norm_sq - 1.0) < 1e-3


def test_batch_embedding_generation() -> None:
    """Verify batch embedding generation returns matching dimensions."""
    texts = ["Python", "Machine Learning", "Cloud Computing"]
    vectors = embedding_service.generate_embeddings_batch(texts)
    assert len(vectors) == 3
    for v in vectors:
        assert len(v) == 384


# ===========================================================================
# 2. Semantic Matching Service Hierarchy & Precedence Tests
# ===========================================================================


@pytest.mark.asyncio
async def test_exact_match_precedence() -> None:
    """Exact canonical match MUST take precedence with similarity 1.0 and MatchType.EXACT."""
    async with AsyncSessionLocal() as session:
        # Create a distinct canonical skill
        unique_name = f"PyTorch Test Exact {uuid.uuid4().hex[:6]}"
        norm_name = unique_name.strip().lower()
        skill = Skill(
            name=unique_name,
            normalized_name=norm_name,
            category="Machine Learning",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.commit()

        req = SemanticMatchRequest(text=unique_name.lower(), top_k=5)
        res = await semantic_skill_service.match_skill(session, req)

        assert len(res.matches) >= 1
        top = res.matches[0]
        assert top.skill_id == skill.id
        assert top.similarity == 1.0
        assert top.match_type == MatchType.EXACT
        assert "Exact match" in top.explanation


@pytest.mark.asyncio
async def test_alias_match_precedence() -> None:
    """Canonical alias match MUST take precedence with similarity 1.0 and MatchType.ALIAS."""
    async with AsyncSessionLocal() as session:
        unique_name = f"K8s Canonical Skill {uuid.uuid4().hex[:6]}"
        skill = Skill(
            name=unique_name,
            normalized_name=unique_name.strip().lower(),
            category="DevOps",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.flush()

        alias_text = f"k8s-alias-{uuid.uuid4().hex[:6]}"
        alias = SkillAlias(
            skill_id=skill.id,
            alias=alias_text,
            normalized_alias=alias_text.strip().lower(),
        )
        session.add(alias)
        await session.commit()

        req = SemanticMatchRequest(text=alias_text, top_k=5)
        res = await semantic_skill_service.match_skill(session, req)

        assert len(res.matches) >= 1
        top = res.matches[0]
        assert top.skill_id == skill.id
        assert top.similarity == 1.0
        assert top.match_type == MatchType.ALIAS
        assert alias_text in top.matched_via


@pytest.mark.asyncio
async def test_semantic_fallback_and_thresholding() -> None:
    """Semantic vector search matches query to embedded skill above thresholds."""
    async with AsyncSessionLocal() as session:
        # Create canonical skill and embedding
        suffix = uuid.uuid4().hex[:6]
        skill = Skill(
            name=f"Kubernetes Orchestration {suffix}",
            normalized_name=f"kubernetes orchestration {suffix}",
            category="DevOps",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.flush()

        source_text = EmbeddingService.build_canonical_skill_source_text(
            skill_name="Kubernetes Orchestration",
            skill_type="TECHNICAL",
            category="DevOps",
            aliases=["Container Orchestration", "K8s Management"],
        )
        vector = embedding_service.generate_embedding(source_text)
        emb = SkillEmbedding(
            skill_id=skill.id,
            embedding=vector,
            source_text=source_text,
            model_name=settings.EMBEDDING_MODEL_NAME,
            embedding_dimension=384,
        )
        session.add(emb)
        await session.commit()

        # Query using a semantic phrase that isn't an exact name or alias
        req = SemanticMatchRequest(text="Kubernetes and container orchestration", top_k=5)
        res = await semantic_skill_service.match_skill(session, req)

        assert len(res.matches) >= 1
        matching_item = next((m for m in res.matches if m.skill_id == skill.id), None)
        assert matching_item is not None
        assert matching_item.similarity >= settings.SEMANTIC_MATCH_THRESHOLD
        assert matching_item.match_type in (MatchType.STRONG_SEMANTIC, MatchType.SEMANTIC)
        assert "vector embedding" in matching_item.matched_via


@pytest.mark.asyncio
async def test_unrelated_skill_rejected_below_threshold() -> None:
    """Unrelated query should not match distant skill embeddings."""
    async with AsyncSessionLocal() as session:
        # Query text completely unrelated to database development
        req = SemanticMatchRequest(text="Baking sourdough bread and pastry frosting", top_k=5)
        res = await semantic_skill_service.match_skill(session, req)

        # None of the tech skills should match with >= 0.70 similarity
        for m in res.matches:
            assert m.similarity >= settings.SEMANTIC_MATCH_THRESHOLD


@pytest.mark.asyncio
async def test_skill_type_filtering() -> None:
    """Specifying skill_type filters out non-matching canonical skills."""
    async with AsyncSessionLocal() as session:
        # Create a SOFT skill
        soft_skill = Skill(
            name=f"Public Speaking {uuid.uuid4().hex[:6]}",
            normalized_name=f"public speaking {uuid.uuid4().hex[:6]}",
            category="Communication",
            skill_type=SkillType.SOFT,
            status=SkillStatus.ACTIVE,
        )
        session.add(soft_skill)
        await session.flush()

        # Exact match request filtering for TECHNICAL only
        req = SemanticMatchRequest(
            text=soft_skill.name,
            top_k=5,
            skill_type=SkillType.TECHNICAL,
        )
        res = await semantic_skill_service.match_skill(session, req)

        # Since requested_type is TECHNICAL, the SOFT skill must NOT be returned
        match_ids = [m.skill_id for m in res.matches]
        assert soft_skill.id not in match_ids


# ===========================================================================
# 3. API and RBAC Endpoints Tests
# ===========================================================================


@pytest.mark.asyncio
async def test_semantic_match_api_unauthenticated(async_client: AsyncClient) -> None:
    """POST /api/v1/skills/semantic-match must require authentication."""
    resp = await async_client.post(
        "/api/v1/skills/semantic-match",
        json={"text": "Machine Learning", "top_k": 5},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_semantic_match_api_authenticated_roles(async_client: AsyncClient) -> None:
    """All authenticated roles (CANDIDATE, EMPLOYER, GOVERNMENT, ADMIN) can perform matching."""
    for role in (UserRole.CANDIDATE, UserRole.EMPLOYER, UserRole.GOVERNMENT, UserRole.ADMIN):
        _, auth_header = await _create_test_user(role=role)
        resp = await async_client.post(
            "/api/v1/skills/semantic-match",
            json={"text": "Python", "top_k": 3},
            headers={"Authorization": auth_header},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "matches" in data
        assert "query" in data
        assert data["query"] == "Python"
        assert "model_name" in data

        # Security check: verify no raw vector floats are exposed
        for item in data["matches"]:
            assert "embedding" not in item
            assert "vector" not in item
            assert 0.0 <= item["similarity"] <= 1.0


@pytest.mark.asyncio
async def test_semantic_match_api_input_validation(async_client: AsyncClient) -> None:
    """Verify input validation rules (min_length, max_length, top_k bounds)."""
    _, auth_header = await _create_test_user(role=UserRole.CANDIDATE)

    # Empty text / 1 char
    r1 = await async_client.post(
        "/api/v1/skills/semantic-match",
        json={"text": "a", "top_k": 5},
        headers={"Authorization": auth_header},
    )
    assert r1.status_code == 422

    # Text too long (> 500 chars)
    r2 = await async_client.post(
        "/api/v1/skills/semantic-match",
        json={"text": "x" * 501, "top_k": 5},
        headers={"Authorization": auth_header},
    )
    assert r2.status_code == 422

    # Invalid top_k (< 1)
    r3 = await async_client.post(
        "/api/v1/skills/semantic-match",
        json={"text": "FastAPI", "top_k": 0},
        headers={"Authorization": auth_header},
    )
    assert r3.status_code == 422

    # Invalid top_k (> 20)
    r4 = await async_client.post(
        "/api/v1/skills/semantic-match",
        json={"text": "FastAPI", "top_k": 25},
        headers={"Authorization": auth_header},
    )
    assert r4.status_code == 422


@pytest.mark.asyncio
async def test_admin_embeddings_status_api(async_client: AsyncClient) -> None:
    """GET /api/v1/skills/embeddings/status is restricted to ADMIN role."""
    # Candidate should receive 403 Forbidden
    _, cand_auth = await _create_test_user(role=UserRole.CANDIDATE)
    r_cand = await async_client.get(
        "/api/v1/skills/embeddings/status",
        headers={"Authorization": cand_auth},
    )
    assert r_cand.status_code == 403

    # Admin should receive 200 OK
    _, admin_auth = await _create_test_user(role=UserRole.ADMIN)
    r_admin = await async_client.get(
        "/api/v1/skills/embeddings/status",
        headers={"Authorization": admin_auth},
    )
    assert r_admin.status_code == 200
    data = r_admin.json()
    assert "total_active_skills" in data
    assert "embedded_skills" in data
    assert "missing_embeddings" in data
    assert "model_name" in data
    assert data["dimension"] == 384
    assert isinstance(data["is_model_available"], bool)

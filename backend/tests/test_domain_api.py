"""Comprehensive tests for Phase 3 Domain API Endpoints, RBAC, and Validations."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.skill import Skill
from app.models.user import User, UserRole


async def create_api_test_user(
    email: str,
    role: UserRole,
    password: str = "SecurePass123!",
    full_name: str = "API Test User",
) -> tuple[User, str]:
    """Create a user and generate a valid authorization Bearer token."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=email.lower(),
            password_hash=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


@pytest.mark.asyncio
async def test_skills_api_crud_and_rbac(async_client: AsyncClient) -> None:
    """Verify Skills API: listing, creation permissions, conflict handling, and lookup."""
    suffix = uuid.uuid4().hex[:6]

    # Unauthenticated list should succeed
    res = await async_client.get("/api/v1/skills")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 1. Unauthenticated skill creation -> 401
    res = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Skill {suffix}", "category": "Testing"},
    )
    assert res.status_code == 401

    # 2. Candidate creating skill -> 403 Forbidden
    _, cand_token = await create_api_test_user(f"cand_sk_{suffix}@api.internal", UserRole.CANDIDATE)
    res = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Skill {suffix}", "category": "Testing"},
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 403

    # 3. Employer creating skill -> 403 Forbidden (Admin only in Phase 5)
    _, emp_token = await create_api_test_user(f"emp_sk_{suffix}@api.internal", UserRole.EMPLOYER)
    res = await async_client.post(
        "/api/v1/skills",
        json={
            "name": f"Rust Lang {suffix}",
            "category": "Systems",
            "description": "Systems programming",
        },
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 403

    # 4. Admin creating skill -> 201 Created
    _, admin_token = await create_api_test_user(f"adm_sk_{suffix}@api.internal", UserRole.ADMIN)
    res = await async_client.post(
        "/api/v1/skills",
        json={
            "name": f"Rust Lang {suffix}",
            "category": "Systems",
            "description": "Systems programming",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    created_skill = res.json()
    assert created_skill["name"] == f"Rust Lang {suffix}"
    skill_id = created_skill["id"]

    # 5. Duplicate skill creation -> 409 Conflict
    res = await async_client.post(
        "/api/v1/skills",
        json={"name": f"rust lang {suffix}", "category": "Systems"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 409

    # 5. Fetch skill by ID
    res = await async_client.get(f"/api/v1/skills/{skill_id}")
    assert res.status_code == 200
    assert res.json()["id"] == skill_id

    # 6. Fetch non-existing skill -> 404
    non_existent = str(uuid.uuid4())
    res = await async_client.get(f"/api/v1/skills/{non_existent}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_jobs_api_crud_and_rbac(async_client: AsyncClient) -> None:
    """Verify Jobs API: list, create with skills, RBAC restriction."""
    suffix = uuid.uuid4().hex[:6]

    # Pre-create a skill to link
    async with AsyncSessionLocal() as session:
        skill = Skill(name=f"Java {suffix}", normalized_name=f"java {suffix}")
        session.add(skill)
        await session.commit()
        skill_id = str(skill.id)

    # 1. Candidate posting job -> 403 Forbidden
    _, cand_token = await create_api_test_user(
        f"cand_job_{suffix}@api.internal", UserRole.CANDIDATE
    )
    res = await async_client.post(
        "/api/v1/jobs",
        json={"title": "Dev", "description": "Short"},
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 403

    # 2. Employer posting job with attached skill requirement -> 201 Created
    _, emp_token = await create_api_test_user(f"emp_job_{suffix}@api.internal", UserRole.EMPLOYER)
    job_payload = {
        "title": f"Senior Java Developer {suffix}",
        "description": "Designing high performance enterprise backend systems in Java.",
        "location_city": "Hyderabad",
        "location_state": "Telangana",
        "is_remote": False,
        "employment_type": "FULL_TIME",
        "experience_level": "SENIOR",
        "salary_min": 1200000.0,
        "salary_max": 1800000.0,
        "skills": [
            {
                "skill_id": skill_id,
                "is_required": True,
                "minimum_proficiency": "ADVANCED",
                "weight": 2.0,
            }
        ],
    }
    res = await async_client.post(
        "/api/v1/jobs",
        json=job_payload,
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == f"Senior Java Developer {suffix}"
    assert len(data["skills"]) == 1
    assert data["skills"][0]["skill_id"] == skill_id
    job_id = data["id"]

    # 3. Retrieve job by ID
    res = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert res.status_code == 200
    assert res.json()["id"] == job_id


@pytest.mark.asyncio
async def test_courses_api_crud_and_rbac(async_client: AsyncClient) -> None:
    """Verify Courses API: list, create with skills, RBAC restriction."""
    suffix = uuid.uuid4().hex[:6]

    # Pre-create a skill to link
    async with AsyncSessionLocal() as session:
        skill = Skill(name=f"DevOps {suffix}", normalized_name=f"devops {suffix}")
        session.add(skill)
        await session.commit()
        skill_id = str(skill.id)

    # 1. Candidate posting course -> 403 Forbidden
    _, cand_token = await create_api_test_user(f"cand_c_{suffix}@api.internal", UserRole.CANDIDATE)
    res = await async_client.post(
        "/api/v1/courses",
        json={"title": "DevOps", "description": "Short"},
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 403

    # 2. Training Provider posting course -> 201 Created
    _, tp_token = await create_api_test_user(
        f"tp_c_{suffix}@api.internal", UserRole.TRAINING_PROVIDER
    )
    course_payload = {
        "title": f"DevOps Engineering Bootcamp {suffix}",
        "description": "Comprehensive practical course covering CI/CD pipelines & infra.",
        "duration_hours": 80,
        "mode": "ONLINE",
        "capacity": 40,
        "skills": [{"skill_id": skill_id}],
    }
    res = await async_client.post(
        "/api/v1/courses",
        json=course_payload,
        headers={"Authorization": f"Bearer {tp_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == f"DevOps Engineering Bootcamp {suffix}"
    assert len(data["skills"]) == 1
    course_id = data["id"]

    # 3. Retrieve course by ID
    res = await async_client.get(f"/api/v1/courses/{course_id}")
    assert res.status_code == 200
    assert res.json()["id"] == course_id


@pytest.mark.asyncio
async def test_profiles_api_me_and_update(async_client: AsyncClient) -> None:
    """Verify /profiles/me retrieves role-appropriate profile and updates work."""
    suffix = uuid.uuid4().hex[:6]

    # Candidate profile
    _, cand_token = await create_api_test_user(f"cand_p_{suffix}@api.internal", UserRole.CANDIDATE)
    res = await async_client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "CANDIDATE"
    assert "profile" in data

    # Update candidate profile
    update_payload = {
        "headline": "Full-Stack AI Developer",
        "bio": "Experienced builder with Python and TypeScript.",
        "experience_years": 3.5,
        "location_city": "Mumbai",
        "location_state": "Maharashtra",
    }
    res = await async_client.put(
        "/api/v1/profiles/me/candidate",
        json=update_payload,
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 200
    assert res.json()["headline"] == "Full-Stack AI Developer"
    assert res.json()["experience_years"] == 3.5

    # Training provider profile
    _, tp_token = await create_api_test_user(
        f"tp_p_{suffix}@api.internal", UserRole.TRAINING_PROVIDER
    )
    res = await async_client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {tp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "TRAINING_PROVIDER"

    # Admin profile returns special response
    _, admin_token = await create_api_test_user(f"admin_p_{suffix}@api.internal", UserRole.ADMIN)
    res = await async_client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "ADMIN"
    assert res.json()["profile"] is None

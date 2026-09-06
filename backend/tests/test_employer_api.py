"""Tests for Phase 4 Employer Module APIs, RBAC, ownership isolation, and lifecycle."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.application import Application, ApplicationStatus
from app.models.job import JobStatus
from app.models.profiles import CandidateProfile, EmployerProfile
from app.models.skill import Skill
from app.models.user import User, UserRole


async def create_test_employer(
    email: str,
    company_name: str = "Test Tech Enterprises",
) -> tuple[User, EmployerProfile, str]:
    """Helper creating an employer user with an associated EmployerProfile and access token."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=email.lower(),
            password_hash=get_password_hash("EmployerPass123!"),
            full_name="Employer Manager",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = EmployerProfile(
            user_id=user.id,
            company_name=company_name,
            industry="Software & AI",
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_test_candidate(
    email: str, full_name: str = "Test Candidate"
) -> tuple[User, CandidateProfile, str]:
    """Helper creating a candidate user with profile and access token."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=email.lower(),
            password_hash=get_password_hash("CandidatePass123!"),
            full_name=full_name,
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = CandidateProfile(
            user_id=user.id,
            headline="Full Stack Engineer",
            experience_years=3.0,
            location_city="Hyderabad",
            location_state="Telangana",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


@pytest.mark.asyncio
async def test_employer_authorization_rbac(async_client: AsyncClient) -> None:
    """Verify that unauthenticated and candidate users are blocked from employer endpoints."""
    suffix = uuid.uuid4().hex[:6]

    # 1. Unauthenticated -> 401
    res = await async_client.get("/api/v1/employer/dashboard")
    assert res.status_code == 401

    # 2. Candidate -> 403 Forbidden
    _, _, cand_token = await create_test_candidate(f"cand_auth_{suffix}@test.internal")
    res = await async_client.get(
        "/api/v1/employer/dashboard",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert res.status_code == 403

    # 3. Employer -> 200 OK
    _, _, emp_token = await create_test_employer(f"emp_auth_{suffix}@test.internal")
    res = await async_client.get(
        "/api/v1/employer/dashboard",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert "metrics" in res.json()


@pytest.mark.asyncio
async def test_employer_job_crud_and_lifecycle(async_client: AsyncClient) -> None:
    """Verify job creation, skill attachment, draft/publish lifecycle, and deletion."""
    suffix = uuid.uuid4().hex[:6]
    _, _, emp_token = await create_test_employer(f"emp_crud_{suffix}@test.internal")

    # Create canonical skills
    async with AsyncSessionLocal() as session:
        sk1 = Skill(name=f"Python {suffix}", normalized_name=f"python {suffix}", category="Backend")
        sk2 = Skill(
            name=f"FastAPI {suffix}", normalized_name=f"fastapi {suffix}", category="Backend"
        )
        session.add_all([sk1, sk2])
        await session.commit()
        sk1_id, sk2_id = str(sk1.id), str(sk2.id)

    # 1. Create Draft Job
    draft_payload = {
        "title": f"Junior Python Engineer {suffix}",
        "description": "Building microservices and API gateways.",
        "location_city": "Bengaluru",
        "location_state": "Karnataka",
        "is_remote": True,
        "employment_type": "FULL_TIME",
        "experience_level": "ENTRY",
        "status": "DRAFT",
        "salary_min": 500000.0,
        "salary_max": 800000.0,
        "skills": [
            {
                "skill_id": sk1_id,
                "is_required": True,
                "minimum_proficiency": "BEGINNER",
                "weight": 1.5,
            }
        ],
    }
    res = await async_client.post(
        "/api/v1/employer/jobs",
        json=draft_payload,
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 201
    job_data = res.json()
    assert job_data["status"] == "DRAFT"
    assert job_data["is_active"] is False
    job_id = job_data["id"]

    # 2. Get Single Job
    res = await async_client.get(
        f"/api/v1/employer/jobs/{job_id}",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["title"] == f"Junior Python Engineer {suffix}"
    assert len(res.json()["skills"]) == 1
    assert res.json()["skills"][0]["skill_name"] == f"Python {suffix}"

    # 3. Update Job and attach second skill
    update_payload = {
        "title": f"Python / FastAPI Engineer {suffix}",
        "skills": [
            {
                "skill_id": sk1_id,
                "is_required": True,
                "minimum_proficiency": "INTERMEDIATE",
                "weight": 1.0,
            },
            {
                "skill_id": sk2_id,
                "is_required": True,
                "minimum_proficiency": "BEGINNER",
                "weight": 1.2,
            },
        ],
    }
    res = await async_client.put(
        f"/api/v1/employer/jobs/{job_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["title"] == f"Python / FastAPI Engineer {suffix}"
    assert len(res.json()["skills"]) == 2

    # 4. Publish Job
    res = await async_client.put(
        f"/api/v1/employer/jobs/{job_id}/publish",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "PUBLISHED"
    assert res.json()["is_active"] is True

    # 5. Close Job
    res = await async_client.put(
        f"/api/v1/employer/jobs/{job_id}/close",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"
    assert res.json()["is_active"] is False

    # 6. List Employer Jobs
    res = await async_client.get(
        "/api/v1/employer/jobs",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 7. Delete Job
    res = await async_client.delete(
        f"/api/v1/employer/jobs/{job_id}",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200

    # Verify deleted
    res = await async_client.get(
        f"/api/v1/employer/jobs/{job_id}",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_employer_ownership_isolation(async_client: AsyncClient) -> None:
    """Verify Employer A cannot view, update, delete, or fetch applicants for Employer B's job."""
    suffix = uuid.uuid4().hex[:6]
    _, _, emp_a_token = await create_test_employer(
        f"emp_a_{suffix}@test.internal", company_name="Company A"
    )
    _, _, emp_b_token = await create_test_employer(
        f"emp_b_{suffix}@test.internal", company_name="Company B"
    )

    # Employer A creates a job
    create_res = await async_client.post(
        "/api/v1/employer/jobs",
        json={"title": f"Proprietary Job A {suffix}", "description": "Confidential hiring."},
        headers={"Authorization": f"Bearer {emp_a_token}"},
    )
    assert create_res.status_code == 201
    job_a_id = create_res.json()["id"]

    # Employer B attempts to GET Employer A's job -> 404 Not Found
    res = await async_client.get(
        f"/api/v1/employer/jobs/{job_a_id}",
        headers={"Authorization": f"Bearer {emp_b_token}"},
    )
    assert res.status_code == 404

    # Employer B attempts to UPDATE Employer A's job -> 404 Not Found
    res = await async_client.put(
        f"/api/v1/employer/jobs/{job_a_id}",
        json={"title": "Hacked Title"},
        headers={"Authorization": f"Bearer {emp_b_token}"},
    )
    assert res.status_code == 404

    # Employer B attempts to DELETE Employer A's job -> 404 Not Found
    res = await async_client.delete(
        f"/api/v1/employer/jobs/{job_a_id}",
        headers={"Authorization": f"Bearer {emp_b_token}"},
    )
    assert res.status_code == 404

    # Employer B attempts to view applicants for Employer A's job -> 404 Not Found
    res = await async_client.get(
        f"/api/v1/employer/jobs/{job_a_id}/applications",
        headers={"Authorization": f"Bearer {emp_b_token}"},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_employer_applicant_management(async_client: AsyncClient) -> None:
    """Verify listing applicants, filtering, status progression, and cross-employer security."""
    suffix = uuid.uuid4().hex[:6]
    _, emp_profile, emp_token = await create_test_employer(f"emp_app_{suffix}@test.internal")
    _, _, other_emp_token = await create_test_employer(f"other_emp_{suffix}@test.internal")
    _, cand_profile, _ = await create_test_candidate(
        f"cand_app_{suffix}@test.internal", full_name="Aditi Rao"
    )

    # Create a job and an application in DB
    async with AsyncSessionLocal() as session:
        from app.models.job import Job

        job = Job(
            employer_id=emp_profile.id,
            title=f"Frontend React Dev {suffix}",
            description="Developing dynamic web interfaces.",
            status=JobStatus.PUBLISHED,
        )
        session.add(job)
        await session.flush()

        app = Application(
            candidate_id=cand_profile.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            cover_note="Looking forward to contributing!",
        )
        session.add(app)
        await session.commit()
        job_id = str(job.id)
        app_id = str(app.id)

    # 1. Employer lists applications
    res = await async_client.get(
        "/api/v1/employer/applications",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    apps = res.json()
    assert any(a["id"] == app_id for a in apps)

    matched_app = next(a for a in apps if a["id"] == app_id)
    assert matched_app["candidate"]["full_name"] == "Aditi Rao"
    assert matched_app["status"] == "APPLIED"

    # 2. Filter by specific job
    res = await async_client.get(
        f"/api/v1/employer/jobs/{job_id}/applications",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 3. Update application status to SHORTLISTED
    res = await async_client.put(
        f"/api/v1/employer/applications/{app_id}/status",
        json={"status": "SHORTLISTED"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SHORTLISTED"

    # 4. Progress to INTERVIEW
    res = await async_client.put(
        f"/api/v1/employer/applications/{app_id}/status",
        json={"status": "INTERVIEW"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "INTERVIEW"

    # 5. Other employer attempts to update application status -> 404 Not Found
    res = await async_client.put(
        f"/api/v1/employer/applications/{app_id}/status",
        json={"status": "REJECTED"},
        headers={"Authorization": f"Bearer {other_emp_token}"},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_employer_dashboard_metrics(async_client: AsyncClient) -> None:
    """Verify accurate deterministic computation of employer dashboard statistics."""
    suffix = uuid.uuid4().hex[:6]
    _, emp_profile, emp_token = await create_test_employer(f"emp_dash_{suffix}@test.internal")
    _, cand_profile, _ = await create_test_candidate(f"cand_dash_{suffix}@test.internal")

    # Add 1 Draft job, 1 Published job, 1 Closed job, and 1 Application
    async with AsyncSessionLocal() as session:
        from app.models.job import Job

        j_draft = Job(
            employer_id=emp_profile.id,
            title="Draft 1",
            description="desc",
            status=JobStatus.DRAFT,
            is_active=False,
        )
        j_pub = Job(
            employer_id=emp_profile.id,
            title="Pub 1",
            description="desc",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        j_closed = Job(
            employer_id=emp_profile.id,
            title="Closed 1",
            description="desc",
            status=JobStatus.CLOSED,
            is_active=False,
        )
        session.add_all([j_draft, j_pub, j_closed])
        await session.flush()

        app = Application(
            candidate_id=cand_profile.id, job_id=j_pub.id, status=ApplicationStatus.SHORTLISTED
        )
        session.add(app)
        await session.commit()

    res = await async_client.get(
        "/api/v1/employer/dashboard",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    metrics = data["metrics"]
    assert metrics["total_jobs"] == 3
    assert metrics["published_jobs"] == 1
    assert metrics["draft_jobs"] == 1
    assert metrics["closed_jobs"] == 1
    assert metrics["total_applications"] == 1
    assert metrics["applications_by_status"]["SHORTLISTED"] == 1
    assert len(data["recent_jobs"]) == 3
    assert len(data["recent_applications"]) == 1

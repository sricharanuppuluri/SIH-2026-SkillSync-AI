"""Tests for Phase 8 Skill Gap Engine."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill, JobStatus
from app.models.profiles import CandidateProfile, EmployerProfile
from app.models.skill import Skill, SkillType
from app.models.user import User, UserRole


async def _create_user_with_token(
    email: str,
    role: UserRole = UserRole.CANDIDATE,
    full_name: str = "Test User",
) -> tuple[User, str]:
    """Helper to create a user, candidate profile if applicable, and return JWT auth header."""
    user_prefix = email.split("@")[0]
    domain = email.split("@")[1] if "@" in email else "example.com"
    unique_email = f"{user_prefix}_{uuid.uuid4().hex[:8]}@{domain}"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("hashed_secure_password_123"),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        if role == UserRole.CANDIDATE:
            profile = CandidateProfile(
                user_id=user.id,
                headline="Software Engineer",
                bio="Experienced in distributed systems and cloud native architectures.",
                current_role="Backend Developer",
                experience_years=3.5,
                location_city="Bengaluru",
                location_state="Karnataka",
            )
            session.add(profile)
            await session.flush()
        elif role == UserRole.EMPLOYER:
            profile = EmployerProfile(
                user_id=user.id,
                company_name="Cloud Corp",
                industry="Software",
                location_city="Bengaluru",
                location_state="Karnataka",
            )
            session.add(profile)
            await session.flush()

        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, f"Bearer {token}"


async def _create_canonical_skill(
    name: str,
    category: str = "Framework",
    skill_type: SkillType = SkillType.TECHNICAL,
) -> Skill:
    """Helper to create canonical skills with normalized names."""
    normalized_name = name.strip().lower()
    async with AsyncSessionLocal() as session:
        skill = Skill(
            name=name,
            normalized_name=normalized_name,
            category=category,
            skill_type=skill_type,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
        return skill


async def _create_test_job(
    employer_user: User,
    title: str = "Senior Backend Engineer",
    skills_req: list[tuple[Skill, str]] | None = None,
) -> Job:
    """Helper to create a job posting with associated JobSkill requirements."""
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(EmployerProfile).where(EmployerProfile.user_id == employer_user.id)
        )
        employer_prof = res.scalar_one()

        job = Job(
            employer_id=employer_prof.id,
            title=title,
            description="We are looking for a backend engineer with Python and Docker skills.",
            location_city="Bengaluru",
            location_state="Karnataka",
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.SENIOR,
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()

        if skills_req:
            for skill, min_prof in skills_req:
                job_skill = JobSkill(
                    job_id=job.id,
                    skill_id=skill.id,
                    minimum_proficiency=min_prof,
                    is_required=True,
                    weight=1.0,
                )
                session.add(job_skill)
            await session.flush()

        await session.commit()
        await session.refresh(job)
        return job


@pytest.mark.anyio
async def test_skill_gap_unauthenticated_rejected(async_client: AsyncClient):
    """Unauthenticated requests must be rejected with 401."""
    random_uuid = uuid.uuid4()
    resp = await async_client.get(f"/api/v1/candidate/jobs/{random_uuid}/skill-gap")
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_skill_gap_job_not_found(async_client: AsyncClient):
    """Non-existent job UUID must return 404."""
    user, auth_header = await _create_user_with_token("cand_404@example.com", UserRole.CANDIDATE)
    random_uuid = uuid.uuid4()
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{random_uuid}/skill-gap",
        headers={"Authorization": auth_header},
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_skill_gap_empty_job_requirements(async_client: AsyncClient):
    """Job with zero required skills returns valid report with 100% alignment and empty gaps."""
    cand_user, cand_auth = await _create_user_with_token(
        "cand_no_req@example.com", UserRole.CANDIDATE
    )
    emp_user, _ = await _create_user_with_token("emp_no_req@example.com", UserRole.EMPLOYER)

    job = await _create_test_job(emp_user, "General Worker", skills_req=[])

    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": cand_auth},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == str(job.id)
    assert data["job_title"] == "General Worker"
    assert data["skill_alignment_score"] == 100.0
    assert data["summary"]["total_required_skills"] == 0
    assert data["summary"]["matched_skills"] == 0
    assert data["summary"]["partial_skills"] == 0
    assert data["summary"]["missing_skills"] == 0
    assert data["gaps"] == []


@pytest.mark.anyio
async def test_skill_gap_deterministic_matching_and_scoring(async_client: AsyncClient):
    """Verify exact, higher, lower, and missing skill comparisons and alignment calculation."""
    # 1. Create Skills
    unique_suffix = uuid.uuid4().hex[:6]
    python_skill = await _create_canonical_skill(f"Python_{unique_suffix}")
    fastapi_skill = await _create_canonical_skill(f"FastAPI_{unique_suffix}")
    docker_skill = await _create_canonical_skill(f"Docker_{unique_suffix}")
    k8s_skill = await _create_canonical_skill(f"Kubernetes_{unique_suffix}")
    react_skill = await _create_canonical_skill(f"React_{unique_suffix}")

    # 2. Create Candidate with specific proficiencies
    cand_user, cand_auth = await _create_user_with_token(
        f"cand_expert_{unique_suffix}@example.com", UserRole.CANDIDATE, "Alice Engineer"
    )

    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == cand_user.id)
        )
        cand_prof = res.scalar_one()

        cand_skills = [
            CandidateSkill(
                candidate_id=cand_prof.id,
                skill_id=python_skill.id,
                proficiency=ProficiencyLevel.EXPERT,
                years_experience=5.0,
            ),
            CandidateSkill(
                candidate_id=cand_prof.id,
                skill_id=fastapi_skill.id,
                proficiency=ProficiencyLevel.INTERMEDIATE,
                years_experience=2.0,
            ),
            CandidateSkill(
                candidate_id=cand_prof.id,
                skill_id=docker_skill.id,
                proficiency=ProficiencyLevel.INTERMEDIATE,
                years_experience=1.5,
            ),
            CandidateSkill(
                candidate_id=cand_prof.id,
                skill_id=k8s_skill.id,
                proficiency=ProficiencyLevel.BEGINNER,
                years_experience=0.5,
            ),
        ]
        session.add_all(cand_skills)
        await session.commit()

    # 3. Create Job with 5 requirements
    emp_user, _ = await _create_user_with_token(
        f"emp_matching_{unique_suffix}@example.com", UserRole.EMPLOYER
    )
    job = await _create_test_job(
        emp_user,
        "Lead Backend Architect",
        skills_req=[
            (python_skill, "ADVANCED"),  # MATCHED (cand EXPERT)
            (fastapi_skill, "INTERMEDIATE"),  # MATCHED (cand INTERMEDIATE)
            (docker_skill, "ADVANCED"),  # PARTIAL (cand INTERMEDIATE, diff 1 -> MEDIUM)
            (k8s_skill, "ADVANCED"),  # PARTIAL (cand BEGINNER, diff 2 -> HIGH)
            (react_skill, "INTERMEDIATE"),  # MISSING -> HIGH
        ],
    )

    # 4. Request Skill Gap Analysis
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": cand_auth},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Alignment Score calculation:
    # 5 total skills: 2 matched (2.0) + 2 partial (1.0) + 1 missing (0.0)
    # Score = (3.0 / 5.0) * 100 = 60.0%
    assert data["skill_alignment_score"] == 60.0
    assert data["summary"]["total_required_skills"] == 5
    assert data["summary"]["matched_skills"] == 2
    assert data["summary"]["partial_skills"] == 2
    assert data["summary"]["missing_skills"] == 1

    gaps_by_id = {g["skill_id"]: g for g in data["gaps"]}

    # Python: MATCHED
    py_gap = gaps_by_id[str(python_skill.id)]
    assert py_gap["status"] == "MATCHED"
    assert py_gap["severity"] is None
    assert py_gap["required_proficiency"] == "ADVANCED"
    assert py_gap["candidate_proficiency"] == "EXPERT"
    assert "meeting the required" in py_gap["explanation"]

    # FastAPI: MATCHED
    fa_gap = gaps_by_id[str(fastapi_skill.id)]
    assert fa_gap["status"] == "MATCHED"
    assert fa_gap["severity"] is None
    assert fa_gap["required_proficiency"] == "INTERMEDIATE"
    assert fa_gap["candidate_proficiency"] == "INTERMEDIATE"

    # Docker: PARTIAL (diff 1 -> MEDIUM)
    dk_gap = gaps_by_id[str(docker_skill.id)]
    assert dk_gap["status"] == "PARTIAL"
    assert dk_gap["severity"] == "MEDIUM"
    assert dk_gap["required_proficiency"] == "ADVANCED"
    assert dk_gap["candidate_proficiency"] == "INTERMEDIATE"
    assert dk_gap["proficiency_delta"] == 1
    assert "while the job requires ADVANCED" in dk_gap["explanation"]

    # Kubernetes: PARTIAL (diff 2 -> HIGH)
    k8s_gap = gaps_by_id[str(k8s_skill.id)]
    assert k8s_gap["status"] == "PARTIAL"
    assert k8s_gap["severity"] == "HIGH"
    assert k8s_gap["required_proficiency"] == "ADVANCED"
    assert k8s_gap["candidate_proficiency"] == "BEGINNER"
    assert k8s_gap["proficiency_delta"] == 2

    # React: MISSING -> HIGH
    react_gap = gaps_by_id[str(react_skill.id)]
    assert react_gap["status"] == "MISSING"
    assert react_gap["severity"] == "HIGH"
    assert react_gap["candidate_proficiency"] is None
    assert "does not currently list" in react_gap["explanation"]


@pytest.mark.anyio
async def test_skill_gap_candidate_isolation(async_client: AsyncClient):
    """Candidate A and Candidate B see isolated results based on JWT identity."""
    unique_suffix = uuid.uuid4().hex[:6]
    sql_skill = await _create_canonical_skill(f"PostgreSQL_{unique_suffix}")

    cand_a_user, cand_a_auth = await _create_user_with_token(
        f"cand_a_{unique_suffix}@example.com", UserRole.CANDIDATE, "Candidate A"
    )
    cand_b_user, cand_b_auth = await _create_user_with_token(
        f"cand_b_{unique_suffix}@example.com", UserRole.CANDIDATE, "Candidate B"
    )

    async with AsyncSessionLocal() as session:
        res_a = await session.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == cand_a_user.id)
        )
        prof_a = res_a.scalar_one()

        # Candidate A has PostgreSQL at ADVANCED
        session.add(
            CandidateSkill(
                candidate_id=prof_a.id,
                skill_id=sql_skill.id,
                proficiency=ProficiencyLevel.ADVANCED,
            )
        )
        await session.commit()

    emp_user, _ = await _create_user_with_token(
        f"emp_iso_{unique_suffix}@example.com", UserRole.EMPLOYER
    )
    job = await _create_test_job(
        emp_user,
        "Database Administrator",
        skills_req=[(sql_skill, "ADVANCED")],
    )

    # Candidate A should have 100% matched
    resp_a = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": cand_a_auth},
    )
    assert resp_a.status_code == 200
    assert resp_a.json()["skill_alignment_score"] == 100.0
    assert resp_a.json()["summary"]["matched_skills"] == 1

    # Candidate B (has no skills) should have 0% matched, 1 missing
    resp_b = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": cand_b_auth},
    )
    assert resp_b.status_code == 200
    assert resp_b.json()["skill_alignment_score"] == 0.0
    assert resp_b.json()["summary"]["missing_skills"] == 1


@pytest.mark.anyio
async def test_skill_gap_rbac_restrictions(async_client: AsyncClient):
    """Only CANDIDATE and ADMIN roles may invoke the skill gap endpoint."""
    unique_suffix = uuid.uuid4().hex[:6]
    emp_user, emp_auth = await _create_user_with_token(
        f"emp_rbac_{unique_suffix}@example.com", UserRole.EMPLOYER
    )
    train_user, train_auth = await _create_user_with_token(
        f"train_rbac_{unique_suffix}@example.com", UserRole.TRAINING_PROVIDER
    )
    gov_user, gov_auth = await _create_user_with_token(
        f"gov_rbac_{unique_suffix}@example.com", UserRole.GOVERNMENT
    )
    admin_user, admin_auth = await _create_user_with_token(
        f"admin_rbac_{unique_suffix}@example.com", UserRole.ADMIN
    )

    skill = await _create_canonical_skill(f"GoLang_{unique_suffix}")
    job = await _create_test_job(emp_user, "Go Developer", skills_req=[(skill, "INTERMEDIATE")])

    # Employer -> 403 Forbidden
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": emp_auth},
    )
    assert resp.status_code == 403

    # Training Provider -> 403 Forbidden
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": train_auth},
    )
    assert resp.status_code == 403

    # Government -> 403 Forbidden
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": gov_auth},
    )
    assert resp.status_code == 403

    # Admin -> 200 OK
    resp = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap",
        headers={"Authorization": admin_auth},
    )
    assert resp.status_code == 200

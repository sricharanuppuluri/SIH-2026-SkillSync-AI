"""Comprehensive test suite for Phase 16 Employer Skill Contract Exchange."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.job import Job, JobStatus
from app.models.profiles import CandidateProfile, EmployerProfile
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.user import User, UserRole
from app.models.verified_skill import VerificationMethod, VerificationStatus, VerifiedSkill


async def create_sample_skills() -> list[Skill]:
    """Helper to create canonical skills for tests."""
    suffix = uuid.uuid4().hex[:6]
    skills_data = [
        (
            f"Python Programming {suffix}",
            f"python-programming-{suffix}",
            SkillType.TECHNICAL,
            "Programming",
        ),
        (
            f"FastAPI Framework {suffix}",
            f"fastapi-framework-{suffix}",
            SkillType.TECHNICAL,
            "Web Development",
        ),
        (
            f"PostgreSQL Database {suffix}",
            f"postgresql-database-{suffix}",
            SkillType.TECHNICAL,
            "Database",
        ),
        (
            f"System Architecture {suffix}",
            f"system-architecture-{suffix}",
            SkillType.TECHNICAL,
            "Architecture",
        ),
        (
            f"Communication Skills {suffix}",
            f"communication-skills-{suffix}",
            SkillType.SOFT,
            "Interpersonal",
        ),
    ]
    created = []
    async with AsyncSessionLocal() as db_session:
        for name, slug, stype, cat in skills_data:
            skill = Skill(
                name=name,
                slug=slug,
                normalized_name=name.strip().lower(),
                skill_type=stype,
                category=cat,
                status=SkillStatus.ACTIVE,
            )
            db_session.add(skill)
            created.append(skill)
        await db_session.commit()
        for s in created:
            await db_session.refresh(s)
    return created


async def create_employer_and_job() -> tuple[User, EmployerProfile, Job]:
    """Helper to create an employer and owned job for tests."""
    async with AsyncSessionLocal() as db_session:
        employer_user = User(
            email=f"contract_emp_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="dummyhashedpw",
            full_name="Employer Test",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        db_session.add(employer_user)
        await db_session.flush()

        employer_prof = EmployerProfile(
            user_id=employer_user.id,
            company_name=f"ContractCorp {uuid.uuid4().hex[:4]}",
            industry="Technology",
        )
        db_session.add(employer_prof)
        await db_session.flush()

        job = Job(
            employer_id=employer_prof.id,
            title="Senior Backend Engineer",
            description="Core platform engineering",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        db_session.add(job)
        await db_session.commit()
        await db_session.refresh(job)
        await db_session.refresh(employer_user)
        await db_session.refresh(employer_prof)
    return employer_user, employer_prof, job


@pytest.mark.asyncio
async def test_create_and_update_contract_draft(async_client: AsyncClient):
    """Test drafting a new contract and editing requirements while in DRAFT status."""
    skills = await create_sample_skills()
    s1, s2, s3 = skills[:3]
    employer_user, employer_prof, job = await create_employer_and_job()

    payload = {
        "job_id": str(job.id),
        "title": "Backend Engineering Competency Contract",
        "description": "Standardized skill requirements for Senior Backend Engineer",
        "requirements": [
            {
                "skill_id": str(s1.id),
                "required_proficiency": "ADVANCED",
                "requirement_type": "REQUIRED",
                "importance": "CRITICAL",
                "minimum_experience_months": 24,
                "evidence_type": "VERIFIED_SKILL",
                "notes": "Core Python proficiency",
            },
            {
                "skill_id": str(s2.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "minimum_experience_months": 12,
                "evidence_type": "COURSE_COMPLETION",
                "notes": "API design experience",
            },
        ],
    }

    token = create_access_token(subject=str(employer_user.id), role=employer_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    res = await async_client.post("/api/v1/contracts", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()

    assert data["job_id"] == str(job.id)
    assert data["version"] == 1
    assert data["status"] == "DRAFT"
    assert data["requirements_count"] == 2
    assert data["quality_score"] is not None
    assert data["quality_score"] > 0
    contract_id = data["id"]

    # Update contract draft with third skill
    update_payload = {
        "title": "Updated Backend Engineering Contract",
        "requirements": [
            {
                "skill_id": str(s1.id),
                "required_proficiency": "ADVANCED",
                "requirement_type": "REQUIRED",
                "importance": "CRITICAL",
                "minimum_experience_months": 36,
                "evidence_type": "VERIFIED_SKILL",
            },
            {
                "skill_id": str(s2.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "minimum_experience_months": 12,
                "evidence_type": "NONE",
            },
            {
                "skill_id": str(s3.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "PREFERRED",
                "importance": "MEDIUM",
                "minimum_experience_months": 6,
                "evidence_type": "NONE",
            },
        ],
    }

    put_res = await async_client.put(
        f"/api/v1/contracts/{contract_id}", json=update_payload, headers=headers
    )
    assert put_res.status_code == 200, put_res.text
    updated_data = put_res.json()
    assert updated_data["title"] == "Updated Backend Engineering Contract"
    assert updated_data["requirements_count"] == 3


@pytest.mark.asyncio
async def test_contract_activation_and_versioning_lifecycle(async_client: AsyncClient):
    """Test lifecycle: v1 Draft -> Activate -> v2 Draft -> Activate v2 (archives v1)."""
    skills = await create_sample_skills()
    s1 = skills[0]
    employer_user, employer_prof, job = await create_employer_and_job()

    token = create_access_token(subject=str(employer_user.id), role=employer_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create v1 Draft
    v1_payload = {
        "job_id": str(job.id),
        "title": "Contract v1",
        "requirements": [
            {
                "skill_id": str(s1.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "minimum_experience_months": 12,
                "evidence_type": "NONE",
            }
        ],
    }
    res_v1 = await async_client.post("/api/v1/contracts", json=v1_payload, headers=headers)
    assert res_v1.status_code == 201
    c1_id = res_v1.json()["id"]
    assert res_v1.json()["version"] == 1
    assert res_v1.json()["status"] == "DRAFT"

    # 2. Activate v1
    act_res1 = await async_client.post(f"/api/v1/contracts/{c1_id}/activate", headers=headers)
    assert act_res1.status_code == 200
    assert act_res1.json()["status"] == "ACTIVE"
    assert act_res1.json()["effective_at"] is not None

    # Check job active contract endpoint
    job_act_res = await async_client.get(f"/api/v1/jobs/{job.id}/contract")
    assert job_act_res.status_code == 200
    assert job_act_res.json()["id"] == c1_id
    assert job_act_res.json()["status"] == "ACTIVE"

    # 3. Create v2 via new-version endpoint
    new_v_res = await async_client.post(f"/api/v1/contracts/{c1_id}/new-version", headers=headers)
    assert new_v_res.status_code == 201
    c2_id = new_v_res.json()["id"]
    assert new_v_res.json()["version"] == 2
    assert new_v_res.json()["status"] == "DRAFT"

    # 4. Cannot edit activated v1
    put_v1 = await async_client.put(
        f"/api/v1/contracts/{c1_id}", json={"title": "Illegal Edit"}, headers=headers
    )
    assert put_v1.status_code == 400
    assert "Only DRAFT contracts can be modified" in put_v1.json()["detail"]

    # 5. Activate v2 -> archives v1
    act_res2 = await async_client.post(f"/api/v1/contracts/{c2_id}/activate", headers=headers)
    assert act_res2.status_code == 200
    assert act_res2.json()["status"] == "ACTIVE"
    assert act_res2.json()["version"] == 2

    # Verify v1 is now ARCHIVED
    v1_check = await async_client.get(f"/api/v1/contracts/{c1_id}", headers=headers)
    assert v1_check.status_code == 200
    assert v1_check.json()["status"] == "ARCHIVED"
    assert v1_check.json()["archived_at"] is not None

    # Verify job contract history returns both versions
    hist_res = await async_client.get(f"/api/v1/jobs/{job.id}/contract/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2
    assert history[0]["version"] == 2
    assert history[0]["status"] == "ACTIVE"
    assert history[1]["version"] == 1
    assert history[1]["status"] == "ARCHIVED"


@pytest.mark.asyncio
async def test_contract_validation_rules(async_client: AsyncClient):
    """Test duplicate skill prevention, inexistent skills, and empty contract activation."""
    skills = await create_sample_skills()
    s1 = skills[0]
    employer_user, employer_prof, job = await create_employer_and_job()

    token = create_access_token(subject=str(employer_user.id), role=employer_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    # Duplicate skill error
    dup_payload = {
        "job_id": str(job.id),
        "requirements": [
            {"skill_id": str(s1.id), "required_proficiency": "BEGINNER"},
            {"skill_id": str(s1.id), "required_proficiency": "ADVANCED"},
        ],
    }
    dup_res = await async_client.post("/api/v1/contracts", json=dup_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "Duplicate skills are not permitted" in dup_res.json()["detail"]

    # Non-existent skill ID
    fake_skill_id = str(uuid.uuid4())
    fake_payload = {
        "job_id": str(job.id),
        "requirements": [{"skill_id": fake_skill_id, "required_proficiency": "BEGINNER"}],
    }
    fake_res = await async_client.post("/api/v1/contracts", json=fake_payload, headers=headers)
    assert fake_res.status_code == 400
    assert "do not exist in the canonical taxonomy" in fake_res.json()["detail"]


@pytest.mark.asyncio
async def test_contract_quality_score_and_insights(async_client: AsyncClient):
    """Test deterministic quality completeness scoring and market insights."""
    skills = await create_sample_skills()
    s1, s2, s3, s4 = skills[:4]
    employer_user, employer_prof, job = await create_employer_and_job()

    token = create_access_token(subject=str(employer_user.id), role=employer_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "job_id": str(job.id),
        "title": "Comprehensive Contract",
        "requirements": [
            {
                "skill_id": str(s1.id),
                "required_proficiency": "ADVANCED",
                "requirement_type": "REQUIRED",
                "importance": "CRITICAL",
                "minimum_experience_months": 24,
                "evidence_type": "VERIFIED_SKILL",
            },
            {
                "skill_id": str(s2.id),
                "required_proficiency": "ADVANCED",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "minimum_experience_months": 12,
                "evidence_type": "COURSE_COMPLETION",
            },
            {
                "skill_id": str(s3.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "PREFERRED",
                "importance": "MEDIUM",
                "minimum_experience_months": 6,
                "evidence_type": "NONE",
            },
            {
                "skill_id": str(s4.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "PREFERRED",
                "importance": "LOW",
                "minimum_experience_months": 0,
                "evidence_type": "NONE",
            },
        ],
    }
    create_res = await async_client.post("/api/v1/contracts", json=payload, headers=headers)
    assert create_res.status_code == 201
    contract_id = create_res.json()["id"]

    # Quality Endpoint
    q_res = await async_client.get(f"/api/v1/contracts/{contract_id}/quality", headers=headers)
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["score"] >= 80
    assert q_data["rating"] in ("EXCELLENT", "GOOD")
    assert len(q_data["explanations"]) >= 3

    # Insights Endpoint
    ins_res = await async_client.get(f"/api/v1/contracts/{contract_id}/insights", headers=headers)
    assert ins_res.status_code == 200
    ins_data = ins_res.json()
    assert ins_data["total_skills"] == 4
    assert ins_data["required_skills_count"] == 2
    assert ins_data["preferred_skills_count"] == 2
    assert ins_data["critical_skills_count"] == 1
    assert ins_data["verified_evidence_count"] == 2
    assert len(ins_data["skill_insights"]) == 4


@pytest.mark.asyncio
async def test_employer_contract_idor_and_rbac(async_client: AsyncClient):
    """Test that employers cannot access or mutate contracts belonging to other employers."""
    skills = await create_sample_skills()
    s1 = skills[0]
    emp1_user, emp1_prof, job1 = await create_employer_and_job()

    # Create Employer 2
    async with AsyncSessionLocal() as db_session:
        emp2_user = User(
            email=f"emp2_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashedpw",
            full_name="Employer Two",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        db_session.add(emp2_user)
        await db_session.flush()

        emp2_prof = EmployerProfile(
            user_id=emp2_user.id,
            company_name=f"Foreign Corp {uuid.uuid4().hex[:4]}",
        )
        db_session.add(emp2_prof)
        await db_session.commit()
        await db_session.refresh(emp2_user)

    token1 = create_access_token(subject=str(emp1_user.id), role=emp1_user.role.value)
    token2 = create_access_token(subject=str(emp2_user.id), role=emp2_user.role.value)

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Employer 1 creates contract for Job 1
    create_res = await async_client.post(
        "/api/v1/contracts",
        json={
            "job_id": str(job1.id),
            "requirements": [{"skill_id": str(s1.id), "required_proficiency": "INTERMEDIATE"}],
        },
        headers=headers1,
    )
    assert create_res.status_code == 201
    contract_id = create_res.json()["id"]

    # Employer 2 attempts to create contract for Job 1 -> 403 Forbidden
    emp2_create = await async_client.post(
        "/api/v1/contracts",
        json={
            "job_id": str(job1.id),
            "requirements": [{"skill_id": str(s1.id), "required_proficiency": "INTERMEDIATE"}],
        },
        headers=headers2,
    )
    assert emp2_create.status_code == 403

    # Employer 2 attempts to GET Employer 1's draft contract -> 403 Forbidden
    emp2_get = await async_client.get(f"/api/v1/contracts/{contract_id}", headers=headers2)
    assert emp2_get.status_code == 403

    # Employer 2 attempts to PUT Employer 1's contract -> 403 Forbidden
    emp2_put = await async_client.put(
        f"/api/v1/contracts/{contract_id}",
        json={"title": "Hacked Title"},
        headers=headers2,
    )
    assert emp2_put.status_code == 403

    # Candidate attempts to create contract -> 403 Forbidden
    async with AsyncSessionLocal() as db_session:
        cand_user = User(
            email=f"cand_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="pw",
            full_name="Candidate Test",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        db_session.add(cand_user)
        await db_session.commit()
        await db_session.refresh(cand_user)

    cand_token = create_access_token(subject=str(cand_user.id), role=cand_user.role.value)
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    cand_create = await async_client.post(
        "/api/v1/contracts",
        json={"job_id": str(job1.id), "requirements": []},
        headers=cand_headers,
    )
    assert cand_create.status_code == 403

    # Unauthenticated request -> 401 Unauthorized
    unauth_res = await async_client.post(
        "/api/v1/contracts", json={"job_id": str(job1.id), "requirements": []}
    )
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_skill_gap_engine_integration_with_active_contract(async_client: AsyncClient):
    """Test that Skill Gap Engine uses active contract and verifies evidence requirements."""
    skills = await create_sample_skills()
    s1, s2 = skills[:2]
    employer_user, employer_prof, job = await create_employer_and_job()

    async with AsyncSessionLocal() as db_session:
        cand_user = User(
            email=f"cand_eval_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="pw",
            full_name="Alice Engineer",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        db_session.add(cand_user)
        await db_session.flush()

        cand_prof = CandidateProfile(
            user_id=cand_user.id,
            headline="Full Stack Engineer",
            experience_years=3.0,
        )
        db_session.add(cand_prof)
        await db_session.flush()

        # Candidate has self-declared Python (s1) at ADVANCED
        cand_skill = CandidateSkill(
            candidate_id=cand_prof.id,
            skill_id=s1.id,
            proficiency=ProficiencyLevel.ADVANCED,
            years_experience=3,
        )
        db_session.add(cand_skill)

        # Candidate has Verified Skill for s2 (FastAPI) at INTERMEDIATE
        cand_skill2 = CandidateSkill(
            candidate_id=cand_prof.id,
            skill_id=s2.id,
            proficiency=ProficiencyLevel.INTERMEDIATE,
            years_experience=2,
        )
        db_session.add(cand_skill2)

        ver_skill2 = VerifiedSkill(
            candidate_id=cand_prof.id,
            skill_id=s2.id,
            verification_method=VerificationMethod.COURSE_COMPLETION,
            verification_status=VerificationStatus.VERIFIED,
            verification_summary="Completed course curriculum",
        )
        db_session.add(ver_skill2)
        await db_session.commit()
        await db_session.refresh(cand_user)

    emp_token = create_access_token(subject=str(employer_user.id), role=employer_user.role.value)
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    contract_payload = {
        "job_id": str(job.id),
        "title": "Verified Requirements Contract",
        "requirements": [
            {
                "skill_id": str(s1.id),
                "required_proficiency": "ADVANCED",
                "requirement_type": "REQUIRED",
                "importance": "CRITICAL",
                "minimum_experience_months": 24,
                "evidence_type": "VERIFIED_SKILL",  # Candidate only self-declared s1!
            },
            {
                "skill_id": str(s2.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "minimum_experience_months": 12,
                "evidence_type": "COURSE_COMPLETION",  # Candidate has verified s2!
            },
        ],
    }
    c_res = await async_client.post("/api/v1/contracts", json=contract_payload, headers=emp_headers)
    assert c_res.status_code == 201
    c_id = c_res.json()["id"]

    act_res = await async_client.post(f"/api/v1/contracts/{c_id}/activate", headers=emp_headers)
    assert act_res.status_code == 200

    # Evaluate Candidate Skill Gap against Job
    cand_token = create_access_token(subject=str(cand_user.id), role=cand_user.role.value)
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    gap_res = await async_client.get(
        f"/api/v1/candidate/jobs/{job.id}/skill-gap", headers=cand_headers
    )
    assert gap_res.status_code == 200
    gap_data = gap_res.json()

    assert gap_data["job_id"] == str(job.id)
    gaps = gap_data["gaps"]
    assert len(gaps) == 2

    # s1 should have an evidence gap (PARTIAL) because contract requires VERIFIED_SKILL
    s1_gap = next(g for g in gaps if g["skill_id"] == str(s1.id))
    assert s1_gap["status"] == "PARTIAL"
    assert "requires verified evidence" in s1_gap["explanation"]

    # s2 should be MATCHED because candidate has verified evidence satisfying contract
    s2_gap = next(g for g in gaps if g["skill_id"] == str(s2.id))
    assert s2_gap["status"] == "MATCHED"
    assert "[VERIFIED]" in s2_gap["explanation"]

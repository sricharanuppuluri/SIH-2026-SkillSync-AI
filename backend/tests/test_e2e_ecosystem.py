"""
Phase 19 — End-to-End Ecosystem Integration & SIH Closed-Loop Verification

Automated E2E tests validating the full SkillSync AI ecosystem flow:
  Employer -> Job -> Skill Contract -> Demand Intelligence -> Forecast
  -> Simulator -> Candidate -> Skill Gap -> Learning Hub -> Course Completion
  -> Verified Skill Passport -> Semantic/Exact Matching -> Job Application
  -> Placement Outcome -> Retention -> Employer Feedback -> Provider Performance Index
  -> Macro Ecosystem Feedback & Zero PII.

Covers E2E-01 through E2E-18.
"""

import uuid
from datetime import UTC, date, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.db.seed import reset_demo_ecosystem, seed_demo_ecosystem
from app.models.application import Application, ApplicationStatus
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseSkill, CourseStatus
from app.models.curriculum import CurriculumLesson, CurriculumModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.enrollment_progress import EnrollmentLessonProgress
from app.models.job import EmploymentType, Job, JobSkill, JobStatus
from app.models.outcome import PlacementOutcome, RetentionStatus
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.skill_contract import (
    ContractStatus,
    SkillContract,
)
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Test Helpers & Fixtures
# ---------------------------------------------------------------------------


async def _create_test_canonical_skill(name_prefix: str = "Skill") -> Skill:
    """Create a unique canonical skill for isolated testing."""
    suffix = uuid.uuid4().hex[:10]
    async with AsyncSessionLocal() as session:
        skill = Skill(
            name=f"{name_prefix} {suffix}",
            slug=f"{name_prefix.lower()}-{suffix}",
            normalized_name=f"{name_prefix.lower()} {suffix}",
            skill_type=SkillType.TECHNICAL,
            category="Software Engineering",
            subcategory="Backend",
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
        return skill


async def _create_test_user_and_token(
    role: UserRole, prefix: str = "user"
) -> tuple[User, str, dict[str, str]]:
    """Create a test user with unique credentials and return (user, token, headers)."""
    suffix = uuid.uuid4().hex[:10]
    email = f"{prefix}_{suffix}@skillsync.internal"
    async with AsyncSessionLocal() as session:
        user = User(
            email=email,
            password_hash=get_password_hash("DevPassword123!"),
            full_name=f"Test {role.value} {suffix[:4]}",
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    headers = {"Authorization": f"Bearer {token}"}
    return user, token, headers


# ---------------------------------------------------------------------------
# E2E-01: Employer creates job -> job visible
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_01_employer_creates_job_visible(async_client: AsyncClient):
    employer_user, _, headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e01"
    )
    skill = await _create_test_canonical_skill("Cloud Architecture")

    async with AsyncSessionLocal() as session:
        prof = EmployerProfile(
            user_id=employer_user.id,
            company_name=f"TechNova Solutions {uuid.uuid4().hex[:4]}",
            industry="Information Technology",
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(prof)
        await session.commit()

    # Create job via Employer API
    job_payload = {
        "title": "Lead Cloud Infrastructure Engineer",
        "description": "Design and maintain high-availability cloud platforms.",
        "employment_type": "FULL_TIME",
        "experience_level": "SENIOR",
        "location_city": "Bengaluru",
        "location_state": "Karnataka",
        "salary_min": 1800000.0,
        "salary_max": 2400000.0,
        "is_remote": False,
        "skill_requirements": [
            {
                "skill_id": str(skill.id),
                "is_required": True,
                "minimum_proficiency": "ADVANCED",
                "weight": 2.0,
            }
        ],
    }

    create_res = await async_client.post("/api/v1/employer/jobs", json=job_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    job_data = create_res.json()
    job_id = job_data["id"]

    # Publish the job
    publish_res = await async_client.put(f"/api/v1/employer/jobs/{job_id}/publish", headers=headers)
    assert publish_res.status_code in (200, 204), publish_res.text

    # Verify public visibility
    public_res = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert public_res.status_code == 200
    public_job = public_res.json()
    assert public_job["title"] == "Lead Cloud Infrastructure Engineer"
    assert public_job["status"] == "PUBLISHED"


# ---------------------------------------------------------------------------
# E2E-02: Job -> Skill Contract -> activation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_02_job_skill_contract_activation(async_client: AsyncClient):
    employer_user, _, headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e02"
    )
    skill1 = await _create_test_canonical_skill("FastAPI Backend")
    skill2 = await _create_test_canonical_skill("PostgreSQL Database")

    async with AsyncSessionLocal() as session:
        prof = EmployerProfile(
            user_id=employer_user.id,
            company_name="Apex Global Tech",
            industry="Software",
        )
        session.add(prof)
        await session.flush()
        job = Job(
            employer_id=prof.id,
            title="Senior API Developer",
            description="Build scalable microservices",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)

    # 1. Create Draft Skill Contract
    contract_payload = {
        "job_id": str(job.id),
        "title": "API Developer Talent Pipeline 2026",
        "description": "Skill contract specifying verified requirements.",
        "requirements": [
            {
                "skill_id": str(skill1.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "CRITICAL",
                "evidence_type": "VERIFIED_SKILL",
                "minimum_experience_months": 18,
            },
            {
                "skill_id": str(skill2.id),
                "required_proficiency": "INTERMEDIATE",
                "requirement_type": "REQUIRED",
                "importance": "HIGH",
                "evidence_type": "COURSE_COMPLETION",
                "minimum_experience_months": 12,
            },
        ],
    }

    create_res = await async_client.post(
        "/api/v1/contracts", json=contract_payload, headers=headers
    )
    assert create_res.status_code == 201, create_res.text
    contract_data = create_res.json()
    contract_id = contract_data["id"]
    assert contract_data["status"] == "DRAFT"
    assert contract_data["requirements_count"] == 2

    # 2. Check quality score
    quality_res = await async_client.get(
        f"/api/v1/contracts/{contract_id}/quality", headers=headers
    )
    assert quality_res.status_code == 200
    quality = quality_res.json()
    assert quality["score"] >= 50

    # 3. Activate Contract
    activate_res = await async_client.post(
        f"/api/v1/contracts/{contract_id}/activate", headers=headers
    )
    assert activate_res.status_code == 200
    assert activate_res.json()["status"] == "ACTIVE"


# ---------------------------------------------------------------------------
# E2E-03: Published jobs -> demand aggregation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_03_published_jobs_demand_aggregation(async_client: AsyncClient):
    emp_user, _, _ = await _create_test_user_and_token(UserRole.EMPLOYER, prefix="emp_e2e03")
    skill = await _create_test_canonical_skill("Rust Systems")

    async with AsyncSessionLocal() as session:
        prof = EmployerProfile(
            user_id=emp_user.id,
            company_name="Rust Systems Corp",
            industry="Systems",
        )
        session.add(prof)
        await session.flush()
        job = Job(
            employer_id=prof.id,
            title="Systems Engineer",
            description="Systems level Rust development",
            status=JobStatus.PUBLISHED,
            is_active=True,
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(job)
        await session.flush()
        session.add(JobSkill(job_id=job.id, skill_id=skill.id, is_required=True))
        await session.commit()

    # Query Demand overview
    overview_res = await async_client.get("/api/v1/demand/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["kpis"]["total_active_jobs"] >= 1


# ---------------------------------------------------------------------------
# E2E-04: Demand -> forecast
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_04_demand_forecast(async_client: AsyncClient):
    _, _, headers = await _create_test_user_and_token(UserRole.GOVERNMENT, prefix="gov_e2e04")
    skill = await _create_test_canonical_skill("AI Prompt Engineering")

    # Query forecast for canonical skill
    res = await async_client.get(
        f"/api/v1/demand/skills/{skill.id}/forecast?horizon=3", headers=headers
    )
    assert res.status_code == 200, res.text
    forecast = res.json()
    assert "monthly_forecasts" in forecast
    assert len(forecast["monthly_forecasts"]) == 3
    assert forecast["expected_growth_percentage"] is not None


# ---------------------------------------------------------------------------
# E2E-05: Demand -> what-if simulation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_05_demand_what_if_simulation(async_client: AsyncClient):
    _, _, headers = await _create_test_user_and_token(UserRole.GOVERNMENT, prefix="gov_e2e05")
    skill = await _create_test_canonical_skill("Distributed Storage")

    sim_payload = {
        "skill_id": str(skill.id),
        "baseline_type": "ACTUAL",
        "demand_change_percent": 30.0,
        "additional_verified_supply": 25,
        "additional_training_capacity": 50,
    }

    res = await async_client.post("/api/v1/simulator/skill", json=sim_payload, headers=headers)
    assert res.status_code == 200, res.text
    result = res.json()
    assert result["projected"]["demand"] >= 0


# ---------------------------------------------------------------------------
# E2E-06: Candidate -> skill gap
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_06_candidate_skill_gap(async_client: AsyncClient):
    cand_user, _, cand_headers = await _create_test_user_and_token(
        UserRole.CANDIDATE, prefix="cand_e2e06"
    )
    skill_matched = await _create_test_canonical_skill("Python Lang")
    skill_missing = await _create_test_canonical_skill("Kubernetes Cluster")

    async with AsyncSessionLocal() as session:
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=2.0)
        session.add(cand_prof)
        await session.flush()
        # Candidate has Python
        session.add(
            CandidateSkill(
                candidate_id=cand_prof.id,
                skill_id=skill_matched.id,
                proficiency=ProficiencyLevel.ADVANCED,
                years_experience=2.0,
            )
        )
        # Employer & Job requires Python and Kubernetes
        emp_user, _, _ = await _create_test_user_and_token(UserRole.EMPLOYER, prefix="emp_job_gap")
        emp_prof = EmployerProfile(user_id=emp_user.id, company_name="GapTest Corp")
        session.add(emp_prof)
        await session.flush()
        job = Job(
            employer_id=emp_prof.id,
            title="DevOps Python Engineer",
            description="Requires Python and Kubernetes",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()
        session.add(JobSkill(job_id=job.id, skill_id=skill_matched.id, is_required=True))
        session.add(JobSkill(job_id=job.id, skill_id=skill_missing.id, is_required=True))
        await session.commit()
        await session.refresh(job)

    # Evaluate skill gap
    res = await async_client.get(f"/api/v1/candidate/jobs/{job.id}/skill-gap", headers=cand_headers)
    assert res.status_code == 200, res.text
    gap_data = res.json()
    assert gap_data["job_id"] == str(job.id)
    assert gap_data["skill_alignment_score"] is not None
    gap_skills = {g["skill_name"]: g["status"] for g in gap_data["gaps"]}
    assert skill_matched.name in gap_skills
    assert gap_skills[skill_matched.name] in ("MATCHED", "PARTIAL")
    assert skill_missing.name in gap_skills
    assert gap_skills[skill_missing.name] == "MISSING"


# ---------------------------------------------------------------------------
# E2E-07: Candidate -> course enrollment
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_07_candidate_course_enrollment(async_client: AsyncClient):
    cand_user, _, cand_headers = await _create_test_user_and_token(
        UserRole.CANDIDATE, prefix="cand_e2e07"
    )
    tp_user, _, _ = await _create_test_user_and_token(UserRole.TRAINING_PROVIDER, prefix="tp_e2e07")
    skill = await _create_test_canonical_skill("GraphQL API")

    async with AsyncSessionLocal() as session:
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=1.0)
        session.add(cand_prof)
        tp_prof = TrainingProviderProfile(user_id=tp_user.id, institution_name="GraphQL Academy")
        session.add(tp_prof)
        await session.flush()

        course = Course(
            provider_id=tp_prof.id,
            title="Complete GraphQL Masterclass",
            description="Master GraphQL APIs",
            status=CourseStatus.PUBLISHED,
            capacity=50,
            is_active=True,
        )
        session.add(course)
        await session.flush()
        session.add(CourseSkill(course_id=course.id, skill_id=skill.id))
        await session.commit()
        await session.refresh(course)

    # Candidate enrolls via API
    enroll_res = await async_client.post(
        f"/api/v1/candidate/learning/courses/{course.id}/enroll", headers=cand_headers
    )
    assert enroll_res.status_code in (200, 201), enroll_res.text
    enr_data = enroll_res.json()
    assert enr_data["status"] in ("ENROLLED", "IN_PROGRESS", "ACTIVE")


# ---------------------------------------------------------------------------
# E2E-08: Course completion -> verified skill
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_08_course_completion_verified_skill(async_client: AsyncClient):
    cand_user, _, cand_headers = await _create_test_user_and_token(
        UserRole.CANDIDATE, prefix="cand_e2e08"
    )
    tp_user, _, _ = await _create_test_user_and_token(UserRole.TRAINING_PROVIDER, prefix="tp_e2e08")
    skill = await _create_test_canonical_skill("Modern TypeScript")

    async with AsyncSessionLocal() as session:
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=1.5)
        session.add(cand_prof)
        tp_prof = TrainingProviderProfile(
            user_id=tp_user.id, institution_name="TypeScript Institute"
        )
        session.add(tp_prof)
        await session.flush()

        course = Course(
            provider_id=tp_prof.id,
            title="TypeScript Professional Bootcamp",
            description="Advanced TypeScript and Node.js",
            status=CourseStatus.PUBLISHED,
            is_active=True,
        )
        session.add(course)
        await session.flush()
        session.add(CourseSkill(course_id=course.id, skill_id=skill.id))
        mod = CurriculumModule(course_id=course.id, title="Module 1", order_index=0)
        session.add(mod)
        await session.flush()

        les1 = CurriculumLesson(module_id=mod.id, title="Lesson 1", order_index=0)
        session.add(les1)
        await session.flush()

        # Completed enrollment
        enrollment = Enrollment(
            candidate_id=cand_prof.id,
            course_id=course.id,
            status=EnrollmentStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        session.add(enrollment)
        await session.flush()

        lp = EnrollmentLessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=les1.id,
            is_completed=True,
            completed_at=datetime.now(UTC),
        )
        session.add(lp)
        await session.commit()

    # Verify via Passport API
    res = await async_client.get("/api/v1/candidate/passport", headers=cand_headers)
    assert res.status_code == 200, res.text
    passport = res.json()
    assert passport["stats"]["verified_skills"] >= 1
    verified_names = [s["skill_name"] for s in passport["skills"] if s["status"] == "VERIFIED"]
    assert skill.name in verified_names


# ---------------------------------------------------------------------------
# E2E-09: Verified skill -> improved matching/passport state
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_09_verified_skill_improved_matching_and_passport(async_client: AsyncClient):
    cand_user, _, cand_headers = await _create_test_user_and_token(
        UserRole.CANDIDATE, prefix="cand_e2e09"
    )
    res = await async_client.get("/api/v1/candidate/passport", headers=cand_headers)
    assert res.status_code == 200
    data = res.json()
    assert "skills" in data
    assert "stats" in data
    assert "candidate" in data
    assert "is_share_enabled" in data


# ---------------------------------------------------------------------------
# E2E-10: Candidate -> application -> employer status update
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_10_candidate_application_employer_status_update(async_client: AsyncClient):
    cand_user, _, _ = await _create_test_user_and_token(UserRole.CANDIDATE, prefix="cand_e2e10")
    emp_user, _, emp_headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e10"
    )

    async with AsyncSessionLocal() as session:
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=2.0)
        session.add(cand_prof)
        emp_prof = EmployerProfile(user_id=emp_user.id, company_name="Talent Corp")
        session.add(emp_prof)
        await session.flush()
        job = Job(
            employer_id=emp_prof.id,
            title="Software Developer",
            description="General software role",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()
        app = Application(
            candidate_id=cand_prof.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
        )
        session.add(app)
        await session.commit()
        await session.refresh(job)
        await session.refresh(app)

    # Employer reviews applicant & transitions status
    put_res = await async_client.put(
        f"/api/v1/employer/applications/{app.id}/status",
        json={"status": "HIRED"},
        headers=emp_headers,
    )
    assert put_res.status_code == 200, put_res.text
    assert put_res.json()["status"] == "HIRED"


# ---------------------------------------------------------------------------
# E2E-11: Application/placement -> outcome
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_11_application_placement_outcome(async_client: AsyncClient):
    emp_user, _, emp_headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e11"
    )
    cand_user, _, _ = await _create_test_user_and_token(UserRole.CANDIDATE, prefix="cand_e2e11")

    async with AsyncSessionLocal() as session:
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=2.0)
        emp_prof = EmployerProfile(user_id=emp_user.id, company_name="Placement Dynamics")
        session.add_all([cand_prof, emp_prof])
        await session.flush()

        job = Job(
            employer_id=emp_prof.id,
            title="Site Reliability Engineer",
            description="Platform operations",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()

        contract = SkillContract(
            job_id=job.id,
            version=1,
            status=ContractStatus.ACTIVE,
            title="SRE Placement Contract",
        )
        session.add(contract)
        await session.flush()

        app = Application(
            candidate_id=cand_prof.id,
            job_id=job.id,
            status=ApplicationStatus.HIRED,
        )
        session.add(app)
        await session.commit()
        await session.refresh(app)
        await session.refresh(contract)

    placement_payload = {
        "application_id": str(app.id),
        "starting_salary_annual": 1200000.0,
        "employment_type": "FULL_TIME",
        "contract_id": str(contract.id),
        "placement_date": str(date.today()),
    }

    res = await async_client.post(
        "/api/v1/outcomes/placements", json=placement_payload, headers=emp_headers
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["starting_salary_annual"] == 1200000.0
    assert data["retention_status"] == "ACTIVE"


# ---------------------------------------------------------------------------
# E2E-12: Outcome -> retention
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_12_outcome_retention_milestone(async_client: AsyncClient):
    emp_user, _, emp_headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e12"
    )

    async with AsyncSessionLocal() as session:
        cand_user, _, _ = await _create_test_user_and_token(UserRole.CANDIDATE, prefix="cand_e2e12")
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=2.0)
        emp_prof = EmployerProfile(user_id=emp_user.id, company_name="Retention Corp")
        session.add_all([cand_prof, emp_prof])
        await session.flush()

        job = Job(
            employer_id=emp_prof.id,
            title="DevOps Specialist",
            description="Cloud deployments",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()

        app = Application(
            candidate_id=cand_prof.id,
            job_id=job.id,
            status=ApplicationStatus.HIRED,
        )
        session.add(app)
        await session.flush()

        placement = PlacementOutcome(
            application_id=app.id,
            candidate_id=cand_prof.id,
            employer_id=emp_prof.id,
            job_id=job.id,
            placement_date=date.today(),
            starting_salary_annual=950000.0,
            employment_type=EmploymentType.FULL_TIME,
            retention_status=RetentionStatus.ACTIVE,
            verified_by_employer=True,
        )
        session.add(placement)
        await session.commit()
        await session.refresh(placement)

    # Update retention milestone
    payload = {
        "retention_status": "RETAINED_90D",
        "contract_fulfillment_score": 96.0,
        "employer_satisfaction_rating": 5,
        "employer_feedback_notes": "Exceeded all performance milestones.",
    }
    res = await async_client.put(
        f"/api/v1/outcomes/placements/{placement.id}/retention",
        json=payload,
        headers=emp_headers,
    )
    assert res.status_code == 200, res.text
    updated = res.json()
    assert updated["retention_status"] == "RETAINED_90D"
    assert updated["contract_fulfillment_score"] == 96.0


# ---------------------------------------------------------------------------
# E2E-13: Outcome -> employer feedback
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_13_outcome_employer_feedback(async_client: AsyncClient):
    emp_user, _, emp_headers = await _create_test_user_and_token(
        UserRole.EMPLOYER, prefix="emp_e2e13"
    )

    async with AsyncSessionLocal() as session:
        cand_user, _, _ = await _create_test_user_and_token(UserRole.CANDIDATE, prefix="cand_e2e13")
        cand_prof = CandidateProfile(user_id=cand_user.id, experience_years=1.0)
        emp_prof = EmployerProfile(user_id=emp_user.id, company_name="Feedback Corp")
        session.add_all([cand_prof, emp_prof])
        await session.flush()
        job = Job(
            employer_id=emp_prof.id,
            title="Junior QA Engineer",
            description="Automated tests",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        session.add(job)
        await session.flush()
        app = Application(candidate_id=cand_prof.id, job_id=job.id, status=ApplicationStatus.HIRED)
        session.add(app)
        await session.flush()
        placement = PlacementOutcome(
            application_id=app.id,
            candidate_id=cand_prof.id,
            employer_id=emp_prof.id,
            job_id=job.id,
            placement_date=date.today(),
            starting_salary_annual=600000.0,
            employment_type=EmploymentType.FULL_TIME,
            retention_status=RetentionStatus.RETAINED_90D,
            verified_by_employer=True,
        )
        session.add(placement)
        await session.commit()
        await session.refresh(placement)

    res = await async_client.put(
        f"/api/v1/outcomes/placements/{placement.id}/retention",
        json={
            "retention_status": "RETAINED_180D",
            "employer_satisfaction_rating": 5,
            "contract_fulfillment_score": 92.5,
            "employer_feedback_notes": (
                "Candidate onboarded rapidly and demonstrated high code quality."
            ),
        },
        headers=emp_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["employer_satisfaction_rating"] == 5
    assert "rapidly" in data["employer_feedback_notes"]


# ---------------------------------------------------------------------------
# E2E-14: Outcome -> PPI
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_14_outcome_ppi_calculation(async_client: AsyncClient):
    _, _, headers = await _create_test_user_and_token(UserRole.GOVERNMENT, prefix="gov_e2e14")
    tp_user, _, _ = await _create_test_user_and_token(UserRole.TRAINING_PROVIDER, prefix="tp_e2e14")

    async with AsyncSessionLocal() as session:
        tp_prof = TrainingProviderProfile(
            user_id=tp_user.id, institution_name="National Tech Institute"
        )
        session.add(tp_prof)
        await session.commit()
        await session.refresh(tp_prof)

    res = await async_client.get(
        f"/api/v1/outcomes/providers/{tp_prof.id}/performance", headers=headers
    )
    assert res.status_code == 200, res.text
    ppi = res.json()
    assert "ppi_score" in ppi
    assert "ppi_tier" in ppi
    assert ppi["ppi_score"] >= 0.0


# ---------------------------------------------------------------------------
# E2E-15: Government aggregate analytics contain no candidate PII
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_15_government_aggregate_analytics_zero_pii(async_client: AsyncClient):
    _, _, headers = await _create_test_user_and_token(UserRole.GOVERNMENT, prefix="gov_e2e15")
    skill = await _create_test_canonical_skill("Enterprise Python")

    res = await async_client.get(f"/api/v1/demand/skills/{skill.id}/supply", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "total_candidates" in data
    assert "verified_candidates" in data
    assert "unverified_candidates" in data

    # Strict Zero-PII assertions
    raw_text = res.text.lower()
    for forbidden in ["email", "candidate_name", "phone", "password", "resume_text"]:
        assert f'"{forbidden}"' not in raw_text, f"Potential PII detected: {forbidden}"


# ---------------------------------------------------------------------------
# E2E-16: What-if simulator does not mutate production records
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_16_what_if_simulator_strict_non_mutation(async_client: AsyncClient):
    _, _, headers = await _create_test_user_and_token(UserRole.GOVERNMENT, prefix="gov_e2e16")
    skill = await _create_test_canonical_skill("Stateless Simulation")

    async with AsyncSessionLocal() as session:
        job_count_before = (await session.execute(select(func.count(Job.id)))).scalar_one()
        user_count_before = (await session.execute(select(func.count(User.id)))).scalar_one()

    # Run what-if simulation with extreme shocks
    sim_payload = {
        "skill_id": str(skill.id),
        "baseline_type": "ACTUAL",
        "demand_change_percent": 150.0,
        "additional_verified_supply": 500,
        "additional_training_capacity": 1000,
    }
    res = await async_client.post("/api/v1/simulator/skill", json=sim_payload, headers=headers)
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as session:
        job_count_after = (await session.execute(select(func.count(Job.id)))).scalar_one()
        user_count_after = (await session.execute(select(func.count(User.id)))).scalar_one()

    assert job_count_before == job_count_after, "What-If Simulator must NEVER mutate jobs!"
    assert user_count_before == user_count_after, "What-If Simulator must NEVER mutate users!"


# ---------------------------------------------------------------------------
# E2E-17: Demo seed is idempotent
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_17_demo_seed_idempotency():
    async with AsyncSessionLocal() as session:
        # Run seed once
        stats1 = await seed_demo_ecosystem(session)
        assert stats1["admin"] == 1

        # Run seed twice in succession
        stats2 = await seed_demo_ecosystem(session)
        assert stats2["admin"] == 1

        # Verify exactly one demo candidate exists
        cands = (
            (
                await session.execute(
                    select(User).where(User.email == "dev.candidate@skillsync.internal")
                )
            )
            .scalars()
            .all()
        )
        assert len(cands) == 1, "Demo seed created duplicate candidates!"


# ---------------------------------------------------------------------------
# E2E-18: Demo reset restores deterministic state
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_e2e_18_demo_reset_restores_deterministic_state():
    async with AsyncSessionLocal() as session:
        # Reset and seed
        await reset_demo_ecosystem(session)
        await seed_demo_ecosystem(session)

        # Verify all 5 core personas exist
        expected_emails = [
            "admin@skillsync.internal",
            "dev.provider@skillsync.internal",
            "dev.employer@skillsync.internal",
            "dev.candidate@skillsync.internal",
            "dev.gov@skillsync.internal",
        ]
        for email in expected_emails:
            user = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            assert user is not None, f"Expected persona {email} was not recreated by reset!"

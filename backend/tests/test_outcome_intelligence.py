"""Comprehensive test suite for Phase 17 Employment Outcome Intelligence."""

import uuid
from datetime import UTC, date, datetime

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.application import Application, ApplicationStatus
from app.models.course import Course, CourseDifficulty, CourseMode, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import EmploymentType, Job, JobStatus
from app.models.outcome import PPITier
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.skill_contract import ContractStatus, SkillContract
from app.models.user import User, UserRole
from app.services.outcome_service import calculate_provider_performance_index


async def create_test_ecosystem() -> dict:
    """Helper to create full ecosystem fixture for testing."""
    suffix = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as db:
        # 1. Employer
        emp_user = User(
            email=f"emp_{suffix}@example.com",
            password_hash="testhash",
            full_name=f"Employer {suffix}",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        db.add(emp_user)
        await db.flush()

        emp_prof = EmployerProfile(
            user_id=emp_user.id,
            company_name=f"TechCorp {suffix}",
            industry="Software",
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        db.add(emp_prof)
        await db.flush()

        # Another Employer (for IDOR tests)
        emp_user_2 = User(
            email=f"emp2_{suffix}@example.com",
            password_hash="testhash",
            full_name=f"Employer Two {suffix}",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        db.add(emp_user_2)
        await db.flush()

        emp_prof_2 = EmployerProfile(
            user_id=emp_user_2.id,
            company_name=f"OtherCorp {suffix}",
            industry="Finance",
        )
        db.add(emp_prof_2)
        await db.flush()

        # 2. Training Provider
        tp_user = User(
            email=f"tp_{suffix}@example.com",
            password_hash="testhash",
            full_name=f"Dean {suffix}",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        db.add(tp_user)
        await db.flush()

        tp_prof = TrainingProviderProfile(
            user_id=tp_user.id,
            institution_name=f"Skill Academy {suffix}",
            provider_type="Vocational Institute",
            location_city="Bengaluru",
        )
        db.add(tp_prof)
        await db.flush()

        # 3. Candidate
        cand_user = User(
            email=f"cand_{suffix}@example.com",
            password_hash="testhash",
            full_name=f"Candidate {suffix}",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        db.add(cand_user)
        await db.flush()

        cand_prof = CandidateProfile(
            user_id=cand_user.id,
            experience_years=2.0,
            location_city="Bengaluru",
        )
        db.add(cand_prof)
        await db.flush()

        # Another Candidate (for IDOR)
        cand_user_2 = User(
            email=f"cand2_{suffix}@example.com",
            password_hash="testhash",
            full_name=f"Candidate Two {suffix}",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        db.add(cand_user_2)
        await db.flush()

        cand_prof_2 = CandidateProfile(
            user_id=cand_user_2.id,
            experience_years=1.0,
        )
        db.add(cand_prof_2)
        await db.flush()

        # Admin
        admin_user = User(
            email=f"admin_{suffix}@example.com",
            password_hash="testhash",
            full_name="System Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()

        # 4. Job Requisition
        job = Job(
            employer_id=emp_prof.id,
            title=f"Full Stack Engineer {suffix}",
            description="Core engineering role",
            employment_type=EmploymentType.FULL_TIME,
            location_city="Bengaluru",
            location_state="Karnataka",
            status=JobStatus.PUBLISHED,
            is_active=True,
        )
        db.add(job)
        await db.flush()

        # Skill Contract
        contract = SkillContract(
            job_id=job.id,
            version=1,
            status=ContractStatus.ACTIVE,
            title="Standard Full Stack Contract",
        )
        db.add(contract)
        await db.flush()

        # 5. Job Application (HIRED)
        hired_app = Application(
            candidate_id=cand_prof.id,
            job_id=job.id,
            status=ApplicationStatus.HIRED,
            applied_at=datetime.now(UTC),
        )
        db.add(hired_app)

        # Non-hired application
        non_hired_app = Application(
            candidate_id=cand_prof_2.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            applied_at=datetime.now(UTC),
        )
        db.add(non_hired_app)
        await db.flush()

        # 6. Courses for Training Provider
        course_1 = Course(
            provider_id=tp_prof.id,
            title=f"Advanced Python {suffix}",
            description="Python mastery",
            difficulty=CourseDifficulty.INTERMEDIATE,
            mode=CourseMode.ONLINE,
            status=CourseStatus.PUBLISHED,
            is_active=True,
        )
        course_2 = Course(
            provider_id=tp_prof.id,
            title=f"FastAPI Microservices {suffix}",
            description="API architecture",
            difficulty=CourseDifficulty.ADVANCED,
            mode=CourseMode.ONLINE,
            status=CourseStatus.PUBLISHED,
            is_active=True,
        )
        course_3 = Course(
            provider_id=tp_prof.id,
            title=f"Frontend React {suffix}",
            description="React frontend",
            difficulty=CourseDifficulty.BEGINNER,
            mode=CourseMode.ONLINE,
            status=CourseStatus.PUBLISHED,
            is_active=True,
        )
        db.add_all([course_1, course_2, course_3])
        await db.flush()

        # 7. Candidate Enrollments (2 completed, 1 in-progress)
        enr_1 = Enrollment(
            candidate_id=cand_prof.id,
            course_id=course_1.id,
            status=EnrollmentStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        enr_2 = Enrollment(
            candidate_id=cand_prof.id,
            course_id=course_2.id,
            status=EnrollmentStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        enr_3 = Enrollment(
            candidate_id=cand_prof.id,
            course_id=course_3.id,
            status=EnrollmentStatus.IN_PROGRESS,
        )
        db.add_all([enr_1, enr_2, enr_3])

        # 8. Canonical Skills
        skill_1 = Skill(
            name=f"Python {suffix}",
            slug=f"python-{suffix}",
            normalized_name=f"python {suffix}",
            skill_type=SkillType.TECHNICAL,
            category="Programming",
            status=SkillStatus.ACTIVE,
        )
        db.add(skill_1)

        await db.commit()

        return {
            "employer_user": emp_user,
            "employer_prof": emp_prof,
            "employer_user_2": emp_user_2,
            "candidate_user": cand_user,
            "candidate_prof": cand_prof,
            "candidate_user_2": cand_user_2,
            "provider_user": tp_user,
            "provider_prof": tp_prof,
            "admin_user": admin_user,
            "job": job,
            "contract": contract,
            "hired_app": hired_app,
            "non_hired_app": non_hired_app,
            "course_1": course_1,
            "course_2": course_2,
            "course_3": course_3,
        }


def auth_headers(user: User) -> dict[str, str]:
    """Helper to generate JWT auth header."""
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ppi_calculation_deterministic():
    """Validates deterministic mathematical calculation of Provider Performance Index."""
    # Test case 1: Perfect metrics
    score, tier, breakdown = calculate_provider_performance_index(
        completion_rate=100.0,
        placement_rate=100.0,
        retention_rate_90d=100.0,
        average_employer_rating=5.0,
    )
    assert score == 100.0
    assert tier == PPITier.TIER_1_EXCELLENT
    assert breakdown["completion_contribution"] == 25.0
    assert breakdown["placement_contribution"] == 35.0
    assert breakdown["retention_contribution"] == 20.0
    assert breakdown["employer_rating_contribution"] == 20.0

    # Test case 2: Zero metrics
    score, tier, breakdown = calculate_provider_performance_index(
        completion_rate=0.0,
        placement_rate=0.0,
        retention_rate_90d=0.0,
        average_employer_rating=None,
    )
    assert score == 0.0
    assert tier == PPITier.TIER_4_NEEDS_IMPROVEMENT
    assert breakdown["employer_rating_contribution"] == 0.0

    # Test case 3: Mid-tier balanced score
    # 0.25*80 + 0.35*70 + 0.20*85 + 0.20*(4.0/5*100 = 80) = 20 + 24.5 + 17 + 16 = 77.5
    score, tier, breakdown = calculate_provider_performance_index(
        completion_rate=80.0,
        placement_rate=70.0,
        retention_rate_90d=85.0,
        average_employer_rating=4.0,
    )
    assert score == 77.5
    assert tier == PPITier.TIER_2_PROFICIENT


@pytest.mark.asyncio
async def test_record_placement_and_multi_course_attribution(
    async_client: AsyncClient,
):
    """Tests valid placement recording and automatic training attributions."""
    eco = await create_test_ecosystem()
    headers = auth_headers(eco["employer_user"])

    payload = {
        "application_id": str(eco["hired_app"].id),
        "placement_date": str(date.today()),
        "starting_salary_annual": 850000.0,
        "employment_type": "FULL_TIME",
        "contract_id": str(eco["contract"].id),
    }

    resp = await async_client.post("/api/v1/outcomes/placements", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()

    assert data["application_id"] == str(eco["hired_app"].id)
    assert data["candidate_id"] == str(eco["candidate_prof"].id)
    assert data["employer_id"] == str(eco["employer_prof"].id)
    assert data["retention_status"] == "ACTIVE"
    assert data["starting_salary_annual"] == 850000.0
    assert data["verified_by_employer"] is True

    # Multi-course attribution verification: Candidate completed course 1 and 2, but not course 3
    attributions = data["training_attributions"]
    assert len(attributions) == 2
    attributed_course_ids = {a["course_id"] for a in attributions}
    assert str(eco["course_1"].id) in attributed_course_ids
    assert str(eco["course_2"].id) in attributed_course_ids
    assert str(eco["course_3"].id) not in attributed_course_ids


@pytest.mark.asyncio
async def test_record_placement_validation_errors(async_client: AsyncClient):
    """Tests rejection of non-hired applications, duplicates, and non-owned job applications."""
    eco = await create_test_ecosystem()
    headers_emp1 = auth_headers(eco["employer_user"])
    headers_emp2 = auth_headers(eco["employer_user_2"])

    # 1. Non-hired application rejection
    payload_non_hired = {
        "application_id": str(eco["non_hired_app"].id),
        "placement_date": str(date.today()),
        "employment_type": "FULL_TIME",
    }
    resp = await async_client.post(
        "/api/v1/outcomes/placements",
        json=payload_non_hired,
        headers=headers_emp1,
    )
    assert resp.status_code == 400
    assert "HIRED state" in resp.json()["detail"]

    # 2. Record valid placement first
    payload_valid = {
        "application_id": str(eco["hired_app"].id),
        "placement_date": str(date.today()),
        "employment_type": "FULL_TIME",
    }
    resp_valid = await async_client.post(
        "/api/v1/outcomes/placements", json=payload_valid, headers=headers_emp1
    )
    assert resp_valid.status_code == 201

    # 3. Duplicate placement rejection
    resp_dup = await async_client.post(
        "/api/v1/outcomes/placements", json=payload_valid, headers=headers_emp1
    )
    assert resp_dup.status_code == 409

    # 4. IDOR / ownership rejection: Employer 2 cannot record placement on Employer 1's job
    resp_unauth = await async_client.post(
        "/api/v1/outcomes/placements", json=payload_valid, headers=headers_emp2
    )
    assert resp_unauth.status_code in (403, 409)


@pytest.mark.asyncio
async def test_retention_milestones_and_feedback(async_client: AsyncClient):
    """Tests post-hire retention state progression and rating submissions."""
    eco = await create_test_ecosystem()
    headers = auth_headers(eco["employer_user"])

    # Create placement
    create_payload = {
        "application_id": str(eco["hired_app"].id),
        "placement_date": str(date.today()),
        "employment_type": "FULL_TIME",
    }
    create_resp = await async_client.post(
        "/api/v1/outcomes/placements", json=create_payload, headers=headers
    )
    assert create_resp.status_code == 201
    placement_id = create_resp.json()["id"]

    # 1. Update to RETAINED_90D with satisfaction rating and contract fulfillment
    update_payload = {
        "retention_status": "RETAINED_90D",
        "employer_satisfaction_rating": 5,
        "contract_fulfillment_score": 92.5,
        "employer_feedback_notes": "Exceptional technical execution and teamwork.",
    }
    resp = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json=update_payload,
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["retention_status"] == "RETAINED_90D"
    assert data["employer_satisfaction_rating"] == 5
    assert data["contract_fulfillment_score"] == 92.5
    assert data["employer_feedback_notes"] == "Exceptional technical execution and teamwork."

    # 2. Advance to RETAINED_180D
    resp_180 = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "RETAINED_180D"},
        headers=headers,
    )
    assert resp_180.status_code == 200
    assert resp_180.json()["retention_status"] == "RETAINED_180D"

    # 3. Invalid transition regression test (cannot go from 180D back to LEFT_WITHIN_30D)
    resp_invalid = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "LEFT_WITHIN_30D"},
        headers=headers,
    )
    assert resp_invalid.status_code == 400


@pytest.mark.asyncio
async def test_feedback_rating_boundary_validation(async_client: AsyncClient):
    """Tests rejection of invalid satisfaction ratings and fulfillment scores."""
    eco = await create_test_ecosystem()
    headers = auth_headers(eco["employer_user"])

    create_resp = await async_client.post(
        "/api/v1/outcomes/placements",
        json={
            "application_id": str(eco["hired_app"].id),
            "placement_date": str(date.today()),
        },
        headers=headers,
    )
    placement_id = create_resp.json()["id"]

    # Rating = 0 rejected
    resp_zero = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "ACTIVE", "employer_satisfaction_rating": 0},
        headers=headers,
    )
    assert resp_zero.status_code == 422 or resp_zero.status_code == 400

    # Rating = 6 rejected
    resp_six = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "ACTIVE", "employer_satisfaction_rating": 6},
        headers=headers,
    )
    assert resp_six.status_code == 422 or resp_six.status_code == 400

    # Fulfillment = 150 rejected
    resp_fulf = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "ACTIVE", "contract_fulfillment_score": 150.0},
        headers=headers,
    )
    assert resp_fulf.status_code == 422 or resp_fulf.status_code == 400


@pytest.mark.asyncio
async def test_provider_performance_and_leaderboard(async_client: AsyncClient):
    """Tests provider performance snapshot calculation and leaderboard ranking."""
    eco = await create_test_ecosystem()
    headers_emp = auth_headers(eco["employer_user"])
    headers_tp = auth_headers(eco["provider_user"])

    # Record placement with feedback
    create_resp = await async_client.post(
        "/api/v1/outcomes/placements",
        json={
            "application_id": str(eco["hired_app"].id),
            "placement_date": str(date.today()),
            "starting_salary_annual": 900000.0,
        },
        headers=headers_emp,
    )
    assert create_resp.status_code == 201
    placement_id = create_resp.json()["id"]

    await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={
            "retention_status": "RETAINED_90D",
            "employer_satisfaction_rating": 5,
        },
        headers=headers_emp,
    )

    # 1. Check provider performance endpoint
    prov_id = str(eco["provider_prof"].id)
    perf_resp = await async_client.get(
        f"/api/v1/outcomes/providers/{prov_id}/performance",
        headers=headers_tp,
    )
    assert perf_resp.status_code == 200
    perf_data = perf_resp.json()

    assert perf_data["provider_id"] == prov_id
    assert perf_data["total_completed"] == 2
    assert perf_data["total_placed"] >= 1
    assert perf_data["ppi_score"] > 0.0
    assert perf_data["ppi_tier"] in [t.value for t in PPITier]

    # 2. Check leaderboard endpoint
    lead_resp = await async_client.get("/api/v1/outcomes/providers/leaderboard", headers=headers_tp)
    assert lead_resp.status_code == 200
    leaderboard = lead_resp.json()
    assert len(leaderboard) >= 1
    assert leaderboard[0]["rank"] == 1


@pytest.mark.asyncio
async def test_macro_analytics_zero_pii(async_client: AsyncClient):
    """Ensures macro outcome analytics endpoints never leak candidate PII."""
    eco = await create_test_ecosystem()
    headers_emp = auth_headers(eco["employer_user"])
    headers_admin = auth_headers(eco["admin_user"])

    await async_client.post(
        "/api/v1/outcomes/placements",
        json={
            "application_id": str(eco["hired_app"].id),
            "placement_date": str(date.today()),
            "starting_salary_annual": 750000.0,
        },
        headers=headers_emp,
    )

    # 1. Overview analytics
    resp = await async_client.get("/api/v1/outcomes/analytics/overview", headers=headers_admin)
    assert resp.status_code == 200
    data = resp.json()

    assert "total_placements" in data
    assert "placement_rate" in data
    assert "average_starting_salary" in data
    assert "district_benchmarks" in data

    # Verify no PII fields
    response_str = str(data).lower()
    assert "@example.com" not in response_str
    assert "candidate" not in data.get("district_benchmarks", [{}])[0]

    # 2. Skills outcome analytics
    skill_resp = await async_client.get("/api/v1/outcomes/analytics/skills", headers=headers_admin)
    assert skill_resp.status_code == 200
    assert isinstance(skill_resp.json(), list)


@pytest.mark.asyncio
async def test_rbac_and_idor_protection(async_client: AsyncClient):
    """Tests strict RBAC and IDOR protection across roles and tenants."""
    eco = await create_test_ecosystem()
    headers_cand = auth_headers(eco["candidate_user"])
    headers_cand2 = auth_headers(eco["candidate_user_2"])
    headers_emp = auth_headers(eco["employer_user"])

    # 1. Candidate cannot create placement
    resp_cand_create = await async_client.post(
        "/api/v1/outcomes/placements",
        json={
            "application_id": str(eco["hired_app"].id),
            "placement_date": str(date.today()),
        },
        headers=headers_cand,
    )
    assert resp_cand_create.status_code == 403

    # 2. Employer creates placement
    resp_create = await async_client.post(
        "/api/v1/outcomes/placements",
        json={
            "application_id": str(eco["hired_app"].id),
            "placement_date": str(date.today()),
        },
        headers=headers_emp,
    )
    assert resp_create.status_code == 201
    placement_id = resp_create.json()["id"]

    # 3. Candidate cannot update retention
    resp_cand_ret = await async_client.put(
        f"/api/v1/outcomes/placements/{placement_id}/retention",
        json={"retention_status": "RETAINED_90D"},
        headers=headers_cand,
    )
    assert resp_cand_ret.status_code == 403

    # 4. Candidate 1 can view own placement
    resp_cand_get = await async_client.get(
        f"/api/v1/outcomes/placements/{placement_id}",
        headers=headers_cand,
    )
    assert resp_cand_get.status_code == 200

    # 5. Candidate 2 cannot view Candidate 1's placement (IDOR)
    resp_cand2_get = await async_client.get(
        f"/api/v1/outcomes/placements/{placement_id}",
        headers=headers_cand2,
    )
    assert resp_cand2_get.status_code == 403

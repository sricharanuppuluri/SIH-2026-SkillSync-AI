"""Phase 15: What-If Skill Demand Simulator Test Suite.

Comprehensive tests covering:
  - Unit calculations & shortage classifications
  - Scenario validations (bounds, horizons, baseline types)
  - Deterministic explainability
  - Actual vs Forecast baseline simulations (1-12 months)
  - Single-skill and multi-skill batch simulation endpoints
  - RBAC across all 5 user roles
  - Zero PII exposure
  - Strict non-mutation verification (platform data remains unchanged)
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.course import Course, CourseDifficulty, CourseMode, CourseSkill, CourseStatus
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill, JobStatus
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill, SkillRelationship, SkillRelationshipType, SkillStatus, SkillType
from app.models.user import User, UserRole
from app.models.verified_skill import (
    VerificationMethod,
    VerificationStatus,
    VerifiedSkill,
)
from app.schemas.demand import SkillShortageStatus
from app.schemas.simulator import SimulatorBaselineType, SkillScenarioInput
from app.services.what_if_simulator_service import (
    _classify_shortage,
)

API = "/api/v1/simulator"


# ---------------------------------------------------------------------------
# Helpers & Fixtures
# ---------------------------------------------------------------------------


async def _make_user(role: UserRole, **kwargs) -> tuple[User, str]:
    """Create any user role and return (user, token)."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=f"{role.value.lower()}_{uuid.uuid4().hex[:6]}@test.com",
            password_hash=get_password_hash("Pass1234!"),
            full_name=kwargs.pop("full_name", f"Test {role.value}"),
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        if role == UserRole.CANDIDATE:
            profile = CandidateProfile(
                user_id=user.id,
                headline="Tester",
                experience_years=2.0,
                location_city=kwargs.get("city", "Bengaluru"),
                location_state=kwargs.get("state", "Karnataka"),
            )
            session.add(profile)
        elif role == UserRole.EMPLOYER:
            profile = EmployerProfile(
                user_id=user.id,
                company_name=kwargs.get("company", "Tech Simulator Inc"),
                industry=kwargs.get("industry", "Technology"),
            )
            session.add(profile)
            await session.flush()
        elif role == UserRole.TRAINING_PROVIDER:
            profile = TrainingProviderProfile(
                user_id=user.id,
                institution_name=kwargs.get("institution", "Sim Academy"),
            )
            session.add(profile)
            await session.flush()
        elif role == UserRole.GOVERNMENT:
            profile = GovernmentProfile(
                user_id=user.id,
                department_name=kwargs.get("dept", "National Skills Council"),
            )
            session.add(profile)

        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


async def _seed_simulator_ecosystem():
    """Seed canonical skills, jobs, verified candidates, and training courses."""
    async with AsyncSessionLocal() as session:
        # 1. Employer & Provider & Candidate
        emp_user, _ = await _make_user(UserRole.EMPLOYER, company="SimCorp")
        prov_user, _ = await _make_user(UserRole.TRAINING_PROVIDER, institution="SimEdu")
        cand1, _ = await _make_user(UserRole.CANDIDATE, full_name="Candidate One")
        cand2, _ = await _make_user(UserRole.CANDIDATE, full_name="Candidate Two")

        emp_prof_res = await session.execute(
            select(EmployerProfile).where(EmployerProfile.user_id == emp_user.id)
        )
        emp_prof = emp_prof_res.scalar_one()

        prov_prof_res = await session.execute(
            select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == prov_user.id)
        )
        prov_prof = prov_prof_res.scalar_one()

        cand_prof_res = await session.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == cand1.id)
        )
        cand_prof1 = cand_prof_res.scalar_one()

        # 2. Canonical Skills
        tag = uuid.uuid4().hex[:6]
        skill_python = Skill(
            name=f"Python-Sim-{tag}",
            normalized_name=f"python-sim-{tag}",
            category="Programming",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        skill_fastapi = Skill(
            name=f"FastAPI-Sim-{tag}",
            normalized_name=f"fastapi-sim-{tag}",
            category="Frameworks",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        skill_rare = Skill(
            name=f"Quantum-Sim-{tag}",
            normalized_name=f"quantum-sim-{tag}",
            category="Science",
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        session.add_all([skill_python, skill_fastapi, skill_rare])
        await session.flush()

        # Skill Relationship
        rel = SkillRelationship(
            source_skill_id=skill_python.id,
            target_skill_id=skill_fastapi.id,
            relationship_type=SkillRelationshipType.COMPLEMENTARY,
        )
        session.add(rel)

        # 3. Jobs for Python (4 jobs -> demand=4)
        for i in range(4):
            job = Job(
                employer_id=emp_prof.id,
                title=f"Python Engineer {i}",
                description="Python coding required",
                employment_type=EmploymentType.FULL_TIME,
                experience_level=ExperienceLevel.MID,
                status=JobStatus.PUBLISHED,
                is_active=True,
            )
            session.add(job)
            await session.flush()
            session.add(JobSkill(job_id=job.id, skill_id=skill_python.id, is_required=True))

        # 4. Verified candidates for Python (1 candidate -> supply=1)
        vskill = VerifiedSkill(
            candidate_id=cand_prof1.id,
            skill_id=skill_python.id,
            verification_status=VerificationStatus.VERIFIED,
            verification_method=VerificationMethod.ASSESSMENT,
            verification_summary="Verified via technical assessment with high score.",
        )
        session.add(vskill)

        # 5. Course for Python (Capacity=50)
        course = Course(
            provider_id=prov_prof.id,
            title="Mastering Python",
            description="Deep dive Python",
            capacity=50,
            status=CourseStatus.PUBLISHED,
            is_active=True,
            difficulty=CourseDifficulty.INTERMEDIATE,
            mode=CourseMode.ONLINE,
        )
        session.add(course)
        await session.flush()
        session.add(CourseSkill(course_id=course.id, skill_id=skill_python.id))

        await session.commit()

        return {
            "skill_python": skill_python,
            "skill_fastapi": skill_fastapi,
            "skill_rare": skill_rare,
            "employer": emp_user,
            "provider": prov_user,
            "candidate": cand1,
        }


# ---------------------------------------------------------------------------
# Unit Tests
# ---------------------------------------------------------------------------


def test_classify_shortage_unit():
    """Verify deterministic shortage classification math."""
    # High shortage: ratio >= 3.0
    ratio, cat = _classify_shortage(10, 2)
    assert ratio == 5.0
    assert cat == SkillShortageStatus.HIGH_SHORTAGE

    # Zero supply with high demand >= 3
    ratio, cat = _classify_shortage(3, 0)
    assert cat == SkillShortageStatus.HIGH_SHORTAGE

    # Moderate shortage: 1.5 <= ratio < 3.0
    ratio, cat = _classify_shortage(4, 2)
    assert ratio == 2.0
    assert cat == SkillShortageStatus.MODERATE_SHORTAGE

    # Balanced: 0.7 <= ratio < 1.5
    ratio, cat = _classify_shortage(10, 10)
    assert ratio == 1.0
    assert cat == SkillShortageStatus.BALANCED

    # Surplus: ratio < 0.7
    ratio, cat = _classify_shortage(2, 10)
    assert ratio == 0.2
    assert cat == SkillShortageStatus.SURPLUS

    # Both zero -> balanced
    ratio, cat = _classify_shortage(0, 0)
    assert ratio == 0.0
    assert cat == SkillShortageStatus.BALANCED


def test_scenario_input_validation():
    """Verify Pydantic bounds and validation rules."""
    valid_id = uuid.uuid4()

    # Valid scenario
    valid = SkillScenarioInput(
        skill_id=valid_id,
        baseline_type=SimulatorBaselineType.ACTUAL,
        demand_change_percent=25.0,
        additional_verified_supply=10,
        additional_training_capacity=50,
    )
    assert valid.demand_change_percent == 25.0

    # Demand change percent < -100 is rejected
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, demand_change_percent=-105.0)

    # Demand change percent > 500 is rejected
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, demand_change_percent=600.0)

    # Negative supply addition rejected
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, additional_verified_supply=-5)

    # Negative training capacity addition rejected
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, additional_training_capacity=-10)

    # Horizon outside 1-12 rejected
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, forecast_horizon=0)
    with pytest.raises(Exception):
        SkillScenarioInput(skill_id=valid_id, forecast_horizon=13)


# ---------------------------------------------------------------------------
# API Tests — Single Skill Simulation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_simulate_single_skill_actual_demand_surge(async_client: AsyncClient):
    """Test actual baseline simulation with +50% demand change."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.GOVERNMENT)

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "baseline_type": "ACTUAL",
            "demand_change_percent": 50.0,
            "additional_verified_supply": 0,
            "additional_training_capacity": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["skill_name"] == eco["skill_python"].name
    assert data["baseline"]["demand"] == 4
    assert data["baseline"]["verified_supply"] == 1
    assert data["baseline"]["training_capacity"] == 50
    assert data["baseline"]["shortage_category"] == "HIGH_SHORTAGE"

    # +50% of 4 is 6
    assert data["projected"]["demand"] == 6
    assert data["projected"]["verified_supply"] == 1
    assert data["projected"]["training_capacity"] == 50
    assert data["impact"]["demand_change"] == 2
    assert data["impact"]["demand_change_percent"] == 50.0
    assert "Demand increases by 50.0%" in data["explanation"]


@pytest.mark.asyncio
async def test_simulate_single_skill_supply_intervention(async_client: AsyncClient):
    """Test actual baseline simulation adding +10 verified candidates to alleviate shortage."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.EMPLOYER)

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "baseline_type": "ACTUAL",
            "demand_change_percent": 0.0,
            "additional_verified_supply": 9,
            "additional_training_capacity": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Baseline supply=1 (ratio 4.0 -> HIGH_SHORTAGE)
    # Projected supply=10 (ratio 4/10 = 0.4 -> SURPLUS)
    assert data["baseline"]["verified_supply"] == 1
    assert data["baseline"]["shortage_category"] == "HIGH_SHORTAGE"
    assert data["projected"]["verified_supply"] == 10
    assert data["projected"]["shortage_ratio"] == 0.4
    assert data["projected"]["shortage_category"] == "SURPLUS"
    assert data["impact"]["category_changed"] is True
    assert data["impact"]["previous_category"] == "HIGH_SHORTAGE"
    assert data["impact"]["new_category"] == "SURPLUS"


@pytest.mark.asyncio
async def test_simulate_single_skill_training_capacity(async_client: AsyncClient):
    """Test training capacity expansion simulation."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.TRAINING_PROVIDER)

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "baseline_type": "ACTUAL",
            "demand_change_percent": 0.0,
            "additional_verified_supply": 0,
            "additional_training_capacity": 100,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["baseline"]["training_capacity"] == 50
    assert data["projected"]["training_capacity"] == 150
    assert data["impact"]["training_capacity_change"] == 100
    assert "Adding 100 training seats increases course capacity" in data["explanation"]
    assert (
        "does not directly convert 1:1 into immediate verified candidate supply"
        in data["explanation"]
    )


@pytest.mark.asyncio
async def test_simulate_single_skill_forecast_baseline(async_client: AsyncClient):
    """Test simulation using Phase 14 forecast baseline."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.ADMIN)

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "baseline_type": "FORECAST",
            "forecast_horizon": 6,
            "demand_change_percent": 20.0,
            "additional_verified_supply": 5,
            "additional_training_capacity": 20,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["baseline"]["baseline_type"] == "FORECAST"
    assert data["baseline"]["forecast_horizon"] == 6
    assert data["projected"]["demand"] >= 0
    assert data["projected"]["verified_supply"] == 6  # 1 + 5
    assert data["projected"]["training_capacity"] == 70  # 50 + 20
    assert "Phase 14 forecast baseline (6M horizon)" in data["explanation"]


@pytest.mark.asyncio
async def test_simulate_single_skill_edge_cases(async_client: AsyncClient):
    """Test edge cases: -100% demand reduction and rare skill with 0 baseline demand."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.CANDIDATE)

    # 1. -100% demand reduction
    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "baseline_type": "ACTUAL",
            "demand_change_percent": -100.0,
            "additional_verified_supply": 0,
            "additional_training_capacity": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["projected"]["demand"] == 0
    assert data["projected"]["shortage_ratio"] == 0.0
    assert data["projected"]["shortage_category"] == "SURPLUS"

    # 2. Skill with 0 baseline demand
    resp_rare = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_rare"].id),
            "baseline_type": "ACTUAL",
            "demand_change_percent": 50.0,
            "additional_verified_supply": 2,
            "additional_training_capacity": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_rare.status_code == 200
    data_rare = resp_rare.json()
    assert data_rare["baseline"]["demand"] == 0
    assert data_rare["projected"]["demand"] == 0
    assert data_rare["projected"]["verified_supply"] == 2


@pytest.mark.asyncio
async def test_simulate_single_skill_not_found(async_client: AsyncClient):
    """Test 404 response for non-existent skill ID."""
    _, token = await _make_user(UserRole.ADMIN)
    fake_id = str(uuid.uuid4())

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": fake_id,
            "baseline_type": "ACTUAL",
            "demand_change_percent": 10.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# API Tests — Multi-Skill Batch Simulation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_simulate_multi_skill_batch(async_client: AsyncClient):
    """Test batch scenario simulation for multiple canonical skills."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.GOVERNMENT)

    resp = await async_client.post(
        f"{API}/scenario",
        json={
            "skills": [
                {
                    "skill_id": str(eco["skill_python"].id),
                    "baseline_type": "ACTUAL",
                    "demand_change_percent": 20.0,
                    "additional_verified_supply": 10,
                    "additional_training_capacity": 50,
                },
                {
                    "skill_id": str(eco["skill_fastapi"].id),
                    "baseline_type": "ACTUAL",
                    "demand_change_percent": -10.0,
                    "additional_verified_supply": 2,
                    "additional_training_capacity": 10,
                },
            ]
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_skills"] == 2
    assert len(data["results"]) == 2
    assert data["categories_improved_count"] >= 1


@pytest.mark.asyncio
async def test_simulate_multi_skill_batch_invalid_id(async_client: AsyncClient):
    """Test batch simulation with an invalid skill ID in the list."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.EMPLOYER)

    resp = await async_client.post(
        f"{API}/scenario",
        json={
            "skills": [
                {
                    "skill_id": str(eco["skill_python"].id),
                    "demand_change_percent": 10.0,
                },
                {
                    "skill_id": str(uuid.uuid4()),
                    "demand_change_percent": 10.0,
                },
            ]
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Security & RBAC & PII Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_simulator_unauthenticated_rejected(async_client: AsyncClient):
    """Ensure unauthenticated simulation requests are rejected with 401."""
    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(uuid.uuid4()),
            "demand_change_percent": 10.0,
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_simulator_rbac_all_roles(async_client: AsyncClient):
    """Ensure all 5 platform roles can execute simulations."""
    eco = await _seed_simulator_ecosystem()

    roles = [
        UserRole.CANDIDATE,
        UserRole.EMPLOYER,
        UserRole.TRAINING_PROVIDER,
        UserRole.GOVERNMENT,
        UserRole.ADMIN,
    ]

    for role in roles:
        _, token = await _make_user(role)
        resp = await async_client.post(
            f"{API}/skill",
            json={
                "skill_id": str(eco["skill_python"].id),
                "demand_change_percent": 10.0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Failed for role {role}"


@pytest.mark.asyncio
async def test_simulator_zero_pii_exposed(async_client: AsyncClient):
    """Ensure simulation payloads return aggregate data only without any PII."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.GOVERNMENT)

    resp = await async_client.post(
        f"{API}/skill",
        json={
            "skill_id": str(eco["skill_python"].id),
            "demand_change_percent": 20.0,
            "additional_verified_supply": 5,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    text_content = resp.text

    # Forbidden PII keys
    forbidden_terms = [
        "Candidate One",
        "Candidate Two",
        "email",
        "phone",
        "password",
        "resume",
        "SimCorp",
    ]
    for term in forbidden_terms:
        assert term not in text_content, f"PII term '{term}' detected in simulator response"


# ---------------------------------------------------------------------------
# Strict Non-Mutation Verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_simulator_strict_non_mutation(async_client: AsyncClient):
    """Verify that running simulations causes zero database mutations."""
    eco = await _seed_simulator_ecosystem()
    _, token = await _make_user(UserRole.ADMIN)

    async with AsyncSessionLocal() as session:
        jobs_count_before = (await session.scalar(select(func.count(Job.id)))) or 0
        skills_count_before = (await session.scalar(select(func.count(Skill.id)))) or 0
        verified_count_before = (await session.scalar(select(func.count(VerifiedSkill.id)))) or 0
        courses_count_before = (await session.scalar(select(func.count(Course.id)))) or 0

    # Execute multiple radical simulations
    scenarios = [
        {
            "demand_change_percent": 200.0,
            "additional_verified_supply": 500,
            "additional_training_capacity": 1000,
        },
        {
            "demand_change_percent": -100.0,
            "additional_verified_supply": 0,
            "additional_training_capacity": 0,
        },
        {
            "baseline_type": "FORECAST",
            "forecast_horizon": 12,
            "demand_change_percent": 50.0,
            "additional_verified_supply": 100,
        },
    ]

    for sc in scenarios:
        payload = {"skill_id": str(eco["skill_python"].id), **sc}
        resp = await async_client.post(
            f"{API}/skill",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

    # Verify all entity counts remain exactly identical
    async with AsyncSessionLocal() as session:
        jobs_count_after = (await session.scalar(select(func.count(Job.id)))) or 0
        skills_count_after = (await session.scalar(select(func.count(Skill.id)))) or 0
        verified_count_after = (await session.scalar(select(func.count(VerifiedSkill.id)))) or 0
        courses_count_after = (await session.scalar(select(func.count(Course.id)))) or 0

    assert jobs_count_before == jobs_count_after
    assert skills_count_before == skills_count_after
    assert verified_count_before == verified_count_after
    assert courses_count_before == courses_count_after

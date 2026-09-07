"""Phase 14: Skill Demand Forecasting Test Suite.

Comprehensive tests for:
  - Statistical model selection (Holt, Linear Trend, Baseline Fallback)
  - Forecast horizons (1–12 months, boundary rejections)
  - Non-negative constraints and confidence intervals
  - Demand growth classifications (INCREASING, STABLE, DECLINING)
  - Current vs. Forecasted shortage separation
  - Backtesting evaluation (MAE)
  - REST endpoints (/api/v1/demand/forecast and /api/v1/demand/skills/{id}/forecast)
  - RBAC across all 5 user roles
  - PII protection (zero candidate PII exposed)
"""

import datetime
import uuid

import pytest
from httpx import AsyncClient

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
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.user import User, UserRole
from app.models.verified_skill import (
    VerificationMethod,
    VerificationStatus,
    VerifiedSkill,
)
from app.schemas.demand import DemandGrowthTrend, ForecastModelType, SkillShortageStatus
from app.services.demand_forecast_service import (
    _classify_growth_trend,
    _classify_shortage,
    _fit_and_forecast,
)

API = "/api/v1/demand"


# ---------------------------------------------------------------------------
# Helpers
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
                experience_years=1.0,
                location_city=kwargs.get("city", "Hyderabad"),
                location_state=kwargs.get("state", "Telangana"),
            )
            session.add(profile)
        elif role == UserRole.EMPLOYER:
            profile = EmployerProfile(
                user_id=user.id,
                company_name=kwargs.get("company", "Acme Corp"),
                industry=kwargs.get("industry", "Technology"),
            )
            session.add(profile)
            await session.flush()
        elif role == UserRole.TRAINING_PROVIDER:
            profile = TrainingProviderProfile(
                user_id=user.id,
                institution_name=kwargs.get("institution", "TestEdu"),
            )
            session.add(profile)
            await session.flush()
        elif role == UserRole.GOVERNMENT:
            profile = GovernmentProfile(
                user_id=user.id,
                department_name=kwargs.get("dept", "Labour Ministry"),
            )
            session.add(profile)

        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


async def _make_skill(
    name: str | None = None, skill_type: SkillType = SkillType.TECHNICAL
) -> Skill:
    """Create a canonical skill with a unique suffix."""
    async with AsyncSessionLocal() as session:
        suffix = uuid.uuid4().hex[:8]
        base = name or "Skill"
        n = f"{base}_{suffix}"
        slug = n.lower().replace(" ", "-").replace("_", "-")
        normalized = n.upper().replace(" ", "_")
        skill = Skill(
            name=n,
            slug=slug,
            normalized_name=normalized,
            category="Engineering",
            skill_type=skill_type,
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
    return skill


async def _make_employer_with_profile(
    industry: str = "Technology",
) -> tuple[User, EmployerProfile, str]:
    """Create employer user + profile."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=f"employer_{uuid.uuid4().hex[:6]}@corp.com",
            password_hash=get_password_hash("Pass1234!"),
            full_name="Corp Employer",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        profile = EmployerProfile(
            user_id=user.id,
            company_name=f"Company_{uuid.uuid4().hex[:4]}",
            industry=industry,
            location_city="Hyderabad",
            location_state="Telangana",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def _make_published_job(
    employer_profile_id: uuid.UUID,
    skill_ids: list[uuid.UUID],
    city: str = "Hyderabad",
    state: str = "Telangana",
    is_active: bool = True,
    status: JobStatus = JobStatus.PUBLISHED,
    created_at: datetime.datetime | None = None,
) -> Job:
    """Create a job with given skills and publish it."""
    async with AsyncSessionLocal() as session:
        job = Job(
            employer_id=employer_profile_id,
            title=f"Job_{uuid.uuid4().hex[:4]}",
            description="Test job description",
            status=status,
            is_active=is_active,
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.MID,
            location_city=city,
            location_state=state,
        )
        if created_at:
            job.created_at = created_at
        session.add(job)
        await session.flush()
        for sid in skill_ids:
            js = JobSkill(job_id=job.id, skill_id=sid, is_required=True)
            session.add(js)
        await session.commit()
        await session.refresh(job)
    return job


async def _make_verified_skill(
    candidate_profile_id: uuid.UUID, skill_id: uuid.UUID
) -> VerifiedSkill:
    """Create a Phase 12 verified skill for a candidate."""
    async with AsyncSessionLocal() as session:
        vs = VerifiedSkill(
            candidate_id=candidate_profile_id,
            skill_id=skill_id,
            verification_status=VerificationStatus.VERIFIED,
            verification_method=VerificationMethod.ASSESSMENT,
            verification_score=90.0,
            verification_summary="Verified in tests",
        )
        session.add(vs)
        await session.commit()
        await session.refresh(vs)
    return vs


async def _make_course_for_skill(
    provider_id: uuid.UUID,
    skill_id: uuid.UUID,
    status: CourseStatus = CourseStatus.PUBLISHED,
    is_active: bool = True,
) -> Course:
    """Create a training course teaching a skill."""
    async with AsyncSessionLocal() as session:
        course = Course(
            provider_id=provider_id,
            title=f"Course_{uuid.uuid4().hex[:4]}",
            description="A course description",
            difficulty=CourseDifficulty.INTERMEDIATE,
            mode=CourseMode.ONLINE,
            duration_hours=40,
            capacity=30,
            status=status,
            is_active=is_active,
        )
        session.add(course)
        await session.flush()
        cs = CourseSkill(course_id=course.id, skill_id=skill_id)
        session.add(cs)
        await session.commit()
        await session.refresh(course)
    return course


# ===========================================================================
# Test Group 1: Unit Tests for Forecasting Math & Models
# ===========================================================================


def test_fit_and_forecast_zero_series():
    """Empty or all-zero counts return zeros and baseline_fallback model."""
    preds, lowers, uppers, model, mae = _fit_and_forecast([], 3)
    assert preds == [0, 0, 0]
    assert lowers == [0, 0, 0]
    assert uppers == [0, 0, 0]
    assert model == ForecastModelType.BASELINE_FALLBACK.value

    preds0, _, _, model0, _ = _fit_and_forecast([0, 0, 0], 3)
    assert preds0 == [0, 0, 0]
    assert model0 == ForecastModelType.BASELINE_FALLBACK.value


def test_fit_and_forecast_sparse_history():
    """1 or 2 historical points use moving average baseline."""
    preds, lowers, uppers, model, mae = _fit_and_forecast([10, 12], 3)
    assert len(preds) == 3
    assert preds[0] == 11
    assert model == ForecastModelType.BASELINE_FALLBACK.value
    assert all(low_b <= p <= up_b for low_b, p, up_b in zip(lowers, preds, uppers, strict=False))


def test_fit_and_forecast_linear_trend_3_to_5_observations():
    """3 to 5 observations use linear trend regression."""
    counts = [10, 15, 20, 25]
    preds, lowers, uppers, model, mae = _fit_and_forecast(counts, 3)
    assert len(preds) == 3
    assert model == ForecastModelType.LINEAR_TREND.value
    # Predictions should continue the +5 upward trend: 30, 35, 40
    assert preds[0] == 30
    assert preds[1] == 35
    assert preds[2] == 40
    assert mae is not None
    assert all(low_b <= p <= up_b for low_b, p, up_b in zip(lowers, preds, uppers, strict=False))


def test_fit_and_forecast_holt_for_6_plus_observations():
    """6+ observations with variance select Holt Exponential Smoothing."""
    counts = [10, 12, 15, 18, 22, 27, 33]
    preds, lowers, uppers, model, mae = _fit_and_forecast(counts, 3)
    assert len(preds) == 3
    assert model == ForecastModelType.HOLT.value
    assert preds[0] > counts[-1]  # positive trend projected
    assert mae is not None
    assert all(low_b <= p <= up_b for low_b, p, up_b in zip(lowers, preds, uppers, strict=False))


def test_negative_trend_clamping():
    """Steep downward trends clamp predictions to 0 and ensure bounds >= 0."""
    counts = [50, 40, 30, 20, 10, 2]
    preds, lowers, uppers, model, _ = _fit_and_forecast(counts, 4)
    assert all(p >= 0 for p in preds)
    assert all(low_b >= 0 for low_b in lowers)
    assert all(up_b >= 0 for up_b in uppers)
    assert all(low_b <= p <= up_b for low_b, p, up_b in zip(lowers, preds, uppers, strict=False))


def test_growth_trend_classification():
    """Verify growth rate calculations and classifications."""
    # Increasing
    growth, trend, interp = _classify_growth_trend(100, 125, 3, "Python")
    assert growth == 25.0
    assert trend == DemandGrowthTrend.INCREASING
    assert "projected to increase by +25.0%" in interp

    # Declining
    growth_dec, trend_dec, interp_dec = _classify_growth_trend(100, 80, 3, "Legacy Tool")
    assert growth_dec == -20.0
    assert trend_dec == DemandGrowthTrend.DECLINING
    assert "projected to decline by 20.0%" in interp_dec

    # Stable
    growth_stb, trend_stb, interp_stb = _classify_growth_trend(100, 104, 3, "Standard Skill")
    assert growth_stb == 4.0
    assert trend_stb == DemandGrowthTrend.STABLE
    assert "remain relatively stable" in interp_stb


def test_shortage_classification_logic():
    """Deterministic shortage ratio matching Phase 13 categories."""
    ratio_high, status_high = _classify_shortage(30, 5)
    assert ratio_high == 6.0
    assert status_high == SkillShortageStatus.HIGH_SHORTAGE

    ratio_mod, status_mod = _classify_shortage(20, 10)
    assert ratio_mod == 2.0
    assert status_mod == SkillShortageStatus.MODERATE_SHORTAGE

    ratio_bal, status_bal = _classify_shortage(10, 10)
    assert ratio_bal == 1.0
    assert status_bal == SkillShortageStatus.BALANCED

    ratio_sur, status_sur = _classify_shortage(5, 20)
    assert ratio_sur == 0.25
    assert status_sur == SkillShortageStatus.SURPLUS


# ===========================================================================
# Test Group 2: Skill Forecast Detail Endpoint (/demand/skills/{id}/forecast)
# ===========================================================================


@pytest.mark.asyncio
async def test_get_skill_forecast_success(async_client: AsyncClient):
    """Test full 360 forecast detail for a canonical skill."""
    skill = await _make_skill("ForecastPySkill")
    _, employer_profile, _ = await _make_employer_with_profile()

    # Create published jobs across consecutive dates
    await _make_published_job(
        employer_profile.id,
        [skill.id],
        created_at=datetime.datetime(2026, 1, 15, tzinfo=datetime.UTC),
    )
    await _make_published_job(
        employer_profile.id,
        [skill.id],
        created_at=datetime.datetime(2026, 2, 15, tzinfo=datetime.UTC),
    )
    await _make_published_job(
        employer_profile.id,
        [skill.id],
        created_at=datetime.datetime(2026, 2, 20, tzinfo=datetime.UTC),
    )

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.get(
        f"{API}/skills/{skill.id}/forecast", headers=headers, params={"horizon": 3}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["skill_id"] == str(skill.id)
    assert data["skill_name"] == skill.name
    assert data["forecast_horizon_months"] == 3
    assert data["historical_observations_count"] == 2
    assert data["current_actual_demand"] == 2
    assert len(data["monthly_forecasts"]) == 3
    assert len(data["combined_series"]) >= 5  # 2 actual + 3 forecast points
    assert data["confidence_level"] == 0.95
    assert "growth_trend" in data
    assert "forecasted_shortage_status" in data
    assert "training_insight" in data


@pytest.mark.asyncio
async def test_get_skill_forecast_boundary_horizons(async_client: AsyncClient):
    """Verify horizon validation (1..12 permitted, 0 and >12 rejected with 422)."""
    skill = await _make_skill("HorizonTestSkill")
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}

    # Valid horizon = 1
    resp1 = await async_client.get(
        f"{API}/skills/{skill.id}/forecast", headers=headers, params={"horizon": 1}
    )
    assert resp1.status_code == 200
    assert len(resp1.json()["monthly_forecasts"]) == 1

    # Valid horizon = 12
    resp12 = await async_client.get(
        f"{API}/skills/{skill.id}/forecast", headers=headers, params={"horizon": 12}
    )
    assert resp12.status_code == 200
    assert len(resp12.json()["monthly_forecasts"]) == 12

    # Invalid horizon = 0 -> 422
    resp0 = await async_client.get(
        f"{API}/skills/{skill.id}/forecast", headers=headers, params={"horizon": 0}
    )
    assert resp0.status_code == 422

    # Invalid horizon = 13 -> 422
    resp13 = await async_client.get(
        f"{API}/skills/{skill.id}/forecast", headers=headers, params={"horizon": 13}
    )
    assert resp13.status_code == 422


@pytest.mark.asyncio
async def test_get_skill_forecast_404_unknown_skill(async_client: AsyncClient):
    """Returns 404 for unknown skill ID."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    fake_id = uuid.uuid4()
    resp = await async_client.get(f"{API}/skills/{fake_id}/forecast", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_skill_forecast_unauthenticated_rejected(async_client: AsyncClient):
    """Unauthenticated requests are rejected with 401."""
    skill = await _make_skill("UnauthSkill")
    resp = await async_client.get(f"{API}/skills/{skill.id}/forecast")
    assert resp.status_code == 401


# ===========================================================================
# Test Group 3: Global Forecast Endpoint (/demand/forecast)
# ===========================================================================


@pytest.mark.asyncio
async def test_get_global_forecast_overview(async_client: AsyncClient):
    """Test platform-wide forecast leaderboard endpoint."""
    skill1 = await _make_skill("GlobalFcSkill1")
    skill2 = await _make_skill("GlobalFcSkill2")
    _, employer_profile, _ = await _make_employer_with_profile()

    await _make_published_job(employer_profile.id, [skill1.id])
    await _make_published_job(employer_profile.id, [skill2.id])

    _, token = await _make_user(UserRole.EMPLOYER)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.get(f"{API}/forecast", headers=headers, params={"horizon": 3})
    assert resp.status_code == 200
    data = resp.json()

    assert data["horizon_months"] == 3
    assert data["total_current_demand"] >= 2
    assert "top_growing_skills" in data
    assert "top_declining_skills" in data
    assert "high_forecast_shortage_skills" in data
    assert "forecast_items" in data
    assert len(data["forecast_items"]) >= 2


@pytest.mark.asyncio
async def test_global_forecast_filter_by_industry(async_client: AsyncClient):
    """Filter global forecast to a specific employer industry."""
    skill = await _make_skill("IndustryFcSkill")
    _, employer_profile, _ = await _make_employer_with_profile(industry="Healthcare")
    await _make_published_job(employer_profile.id, [skill.id])

    _, token = await _make_user(UserRole.GOVERNMENT)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.get(
        f"{API}/forecast", headers=headers, params={"industry": "Healthcare"}
    )
    assert resp.status_code == 200
    data = resp.json()
    items = [s for s in data["forecast_items"] if s["skill_id"] == str(skill.id)]
    assert len(items) >= 1


@pytest.mark.asyncio
async def test_global_forecast_filter_by_location(async_client: AsyncClient):
    """Filter global forecast to a specific city/state location."""
    skill = await _make_skill("LocationFcSkill")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id], city="Kolkata", state="West Bengal")

    _, token = await _make_user(UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.get(
        f"{API}/forecast", headers=headers, params={"location": "Kolkata"}
    )
    assert resp.status_code == 200
    data = resp.json()
    items = [s for s in data["forecast_items"] if s["skill_id"] == str(skill.id)]
    assert len(items) >= 1


# ===========================================================================
# Test Group 4: RBAC & Security (All 5 Roles & PII Verification)
# ===========================================================================


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "role",
    [
        UserRole.CANDIDATE,
        UserRole.EMPLOYER,
        UserRole.TRAINING_PROVIDER,
        UserRole.GOVERNMENT,
        UserRole.ADMIN,
    ],
)
async def test_rbac_all_five_roles_permitted(async_client: AsyncClient, role: UserRole):
    """All 5 platform roles can access forecasting endpoints."""
    skill = await _make_skill("RbacFcSkill")
    _, token = await _make_user(role)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await async_client.get(f"{API}/skills/{skill.id}/forecast", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_forecast_endpoints_expose_zero_pii(async_client: AsyncClient):
    """Forecast endpoints must never expose candidate emails or private PII."""
    skill = await _make_skill("PIISafeFcSkill")
    user, token = await _make_user(UserRole.CANDIDATE)
    async with AsyncSessionLocal() as session:
        cand_prof = (
            await session.execute(
                __import__("sqlalchemy", fromlist=["select"])
                .select(CandidateProfile)
                .where(CandidateProfile.user_id == user.id)
            )
        ).scalar_one()
    await _make_verified_skill(cand_prof.id, skill.id)

    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/forecast", headers=headers)
    assert resp.status_code == 200
    body = resp.text
    assert user.email not in body
    assert "password" not in body
    assert str(cand_prof.id) not in body

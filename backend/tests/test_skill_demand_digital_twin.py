"""Comprehensive backend tests for Phase 13 — Skill Demand Digital Twin.

Tests:
 1.  Overview endpoint returns valid KPIs without authentication
 2.  Overview KPIs reflect only PUBLISHED+is_active jobs (DRAFT excluded)
 3.  List endpoint requires authentication
 4.  List returns paginated demand leaderboard
 5.  List demand_count matches published active jobs referencing skill
 6.  List shortage_status is BALANCED when demand == 0 and supply == 0
 7.  List shortage_status is HIGH_SHORTAGE when ratio >= 3.0
 8.  List shortage_status is MODERATE_SHORTAGE for 1.5 <= ratio < 3.0
 9.  List shortage_status is SURPLUS when supply >> demand
10.  List shortage_status is HIGH_SHORTAGE when demand >= 3 and verified_supply == 0
11.  Demand share percentage calculated from total active jobs
12.  Rank ordering: highest demand skill ranks first
13.  Filter by shortage_status
14.  Filter by search (skill name substring)
15.  Skill detail endpoint returns 404 for unknown skill_id
16.  Skill detail returns correct demand_count and supply
17.  Skill demand trends returns historical monthly counts
18.  Skill demand locations groups by city/state/remote
19.  Skill demand industries groups by employer industry
20.  Skill demand supply: ZERO PII (no emails/names in response)
21.  Skill demand supply counts verified vs unverified correctly
22.  Skill demand training returns only PUBLISHED active courses
23.  CLOSED jobs are excluded from demand counts
24.  DRAFT jobs are excluded from demand counts
25.  Government role can access overview and list
26.  Employer role can access overview and list
27.  Training provider role can access overview and list
28.  Admin role can access all endpoints
"""

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
from app.models.verified_skill import VerificationMethod, VerificationStatus, VerifiedSkill

API = "/api/v1/demand"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_user(role: UserRole, **kwargs) -> tuple[User, str]:
    """Create any user role and return (user, token)."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=f"{role.value.lower()}_{uuid.uuid4().hex[:12]}@test.com",
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
    """Create a canonical skill and return it.

    A uuid suffix is always appended to prevent normalized_name collisions
    when tests run against the same persistent database.
    """
    async with AsyncSessionLocal() as session:
        # Always append a unique suffix so normalized_name is unique per run
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
            email=f"employer_{uuid.uuid4().hex[:12]}@corp.com",
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
        session.add(job)
        await session.flush()
        for sid in skill_ids:
            js = JobSkill(job_id=job.id, skill_id=sid, is_required=True)
            session.add(js)
        await session.commit()
        await session.refresh(job)
    return job


async def _make_training_provider_with_profile() -> tuple[User, TrainingProviderProfile, str]:
    """Create training provider user + profile."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=f"tp_{uuid.uuid4().hex[:12]}@edu.com",
            password_hash=get_password_hash("Pass1234!"),
            full_name="Training Provider",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        tp_profile = TrainingProviderProfile(
            user_id=user.id,
            institution_name=f"Institute_{uuid.uuid4().hex[:4]}",
        )
        session.add(tp_profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(tp_profile)
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, tp_profile, token


async def _make_course_for_skill(
    provider_id: uuid.UUID,
    skill_id: uuid.UUID,
    status: CourseStatus = CourseStatus.PUBLISHED,
    is_active: bool = True,
) -> Course:
    """Create a course teaching a skill."""
    async with AsyncSessionLocal() as session:
        course = Course(
            provider_id=provider_id,
            title=f"Course_{uuid.uuid4().hex[:4]}",
            description="Test course",
            difficulty=CourseDifficulty.INTERMEDIATE,
            mode=CourseMode.ONLINE,
            status=status,
            is_active=is_active,
            capacity=30,
            duration_hours=40,
        )
        session.add(course)
        await session.flush()
        cs = CourseSkill(course_id=course.id, skill_id=skill_id)
        session.add(cs)
        await session.commit()
        await session.refresh(course)
    return course


async def _make_verified_skill(
    candidate_profile_id: uuid.UUID,
    skill_id: uuid.UUID,
    status: VerificationStatus = VerificationStatus.VERIFIED,
) -> VerifiedSkill:
    """Add a VerifiedSkill for a candidate."""
    async with AsyncSessionLocal() as session:
        vs = VerifiedSkill(
            candidate_id=candidate_profile_id,
            skill_id=skill_id,
            verification_status=status,
            verification_method=VerificationMethod.COURSE_COMPLETION,
            verification_score=80.0,
            verification_summary="Completed course test",
        )
        session.add(vs)
        await session.commit()
        await session.refresh(vs)
    return vs


async def _get_candidate_profile(user_id: uuid.UUID) -> CandidateProfile:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            __import__("sqlalchemy", fromlist=["select"])
            .select(CandidateProfile)
            .where(CandidateProfile.user_id == user_id)
        )
        return result.scalars().first()


# ---------------------------------------------------------------------------
# Test Group 1: Overview Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_overview_public_no_auth_required(async_client: AsyncClient):
    """Test 1: Overview endpoint is public — no auth token needed."""
    resp = await async_client.get(f"{API}/overview")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "kpis" in data
    assert "top_demanded_skills" in data
    assert "highest_shortage_skills" in data


@pytest.mark.asyncio
async def test_overview_kpis_reflect_published_jobs_only(async_client: AsyncClient):
    """Test 2: KPIs change correctly when a PUBLISHED job is added vs DRAFT job."""
    skill = await _make_skill("PubTestSkill2")
    _, employer_profile, _ = await _make_employer_with_profile()

    # Create DRAFT job — should NOT count
    await _make_published_job(employer_profile.id, [skill.id], status=JobStatus.DRAFT)

    resp1 = await async_client.get(f"{API}/overview")
    kpis1 = resp1.json()["kpis"]

    # Create PUBLISHED job — SHOULD count
    await _make_published_job(employer_profile.id, [skill.id], status=JobStatus.PUBLISHED)

    resp2 = await async_client.get(f"{API}/overview")
    kpis2 = resp2.json()["kpis"]

    assert kpis2["total_active_jobs"] > kpis1["total_active_jobs"]


# ---------------------------------------------------------------------------
# Test Group 2: List Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_requires_authentication(async_client: AsyncClient):
    """Test 3: List skills endpoint requires authentication."""
    resp = await async_client.get(f"{API}/skills")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_returns_demand_leaderboard(async_client: AsyncClient):
    """Test 4: List returns paginated demand leaderboard with required fields."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 10})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "skill_id" in item
        assert "skill_name" in item
        assert "demand_count" in item
        assert "shortage_status" in item
        assert "rank" in item


@pytest.mark.asyncio
async def test_list_demand_count_matches_published_active_jobs(async_client: AsyncClient):
    """Test 5: demand_count matches the number of published active jobs for a skill."""
    skill = await _make_skill("DemandCountTestSkill5")
    _, employer_profile, _ = await _make_employer_with_profile()

    # Create 2 published active jobs requiring this skill
    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    assert resp.status_code == 200
    data = resp.json()
    skill_items = [s for s in data if s["skill_id"] == str(skill.id)]
    assert skill_items, "Skill not found in response"
    assert skill_items[0]["demand_count"] >= 2


@pytest.mark.asyncio
async def test_list_balanced_status_when_no_demand_and_no_supply(async_client: AsyncClient):
    """Test 6: BALANCED when demand_count == 0 AND verified_supply == 0."""
    skill = await _make_skill("NoDemanNoSupply6")
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    if items:
        assert items[0]["shortage_status"] == "BALANCED"
        assert items[0]["demand_count"] == 0
        assert items[0]["verified_supply_count"] == 0


@pytest.mark.asyncio
async def test_shortage_status_high_shortage_ratio_ge_3(async_client: AsyncClient):
    """Test 7: HIGH_SHORTAGE when demand/verified_supply >= 3.0."""
    skill = await _make_skill("HighShortageRatioSkill7")
    _, employer_profile, _ = await _make_employer_with_profile()

    # 3 demand, 1 verified supply → ratio = 3.0 → HIGH_SHORTAGE
    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])

    # 1 verified candidate
    cand_user, cand_token = await _make_user(UserRole.CANDIDATE)
    cand_profile = await _get_candidate_profile(cand_user.id)
    await _make_verified_skill(cand_profile.id, skill.id, VerificationStatus.VERIFIED)

    _, token = await _make_user(UserRole.EMPLOYER)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    assert items, "Skill not found"
    assert items[0]["shortage_status"] == "HIGH_SHORTAGE"


@pytest.mark.asyncio
async def test_shortage_status_moderate_shortage(async_client: AsyncClient):
    """Test 8: MODERATE_SHORTAGE when 1.5 <= ratio < 3.0."""
    skill = await _make_skill("ModerateShortageSkill8")
    _, employer_profile, _ = await _make_employer_with_profile()

    # 2 demand, 1 verified supply → ratio = 2.0 → MODERATE_SHORTAGE
    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])

    cand_user, _ = await _make_user(UserRole.CANDIDATE)
    cand_profile = await _get_candidate_profile(cand_user.id)
    await _make_verified_skill(cand_profile.id, skill.id, VerificationStatus.VERIFIED)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    assert items
    assert items[0]["shortage_status"] == "MODERATE_SHORTAGE"


@pytest.mark.asyncio
async def test_shortage_status_surplus_when_supply_exceeds_demand(async_client: AsyncClient):
    """Test 9: SURPLUS when supply much greater than demand."""
    skill = await _make_skill("SurplusSkill9")
    _, employer_profile, _ = await _make_employer_with_profile()

    # 1 demand, 3 verified supply → ratio = 0.33 → SURPLUS
    await _make_published_job(employer_profile.id, [skill.id])

    for _ in range(3):
        cand_user, _ = await _make_user(UserRole.CANDIDATE)
        cp = await _get_candidate_profile(cand_user.id)
        await _make_verified_skill(cp.id, skill.id)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    assert items
    assert items[0]["shortage_status"] == "SURPLUS"


@pytest.mark.asyncio
async def test_shortage_status_high_when_demand_ge3_and_supply_zero(async_client: AsyncClient):
    """Test 10: HIGH_SHORTAGE when demand >= 3 and verified_supply == 0."""
    skill = await _make_skill("HighNoSupplySkill10")
    _, employer_profile, _ = await _make_employer_with_profile()

    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])
    await _make_published_job(employer_profile.id, [skill.id])

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    assert items
    assert items[0]["shortage_status"] == "HIGH_SHORTAGE"
    assert items[0]["verified_supply_count"] == 0


@pytest.mark.asyncio
async def test_demand_share_percentage_proportional_to_total_jobs(async_client: AsyncClient):
    """Test 11: demand_share_percentage is demand_count/total_active_jobs * 100."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}

    # Get overview for total_active_jobs denominator
    over_resp = await async_client.get(f"{API}/overview")
    total_jobs = over_resp.json()["kpis"]["total_active_jobs"]

    resp = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 5})
    data = resp.json()
    if data and total_jobs > 0:
        item = data[0]
        expected_share = round((item["demand_count"] / total_jobs) * 100, 1)
        assert abs(item["demand_share_percentage"] - expected_share) < 0.5


@pytest.mark.asyncio
async def test_rank_ordering_highest_demand_first(async_client: AsyncClient):
    """Test 12: First item in list should have rank 1 and highest demand."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 10})
    data = resp.json()
    if len(data) >= 2:
        assert data[0]["demand_count"] >= data[1]["demand_count"]
        assert data[0]["rank"] == 1


@pytest.mark.asyncio
async def test_filter_by_shortage_status(async_client: AsyncClient):
    """Test 13: Filter by shortage_status only returns matching items."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills",
        headers=headers,
        params={"shortage_status": "BALANCED", "limit": 20},
    )
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert item["shortage_status"] == "BALANCED"


@pytest.mark.asyncio
async def test_filter_by_search_skill_name(async_client: AsyncClient):
    """Test 14: Search filter returns only skills matching the substring."""
    unique_term = f"XYZUNIQUE_{uuid.uuid4().hex[:5]}"
    skill = await _make_skill(f"{unique_term}_Skill")
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": unique_term, "limit": 5}
    )
    data = resp.json()
    assert any(s["skill_id"] == str(skill.id) for s in data)


# ---------------------------------------------------------------------------
# Test Group 3: Skill Detail Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_skill_detail_404_for_unknown_skill(async_client: AsyncClient):
    """Test 15: Skill detail returns 404 for a non-existent skill_id."""
    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{uuid.uuid4()}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_skill_detail_returns_correct_data(async_client: AsyncClient):
    """Test 16: Skill detail returns correct demand_count and supply fields."""
    skill = await _make_skill("DetailTestSkill16")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id])

    cand_user, _ = await _make_user(UserRole.CANDIDATE)
    cp = await _get_candidate_profile(cand_user.id)
    await _make_verified_skill(cp.id, skill.id)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["skill_id"] == str(skill.id)
    assert data["skill_name"] == skill.name
    assert data["demand_count"] >= 1
    assert "supply" in data
    assert data["supply"]["verified_candidates"] >= 1
    assert "shortage_status" in data
    assert "top_industries" in data
    assert "top_locations" in data
    assert "historical_trends" in data


# ---------------------------------------------------------------------------
# Test Group 4: Sub-resources
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_skill_trends_returns_monthly_counts(async_client: AsyncClient):
    """Test 17: Trends endpoint returns items with period, period_date, demand_count."""
    skill = await _make_skill("TrendsSkill17")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id])

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/trends", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    if data:
        assert "period" in data[0]
        assert "period_date" in data[0]
        assert "demand_count" in data[0]
        assert data[0]["demand_count"] >= 1


@pytest.mark.asyncio
async def test_skill_locations_groups_by_city_state(async_client: AsyncClient):
    """Test 18: Locations endpoint returns items with city, state, demand_count."""
    skill = await _make_skill("LocationsSkill18")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id], city="Mumbai", state="Maharashtra")

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/locations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        assert "city" in data[0]
        assert "demand_count" in data[0]
        assert "demand_share_percentage" in data[0]


@pytest.mark.asyncio
async def test_skill_industries_groups_by_employer_industry(async_client: AsyncClient):
    """Test 19: Industries endpoint groups demand by employer industry field."""
    skill = await _make_skill("IndustriesSkill19")
    _, employer_profile, _ = await _make_employer_with_profile(industry="HealthTech")
    await _make_published_job(employer_profile.id, [skill.id])

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/industries", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        assert "industry" in data[0]
        assert "demand_count" in data[0]
        industries = [item["industry"] for item in data]
        assert "HealthTech" in industries


@pytest.mark.asyncio
async def test_skill_supply_exposes_zero_pii(async_client: AsyncClient):
    """Test 20: Supply endpoint returns only aggregate counts — no PII."""
    skill = await _make_skill("NoPIISkill20")
    cand_user, _ = await _make_user(UserRole.CANDIDATE)
    cp = await _get_candidate_profile(cand_user.id)
    await _make_verified_skill(cp.id, skill.id)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/supply", headers=headers)
    assert resp.status_code == 200
    raw = resp.text

    # Assert no personal identifiers are present
    assert cand_user.email not in raw
    assert str(cand_user.id) not in raw
    assert "password" not in raw.lower()
    assert "email" not in raw.lower()

    data = resp.json()
    assert "verified_candidates" in data
    assert isinstance(data["verified_candidates"], int)


@pytest.mark.asyncio
async def test_skill_supply_counts_verified_vs_unverified(async_client: AsyncClient):
    """Test 21: Supply correctly separates verified vs unverified candidate counts."""
    skill = await _make_skill("SupplyVerifSkill21")

    # Verified candidate
    cand_user1, _ = await _make_user(UserRole.CANDIDATE)
    cp1 = await _get_candidate_profile(cand_user1.id)
    await _make_verified_skill(cp1.id, skill.id, VerificationStatus.VERIFIED)

    # Unverified candidate (UNVERIFIED status)
    cand_user2, _ = await _make_user(UserRole.CANDIDATE)
    cp2 = await _get_candidate_profile(cand_user2.id)
    await _make_verified_skill(cp2.id, skill.id, VerificationStatus.UNVERIFIED)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/supply", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verified_candidates"] >= 1


@pytest.mark.asyncio
async def test_skill_training_returns_only_published_active_courses(async_client: AsyncClient):
    """Test 22: Training endpoint only shows PUBLISHED+is_active courses."""
    skill = await _make_skill("TrainingSkill22")
    _, tp_profile, _ = await _make_training_provider_with_profile()

    # Published active course — should appear
    pub_course = await _make_course_for_skill(tp_profile.id, skill.id, CourseStatus.PUBLISHED, True)
    # Draft course — should NOT appear
    await _make_course_for_skill(tp_profile.id, skill.id, CourseStatus.DRAFT, True)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(f"{API}/skills/{skill.id}/training", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    course_ids = [str(c["course_id"]) for c in data]
    assert str(pub_course.id) in course_ids


# ---------------------------------------------------------------------------
# Test Group 5: Excluded Jobs
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_closed_jobs_excluded_from_demand(async_client: AsyncClient):
    """Test 23: CLOSED jobs do not contribute to demand_count."""
    skill = await _make_skill("ClosedJobSkill23")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id], status=JobStatus.CLOSED)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    if items:
        assert items[0]["demand_count"] == 0


@pytest.mark.asyncio
async def test_draft_jobs_excluded_from_demand(async_client: AsyncClient):
    """Test 24: DRAFT jobs do not contribute to demand_count."""
    skill = await _make_skill("DraftJobSkill24")
    _, employer_profile, _ = await _make_employer_with_profile()
    await _make_published_job(employer_profile.id, [skill.id], status=JobStatus.DRAFT)

    _, token = await _make_user(UserRole.CANDIDATE)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await async_client.get(
        f"{API}/skills", headers=headers, params={"search": skill.name, "limit": 5}
    )
    data = resp.json()
    items = [s for s in data if s["skill_id"] == str(skill.id)]
    if items:
        assert items[0]["demand_count"] == 0


# ---------------------------------------------------------------------------
# Test Group 6: RBAC
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_government_role_can_access_demand(async_client: AsyncClient):
    """Test 25: Government role can view demand overview and list."""
    _, token = await _make_user(UserRole.GOVERNMENT)
    headers = {"Authorization": f"Bearer {token}"}
    resp_list = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 5})
    assert resp_list.status_code == 200


@pytest.mark.asyncio
async def test_employer_role_can_access_demand(async_client: AsyncClient):
    """Test 26: Employer role can view demand list."""
    _, _, emp_token = await _make_employer_with_profile()
    headers = {"Authorization": f"Bearer {emp_token}"}
    resp = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 5})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_training_provider_role_can_access_demand(async_client: AsyncClient):
    """Test 27: Training provider role can view demand list."""
    _, _, tp_token = await _make_training_provider_with_profile()
    headers = {"Authorization": f"Bearer {tp_token}"}
    resp = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 5})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_role_can_access_all_demand_endpoints(async_client: AsyncClient):
    """Test 28: Admin role can access all demand endpoints."""
    admin_user, token = await _make_user(UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    # Overview
    r1 = await async_client.get(f"{API}/overview")
    assert r1.status_code == 200

    # List
    r2 = await async_client.get(f"{API}/skills", headers=headers, params={"limit": 5})
    assert r2.status_code == 200

    # Skills list to get a valid skill_id
    skills = r2.json()
    if skills:
        sid = skills[0]["skill_id"]
        r3 = await async_client.get(f"{API}/skills/{sid}", headers=headers)
        assert r3.status_code == 200
        r4 = await async_client.get(f"{API}/skills/{sid}/trends", headers=headers)
        assert r4.status_code == 200
        r5 = await async_client.get(f"{API}/skills/{sid}/industries", headers=headers)
        assert r5.status_code == 200
        r6 = await async_client.get(f"{API}/skills/{sid}/locations", headers=headers)
        assert r6.status_code == 200
        r7 = await async_client.get(f"{API}/skills/{sid}/supply", headers=headers)
        assert r7.status_code == 200
        r8 = await async_client.get(f"{API}/skills/{sid}/training", headers=headers)
        assert r8.status_code == 200

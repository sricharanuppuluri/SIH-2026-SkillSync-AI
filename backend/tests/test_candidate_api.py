"""Tests for Phase 7 Candidate Module:
profile, skills, education, experience, resume, completeness, RBAC, and isolation.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.profiles import CandidateProfile, EmployerProfile
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.user import User, UserRole


async def create_candidate(
    full_name: str = "Candidate Tester",
    headline: str | None = None,
    bio: str | None = None,
) -> tuple[User, CandidateProfile, str]:
    """Helper to create candidate user with profile and JWT."""
    unique_email = f"cand_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name=full_name,
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = CandidateProfile(
            user_id=user.id,
            headline=headline,
            bio=bio,
            experience_years=0.0,
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_other_role_user(role: UserRole) -> tuple[User, str]:
    """Helper to create non-candidate users."""
    unique_email = f"user_{role.value.lower()}_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name=f"Test {role.value}",
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        if role == UserRole.EMPLOYER:
            profile = EmployerProfile(user_id=user.id, company_name="Corp Inc")
            session.add(profile)

        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


async def create_canonical_skill(name: str = "FastAPI", category: str = "Web Development") -> Skill:
    """Helper to ensure a canonical skill exists."""
    slug = name.lower().replace(" ", "-")
    async with AsyncSessionLocal() as session:
        skill = Skill(
            name=name,
            slug=slug,
            normalized_name=name.lower().strip(),
            category=category,
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
            description="Test canonical skill",
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
    return skill


# ---------------------------------------------------------------------------
# 1. Profile Management Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_candidate_profile_unauthenticated(async_client: AsyncClient) -> None:
    """Unauthenticated requests to candidate profile endpoints return 401."""
    response = await async_client.get("/api/v1/candidate/profile")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_and_update_candidate_profile(async_client: AsyncClient) -> None:
    """Candidate can retrieve and update their own profile."""
    user, profile, token = await create_candidate(full_name="Jane Doe")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch profile
    get_res = await async_client.get("/api/v1/candidate/profile", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["full_name"] == "Jane Doe"
    assert data["email"] == user.email
    assert data["experience_years"] == 0.0

    # 2. Update profile
    update_payload = {
        "full_name": "Jane Developer",
        "headline": "Full-Stack AI Engineer",
        "bio": "Passionate developer with expertise in FastAPI, React, and Machine Learning.",
        "current_role": "Senior Engineer",
        "experience_years": 4.5,
        "education_level": "Bachelor of Technology",
        "location_city": "Hyderabad",
        "location_state": "Telangana",
    }
    put_res = await async_client.put(
        "/api/v1/candidate/profile", json=update_payload, headers=headers
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["full_name"] == "Jane Developer"
    assert updated["headline"] == "Full-Stack AI Engineer"
    assert updated["current_role"] == "Senior Engineer"
    assert updated["experience_years"] == 4.5
    assert updated["location_city"] == "Hyderabad"


# ---------------------------------------------------------------------------
# 2. Skills Management Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_skill_lifecycle_and_validation(async_client: AsyncClient) -> None:
    """Candidate can attach canonical skills, update proficiency, list, and delete."""
    user, profile, token = await create_candidate()
    headers = {"Authorization": f"Bearer {token}"}
    skill = await create_canonical_skill(name=f"Python-{uuid.uuid4().hex[:12]}")

    # 1. Attach skill
    attach_payload = {
        "skill_id": str(skill.id),
        "proficiency": "ADVANCED",
        "years_experience": 3.5,
    }
    post_res = await async_client.post(
        "/api/v1/candidate/skills", json=attach_payload, headers=headers
    )
    assert post_res.status_code == 201
    cand_skill = post_res.json()
    assert cand_skill["skill_id"] == str(skill.id)
    assert cand_skill["proficiency"] == "ADVANCED"
    assert cand_skill["years_experience"] == 3.5
    assert cand_skill["skill_name"] == skill.name

    # 2. Duplicate attachment rejected
    dup_res = await async_client.post(
        "/api/v1/candidate/skills", json=attach_payload, headers=headers
    )
    assert dup_res.status_code == 400
    assert "already attached" in dup_res.json()["detail"].lower()

    # 3. List skills
    list_res = await async_client.get("/api/v1/candidate/skills", headers=headers)
    assert list_res.status_code == 200
    skills_list = list_res.json()
    assert len(skills_list) == 1
    assert skills_list[0]["skill_id"] == str(skill.id)

    # 4. Update proficiency
    update_payload = {
        "proficiency": "EXPERT",
        "years_experience": 5.0,
    }
    put_res = await async_client.put(
        f"/api/v1/candidate/skills/{skill.id}",
        json=update_payload,
        headers=headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["proficiency"] == "EXPERT"
    assert put_res.json()["years_experience"] == 5.0

    # 5. Nonexistent skill error
    fake_id = str(uuid.uuid4())
    bad_res = await async_client.post(
        "/api/v1/candidate/skills",
        json={"skill_id": fake_id, "proficiency": "BEGINNER", "years_experience": 1.0},
        headers=headers,
    )
    assert bad_res.status_code == 404

    # 6. Delete skill
    del_res = await async_client.delete(f"/api/v1/candidate/skills/{skill.id}", headers=headers)
    assert del_res.status_code == 204

    # Verify empty list
    empty_res = await async_client.get("/api/v1/candidate/skills", headers=headers)
    assert len(empty_res.json()) == 0


# ---------------------------------------------------------------------------
# 3. Education CRUD & Ownership Isolation Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_education_crud_and_validation(async_client: AsyncClient) -> None:
    """Test Education CRUD, year validations, and candidate ownership boundaries."""
    user1, profile1, token1 = await create_candidate(full_name="Student 1")
    user2, profile2, token2 = await create_candidate(full_name="Student 2")
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 1. Invalid dates (end < start when not current)
    bad_payload = {
        "institution": "National Institute of Technology",
        "degree": "B.Tech Computer Science",
        "start_year": 2024,
        "end_year": 2020,
        "is_current": False,
    }
    bad_res = await async_client.post(
        "/api/v1/candidate/education", json=bad_payload, headers=headers1
    )
    assert bad_res.status_code == 400

    # 2. Create valid education
    valid_payload = {
        "institution": "National Institute of Technology",
        "degree": "B.Tech",
        "field_of_study": "Computer Science & Engineering",
        "start_year": 2020,
        "end_year": 2024,
        "is_current": False,
        "grade": "8.8 CGPA",
        "description": "Specialized in Distributed Systems and Deep Learning.",
    }
    create_res = await async_client.post(
        "/api/v1/candidate/education", json=valid_payload, headers=headers1
    )
    assert create_res.status_code == 201
    edu = create_res.json()
    edu_id = edu["id"]
    assert edu["institution"] == "National Institute of Technology"

    # 3. Update education
    update_res = await async_client.put(
        f"/api/v1/candidate/education/{edu_id}",
        json={"grade": "9.0 CGPA"},
        headers=headers1,
    )
    assert update_res.status_code == 200
    assert update_res.json()["grade"] == "9.0 CGPA"

    # 4. Ownership Isolation: Candidate 2 cannot update or delete Candidate 1's education
    forbidden_put = await async_client.put(
        f"/api/v1/candidate/education/{edu_id}",
        json={"grade": "Hacked CGPA"},
        headers=headers2,
    )
    assert forbidden_put.status_code == 404

    forbidden_del = await async_client.delete(
        f"/api/v1/candidate/education/{edu_id}",
        headers=headers2,
    )
    assert forbidden_del.status_code == 404

    # 5. Candidate 1 deletes education
    del_res = await async_client.delete(f"/api/v1/candidate/education/{edu_id}", headers=headers1)
    assert del_res.status_code == 204


# ---------------------------------------------------------------------------
# 4. Experience CRUD & Ownership Isolation Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_experience_crud_and_isolation(async_client: AsyncClient) -> None:
    """Test Experience CRUD and candidate ownership boundaries."""
    user1, profile1, token1 = await create_candidate(full_name="Worker 1")
    user2, profile2, token2 = await create_candidate(full_name="Worker 2")
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 1. Create experience
    payload = {
        "company": "Infosys Technologies",
        "title": "Systems Engineer",
        "employment_type": "Full-time",
        "location": "Bengaluru, Karnataka",
        "start_date": "2022-06",
        "end_date": None,
        "is_current": True,
        "description": "Developed cloud-native backend microservices with Python and Postgres.",
    }
    create_res = await async_client.post(
        "/api/v1/candidate/experience", json=payload, headers=headers1
    )
    assert create_res.status_code == 201
    exp = create_res.json()
    exp_id = exp["id"]
    assert exp["company"] == "Infosys Technologies"
    assert exp["is_current"] is True

    # 2. List experience
    list_res = await async_client.get("/api/v1/candidate/experience", headers=headers1)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 3. Ownership Isolation: Candidate 2 cannot touch Candidate 1 experience
    assert (
        await async_client.put(
            f"/api/v1/candidate/experience/{exp_id}",
            json={"title": "Unauthorized Title"},
            headers=headers2,
        )
    ).status_code == 404

    assert (
        await async_client.delete(
            f"/api/v1/candidate/experience/{exp_id}",
            headers=headers2,
        )
    ).status_code == 404

    # 4. Candidate 1 deletes experience
    del_res = await async_client.delete(f"/api/v1/candidate/experience/{exp_id}", headers=headers1)
    assert del_res.status_code == 204


# ---------------------------------------------------------------------------
# 5. Resume Management Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_resume_upload_and_delete(async_client: AsyncClient) -> None:
    """Candidate can upload resume metadata/content and remove it."""
    user, profile, token = await create_candidate()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload resume metadata
    resume_payload = {
        "filename": "John_Doe_Resume_2026.pdf",
        "file_size": 245000,
        "resume_text": "Experienced Python and TypeScript full stack developer with AI focus.",
    }
    upload_res = await async_client.post(
        "/api/v1/candidate/resume", json=resume_payload, headers=headers
    )
    assert upload_res.status_code == 200
    resume_data = upload_res.json()
    assert resume_data["has_resume"] is True
    assert resume_data["filename"] == "John_Doe_Resume_2026.pdf"
    assert resume_data["file_size"] == 245000

    # 2. Delete resume
    del_res = await async_client.delete("/api/v1/candidate/resume", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["has_resume"] is False
    assert del_res.json()["filename"] is None


# ---------------------------------------------------------------------------
# 6. Profile Completeness Formula Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_deterministic_profile_completeness_calculation(async_client: AsyncClient) -> None:
    """Test deterministic profile completeness calculation progression from empty to 100%."""
    user, profile, token = await create_candidate(full_name="Incomplete User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial state: Only full_name, missing headline/role/location -> 0%
    c1 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    assert c1.status_code == 200
    res1 = c1.json()
    assert res1["percentage"] == 0
    assert "Basic Information" in res1["missing_sections"]

    # 2. Add Basic Info (+20%) and Bio (+10%) -> 30%
    await async_client.put(
        "/api/v1/candidate/profile",
        json={
            "headline": "AI Solutions Architect",
            "current_role": "Software Developer",
            "bio": "Experienced engineer with a decade of expertise in AI systems.",
        },
        headers=headers,
    )
    c2 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    res2 = c2.json()
    assert res2["percentage"] == 30
    assert "Basic Information" in res2["completed_sections"]
    assert "Professional Summary" in res2["completed_sections"]

    # 3. Add Education (+15%) -> 45%
    await async_client.post(
        "/api/v1/candidate/education",
        json={"institution": "State University", "degree": "B.S. Computer Science"},
        headers=headers,
    )
    c3 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    assert c3.json()["percentage"] == 45

    # 4. Add Experience (+20%) -> 65%
    await async_client.post(
        "/api/v1/candidate/experience",
        json={"company": "Tech Labs", "title": "Developer", "is_current": True},
        headers=headers,
    )
    c4 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    assert c4.json()["percentage"] == 65

    # 5. Add Skill (+25%) -> 90%
    skill = await create_canonical_skill(name=f"SkillComp-{uuid.uuid4().hex[:4]}")
    await async_client.post(
        "/api/v1/candidate/skills",
        json={"skill_id": str(skill.id), "proficiency": "ADVANCED", "years_experience": 2.0},
        headers=headers,
    )
    c5 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    assert c5.json()["percentage"] == 90

    # 6. Add Resume (+10%) -> 100%
    await async_client.post(
        "/api/v1/candidate/resume",
        json={"filename": "resume.pdf", "file_size": 102400, "resume_text": "Sample text"},
        headers=headers,
    )
    c6 = await async_client.get("/api/v1/candidate/profile/completeness", headers=headers)
    res6 = c6.json()
    assert res6["percentage"] == 100
    assert len(res6["missing_sections"]) == 0
    assert len(res6["completed_sections"]) == 6


# ---------------------------------------------------------------------------
# 7. Dashboard Endpoint Test
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_dashboard_aggregation(async_client: AsyncClient) -> None:
    """Candidate dashboard returns profile completeness, skills distribution, and recents."""
    user, profile, token = await create_candidate(
        full_name="Dashboard Candidate",
        headline="Full-Stack Developer",
        bio="Experienced software engineer building scalable web applications.",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 skills
    skill1 = await create_canonical_skill(name=f"SkillDash1-{uuid.uuid4().hex[:12]}")
    skill2 = await create_canonical_skill(name=f"SkillDash2-{uuid.uuid4().hex[:12]}")
    await async_client.post(
        "/api/v1/candidate/skills",
        json={"skill_id": str(skill1.id), "proficiency": "INTERMEDIATE", "years_experience": 2.0},
        headers=headers,
    )
    await async_client.post(
        "/api/v1/candidate/skills",
        json={"skill_id": str(skill2.id), "proficiency": "ADVANCED", "years_experience": 4.0},
        headers=headers,
    )

    # Add experience & education
    await async_client.post(
        "/api/v1/candidate/experience",
        json={"company": "CloudCorp", "title": "Staff Engineer", "is_current": True},
        headers=headers,
    )
    await async_client.post(
        "/api/v1/candidate/education",
        json={"institution": "Engineering College", "degree": "M.S. Computer Engineering"},
        headers=headers,
    )

    dash_res = await async_client.get("/api/v1/candidate/dashboard", headers=headers)
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert data["profile"]["full_name"] == "Dashboard Candidate"
    assert data["skills_count"] == 2
    assert data["skills_by_proficiency"]["INTERMEDIATE"] == 1
    assert data["skills_by_proficiency"]["ADVANCED"] == 1
    assert data["experience_count"] == 1
    assert data["education_count"] == 1
    assert len(data["recent_experiences"]) == 1
    assert data["highest_education"]["institution"] == "Engineering College"
    assert data["completeness"]["percentage"] >= 75


# ---------------------------------------------------------------------------
# 8. RBAC Endpoint Security Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_candidate_endpoint_rbac_restrictions(async_client: AsyncClient) -> None:
    """Employers and training providers cannot access private candidate endpoints."""
    emp_user, emp_token = await create_other_role_user(UserRole.EMPLOYER)
    tp_user, tp_token = await create_other_role_user(UserRole.TRAINING_PROVIDER)

    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    tp_headers = {"Authorization": f"Bearer {tp_token}"}

    for endpoint in [
        "/api/v1/candidate/profile",
        "/api/v1/candidate/skills",
        "/api/v1/candidate/education",
        "/api/v1/candidate/experience",
        "/api/v1/candidate/dashboard",
        "/api/v1/candidate/profile/completeness",
    ]:
        emp_res = await async_client.get(endpoint, headers=emp_headers)
        assert emp_res.status_code == 403, f"Expected 403 for EMPLOYER on {endpoint}"

        tp_res = await async_client.get(endpoint, headers=tp_headers)
        assert tp_res.status_code == 403, f"Expected 403 for TRAINING_PROVIDER on {endpoint}"

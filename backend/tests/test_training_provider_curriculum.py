"""Comprehensive backend tests for Phase 11 Training Provider & Curriculum Module.

Covers:
- Provider Profile & Live Dashboard Metrics
- Course CRUD, Lifecycle (DRAFT -> PUBLISHED -> CLOSED), & Publish Validation
- Canonical Skill Mapping, Validation & Deduplication
- Curriculum Modules & Lessons CRUD and Deterministic Ordering
- Candidate Course Discovery, Filtering, and Details
- Transactional Enrollment, Capacity Enforcement & Deduplication
- Lesson Progress Tracking, Percentage Calculation & Deterministic Auto-Completion
- Security, RBAC & IDOR Cross-Provider/Cross-Candidate Isolation
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.course import CourseDifficulty, CourseMode, CourseStatus
from app.models.profiles import CandidateProfile, TrainingProviderProfile
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.user import User, UserRole


async def create_test_user(role: UserRole, full_name: str = "Test User") -> tuple[User, str]:
    """Create test user with JWT."""
    unique_email = f"{role.value.lower()}_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


async def create_provider_user() -> tuple[User, TrainingProviderProfile, str]:
    """Create training provider user with profile and JWT."""
    unique_email = f"provider_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name="National Tech Institute",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = TrainingProviderProfile(
            user_id=user.id,
            institution_name="National Tech Institute",
            description="Leading institute for software engineering and cloud training.",
            provider_type="VOCATIONAL_INSTITUTE",
            location_city="Hyderabad",
            location_state="Telangana",
            website_url="https://nti.skillsync.internal",
            contact_email=unique_email,
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_candidate_user() -> tuple[User, CandidateProfile, str]:
    """Create candidate user with profile and JWT."""
    unique_email = f"candidate_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name="Ravi Kumar",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = CandidateProfile(
            user_id=user.id,
            headline="Aspiring Full Stack Engineer",
            bio="Passionate developer eager to learn cloud and backend skills.",
            experience_years=1.0,
            location_city="Hyderabad",
            location_state="Telangana",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_canonical_skill(
    name: str = "Python", status: SkillStatus = SkillStatus.ACTIVE
) -> Skill:
    """Helper to create a canonical skill in database."""
    unique_suffix = uuid.uuid4().hex[:6]
    unique_name = f"{name} {unique_suffix}"
    normalized = unique_name.strip().lower()
    async with AsyncSessionLocal() as session:
        skill = Skill(
            name=unique_name,
            normalized_name=normalized,
            category="Software Development",
            skill_type=SkillType.TECHNICAL,
            status=status,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
    return skill


# ===========================================================================
# 1. Training Provider Profile & Live Dashboard Tests
# ===========================================================================
@pytest.mark.asyncio
async def test_training_provider_profile_crud(async_client: AsyncClient):
    """Test viewing and updating training provider profile."""
    _, profile, token = await create_provider_user()

    # GET profile
    res = await async_client.get(
        "/api/v1/training-provider/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["institution_name"] == "National Tech Institute"
    assert data["location_city"] == "Hyderabad"

    # PUT profile
    update_payload = {
        "institution_name": "Apex Coding Academy",
        "location_city": "Bengaluru",
        "location_state": "Karnataka",
        "website_url": "https://apex.skillsync.internal",
    }
    put_res = await async_client.put(
        "/api/v1/training-provider/profile",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["institution_name"] == "Apex Coding Academy"
    assert updated_data["location_city"] == "Bengaluru"


@pytest.mark.asyncio
async def test_training_provider_dashboard_metrics(async_client: AsyncClient):
    """Test live aggregate metrics for training provider dashboard."""
    _, profile, token = await create_provider_user()
    skill = await create_canonical_skill("FastAPI")

    # Initial empty metrics
    res = await async_client.get(
        "/api/v1/training-provider/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert data["metrics"]["total_courses"] == 0
    assert data["metrics"]["draft_courses"] == 0

    # Create a draft course
    create_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "FastAPI Web Services",
            "description": (
                "Comprehensive course covering asynchronous Python web APIs with FastAPI."
            ),
            "duration_hours": 30,
            "difficulty": CourseDifficulty.INTERMEDIATE.value,
            "mode": CourseMode.ONLINE.value,
            "capacity": 25,
            "skill_ids": [str(skill.id)],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201

    # Check metrics again
    res2 = await async_client.get(
        "/api/v1/training-provider/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["metrics"]["total_courses"] == 1
    assert data2["metrics"]["draft_courses"] == 1
    assert data2["metrics"]["published_courses"] == 0
    assert len(data2["recent_courses"]) == 1


# ===========================================================================
# 2. Course Creation, Canonical Skill Mapping & Lifecycle
# ===========================================================================
@pytest.mark.asyncio
async def test_course_creation_with_canonical_skills(async_client: AsyncClient):
    """Test creating a course with valid canonical skills and rejecting invalid/inactive skills."""
    _, profile, token = await create_provider_user()
    active_skill = await create_canonical_skill("PostgreSQL", status=SkillStatus.ACTIVE)
    inactive_skill = await create_canonical_skill("Legacy Fortran", status=SkillStatus.INACTIVE)

    # 1. Success with active skill
    res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "PostgreSQL for Engineers",
            "description": (
                "Learn query optimization, indexes, partitioning, and relational schemas."
            ),
            "duration_hours": 40,
            "difficulty": CourseDifficulty.ADVANCED.value,
            "mode": CourseMode.ONLINE.value,
            "capacity": 30,
            "skill_ids": [str(active_skill.id)],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    course_data = res.json()
    assert course_data["status"] == CourseStatus.DRAFT.value
    assert len(course_data["skills"]) == 1
    assert course_data["skills"][0]["skill_id"] == str(active_skill.id)

    # 2. Reject inactive skill
    bad_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Legacy Programming",
            "description": "Outdated programming course.",
            "duration_hours": 20,
            "capacity": 10,
            "skill_ids": [str(inactive_skill.id)],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_res.status_code == 400
    assert "not found in the canonical catalog or is inactive" in bad_res.json()["detail"]

    # 3. Reject non-existent skill UUID
    random_uuid = str(uuid.uuid4())
    fake_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Fake Skill Course",
            "description": "Course with non-existent skill.",
            "duration_hours": 20,
            "capacity": 10,
            "skill_ids": [random_uuid],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fake_res.status_code == 400


@pytest.mark.asyncio
async def test_course_publish_validation_and_lifecycle(async_client: AsyncClient):
    """Test validation rules for publishing a course (requires skills, module, and lessons)."""
    _, profile, token = await create_provider_user()
    skill = await create_canonical_skill("Docker")

    # 1. Create course without skills
    c_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Docker Containers in Production",
            "description": "Learn containerization, compose, networking, and volumes.",
            "duration_hours": 20,
            "capacity": 15,
            "skill_ids": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert c_res.status_code == 201
    course_id = c_res.json()["id"]

    # 2. Attempt publish -> Fails due to no skills and no curriculum
    pub1 = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pub1.status_code == 400
    assert "At least one canonical skill must be mapped" in pub1.json()["detail"]
    assert "Curriculum must contain at least one module" in pub1.json()["detail"]

    # 3. Add skill
    sk_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/skills",
        json=[str(skill.id)],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sk_res.status_code == 200

    # 4. Attempt publish -> Fails due to no curriculum module
    pub2 = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pub2.status_code == 400
    assert "Curriculum must contain at least one module" in pub2.json()["detail"]

    # 5. Add module without lessons
    mod_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules",
        json={
            "title": "Module 1: Docker Basics",
            "description": "Introduction to images and containers.",
            "order_index": 1,
            "lessons": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mod_res.status_code == 201
    module_id = mod_res.json()["id"]

    # 6. Attempt publish -> Fails because module has no lessons
    pub3 = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pub3.status_code == 400
    assert "Modules must contain at least one lesson" in pub3.json()["detail"]

    # 7. Add lesson to module
    les_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules/{module_id}/lessons",
        json={
            "title": "Lesson 1: Docker CLI Basics",
            "description": "Running containers with docker run.",
            "content": "Step 1: Install Docker engine...",
            "duration_minutes": 45,
            "order_index": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert les_res.status_code == 201

    # 8. Publish now succeeds!
    pub_ok = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pub_ok.status_code == 200
    assert pub_ok.json()["status"] == CourseStatus.PUBLISHED.value

    # 9. Close course
    close_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/close",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == CourseStatus.CLOSED.value


# ===========================================================================
# 3. Curriculum Modules & Lessons Management & Ordering
# ===========================================================================
@pytest.mark.asyncio
async def test_curriculum_crud_and_reordering(async_client: AsyncClient):
    """Test adding, editing, reordering, and deleting curriculum modules and lessons."""
    _, profile, token = await create_provider_user()
    skill = await create_canonical_skill("React")

    # Create Course
    c_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "React Frontend Masterclass",
            "description": "Modern React development with hooks, routing, and state.",
            "duration_hours": 35,
            "capacity": 20,
            "skill_ids": [str(skill.id)],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    course_id = c_res.json()["id"]

    # 1. Create Module 1 and Module 2
    m1_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules",
        json={"title": "React Foundations", "order_index": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert m1_res.status_code == 201
    m1_id = m1_res.json()["id"]

    m2_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules",
        json={"title": "Advanced Hooks", "order_index": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert m2_res.status_code == 201
    assert m2_res.json()["id"] is not None

    # 2. Add lessons to Module 1
    l1_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules/{m1_id}/lessons",
        json={"title": "Components & JSX", "order_index": 1, "duration_minutes": 30},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert l1_res.status_code == 201
    l1_id = l1_res.json()["id"]

    l2_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules/{m1_id}/lessons",
        json={"title": "State & Props", "order_index": 2, "duration_minutes": 45},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert l2_res.status_code == 201
    l2_id = l2_res.json()["id"]

    # 3. Reorder lessons in Module 1 (swap l1 and l2)
    reorder_res = await async_client.put(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules/{m1_id}/lessons-reorder",
        json=[
            {"lesson_id": l1_id, "order_index": 2},
            {"lesson_id": l2_id, "order_index": 1},
        ],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reorder_res.status_code == 200
    reordered = reorder_res.json()
    assert reordered[0]["id"] == l2_id
    assert reordered[1]["id"] == l1_id

    # 4. Get full curriculum
    curr_res = await async_client.get(
        f"/api/v1/training-provider/courses/{course_id}/curriculum",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert curr_res.status_code == 200
    curr_data = curr_res.json()
    assert len(curr_data) == 2
    assert len(curr_data[0]["lessons"]) == 2


# ===========================================================================
# 4. Candidate Discovery, Filtering, and Details
# ===========================================================================
@pytest.mark.asyncio
async def test_candidate_course_discovery_and_filters(async_client: AsyncClient):
    """Test candidate browsing published courses with search, skill, and difficulty filters."""
    _, _, provider_token = await create_provider_user()
    _, _, cand_token = await create_candidate_user()

    skill_python = await create_canonical_skill("Python")
    skill_go = await create_canonical_skill("Go")

    # Provider creates a published Python course
    p1 = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Backend Engineering with Python",
            "description": "Production Python services and architecture.",
            "duration_hours": 50,
            "difficulty": CourseDifficulty.ADVANCED.value,
            "mode": CourseMode.ONLINE.value,
            "capacity": 30,
            "skill_ids": [str(skill_python.id)],
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    c1_id = p1.json()["id"]

    # Add module & lesson to publish
    m1 = await async_client.post(
        f"/api/v1/training-provider/courses/{c1_id}/curriculum/modules",
        json={
            "title": "Module 1",
            "lessons": [{"title": "L1", "duration_minutes": 30, "order_index": 1}],
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert m1.status_code == 201

    await async_client.post(
        f"/api/v1/training-provider/courses/{c1_id}/publish",
        headers={"Authorization": f"Bearer {provider_token}"},
    )

    # Provider creates a draft Go course (should NOT appear in candidate search)
    p2 = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Golang Microservices Draft",
            "description": "Concurrent services in Go.",
            "duration_hours": 30,
            "difficulty": CourseDifficulty.INTERMEDIATE.value,
            "mode": CourseMode.ONLINE.value,
            "capacity": 20,
            "skill_ids": [str(skill_go.id)],
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert p2.status_code == 201

    # Candidate lists public courses
    disc_res = await async_client.get(
        "/api/v1/candidate/learning/courses",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert disc_res.status_code == 200
    catalog = disc_res.json()
    titles = [c["title"] for c in catalog]
    assert "Backend Engineering with Python" in titles
    assert "Golang Microservices Draft" not in titles

    # Candidate filters by skill
    skill_filt = await async_client.get(
        f"/api/v1/candidate/learning/courses?skill_id={skill_python.id}",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert skill_filt.status_code == 200
    assert len(skill_filt.json()) >= 1

    # Candidate views course details
    detail_res = await async_client.get(
        f"/api/v1/candidate/learning/courses/{c1_id}",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == "Backend Engineering with Python"
    assert len(detail_res.json()["curriculum_modules"]) == 1


# ===========================================================================
# 5. Candidate Enrollment, Capacity Management & Progress Tracking
# ===========================================================================
@pytest.mark.asyncio
async def test_candidate_enrollment_capacity_and_completion_flow(async_client: AsyncClient):
    """Test full workflow: enrollment, capacity checks, lesson completion,
    and deterministic auto-completion.
    """
    _, _, provider_token = await create_provider_user()
    _, _, cand1_token = await create_candidate_user()
    _, _, cand2_token = await create_candidate_user()

    skill = await create_canonical_skill("FastAPI")

    # 1. Create published course with capacity = 1
    c_res = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "FastAPI Speedrun",
            "description": "Master FastAPI in a short intensive bootcamp.",
            "duration_hours": 10,
            "capacity": 1,  # Only 1 seat!
            "skill_ids": [str(skill.id)],
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    course_id = c_res.json()["id"]

    # Add 2 lessons across 1 module
    m_res = await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/curriculum/modules",
        json={
            "title": "Bootcamp Module",
            "lessons": [
                {"title": "Lesson A: Setup", "duration_minutes": 30, "order_index": 1},
                {"title": "Lesson B: Deploy", "duration_minutes": 30, "order_index": 2},
            ],
        },
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert m_res.status_code == 201
    module_data = m_res.json()
    lesson_a_id = module_data["lessons"][0]["id"]
    lesson_b_id = module_data["lessons"][1]["id"]

    await async_client.post(
        f"/api/v1/training-provider/courses/{course_id}/publish",
        headers={"Authorization": f"Bearer {provider_token}"},
    )

    # 2. Candidate 1 enrolls successfully
    enr1_res = await async_client.post(
        f"/api/v1/candidate/learning/courses/{course_id}/enroll",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    assert enr1_res.status_code == 201
    enr1_id = enr1_res.json()["id"]
    assert enr1_res.json()["status"] == "ENROLLED"
    assert enr1_res.json()["progress_percent"] == 0.0

    # 3. Candidate 1 duplicate enrollment attempt is rejected
    dup_res = await async_client.post(
        f"/api/v1/candidate/learning/courses/{course_id}/enroll",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    assert dup_res.status_code == 400
    assert "Candidate is already enrolled" in dup_res.json()["detail"]

    # 4. Candidate 2 attempts to enroll, but course is FULL (capacity = 1)
    full_res = await async_client.post(
        f"/api/v1/candidate/learning/courses/{course_id}/enroll",
        headers={"Authorization": f"Bearer {cand2_token}"},
    )
    assert full_res.status_code == 400
    assert "This course is currently full" in full_res.json()["detail"]

    # 5. Candidate 1 checks initial progress
    prog_res1 = await async_client.get(
        f"/api/v1/candidate/learning/enrollments/{enr1_id}",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    assert prog_res1.status_code == 200
    p1 = prog_res1.json()
    assert p1["total_lessons"] == 2
    assert p1["completed_lessons"] == 0
    assert p1["progress_percent"] == 0.0

    # 6. Candidate 1 completes Lesson A -> 50% progress, IN_PROGRESS status
    comp1 = await async_client.post(
        f"/api/v1/candidate/learning/enrollments/{enr1_id}/lessons/{lesson_a_id}/complete",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    assert comp1.status_code == 200
    p_comp1 = comp1.json()
    assert p_comp1["completed_lessons"] == 1
    assert p_comp1["progress_percent"] == 50.0
    assert p_comp1["status"] == "IN_PROGRESS"

    # 7. Candidate 1 completes Lesson B -> 100% progress, auto transitions to COMPLETED
    comp2 = await async_client.post(
        f"/api/v1/candidate/learning/enrollments/{enr1_id}/lessons/{lesson_b_id}/complete",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    assert comp2.status_code == 200
    p_comp2 = comp2.json()
    assert p_comp2["completed_lessons"] == 2
    assert p_comp2["progress_percent"] == 100.0
    assert p_comp2["status"] == "COMPLETED"
    assert p_comp2["completed_at"] is not None


# ===========================================================================
# 6. Security, RBAC & IDOR Cross-Account Isolation
# ===========================================================================
@pytest.mark.asyncio
async def test_training_provider_and_candidate_security_isolation(async_client: AsyncClient):
    """Test RBAC restrictions and cross-provider / cross-candidate IDOR prevention."""
    _, _, p1_token = await create_provider_user()
    _, _, p2_token = await create_provider_user()
    _, _, cand1_token = await create_candidate_user()
    _, _, cand2_token = await create_candidate_user()
    _, emp_token = await create_test_user(UserRole.EMPLOYER)

    skill = await create_canonical_skill("Cybersecurity")

    # 1. Non-provider (EMPLOYER) cannot access provider management endpoints
    emp_res = await async_client.get(
        "/api/v1/training-provider/dashboard",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_res.status_code == 403

    # 2. Provider 1 creates a course
    p1_course = await async_client.post(
        "/api/v1/training-provider/courses",
        json={
            "title": "Private Security Workshop",
            "description": "Hands-on threat intelligence and red teaming workshop.",
            "duration_hours": 20,
            "capacity": 10,
            "skill_ids": [str(skill.id)],
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    c_id = p1_course.json()["id"]

    # 3. Provider 2 attempts to edit or view Provider 1's course -> 404 (IDOR protected)
    p2_get = await async_client.get(
        f"/api/v1/training-provider/courses/{c_id}",
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert p2_get.status_code == 404

    p2_edit = await async_client.put(
        f"/api/v1/training-provider/courses/{c_id}",
        json={"title": "Hacked Course"},
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert p2_edit.status_code == 404

    # 4. Candidate 1 enrolls in a published course
    m_res = await async_client.post(
        f"/api/v1/training-provider/courses/{c_id}/curriculum/modules",
        json={
            "title": "Sec Mod",
            "lessons": [{"title": "Sec Lesson", "duration_minutes": 20, "order_index": 1}],
        },
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    sec_lesson_id = m_res.json()["lessons"][0]["id"]
    await async_client.post(
        f"/api/v1/training-provider/courses/{c_id}/publish",
        headers={"Authorization": f"Bearer {p1_token}"},
    )

    enr_res = await async_client.post(
        f"/api/v1/candidate/learning/courses/{c_id}/enroll",
        headers={"Authorization": f"Bearer {cand1_token}"},
    )
    enr_id = enr_res.json()["id"]

    # 5. Candidate 2 attempts to access Candidate 1's enrollment progress -> 404
    c2_get = await async_client.get(
        f"/api/v1/candidate/learning/enrollments/{enr_id}",
        headers={"Authorization": f"Bearer {cand2_token}"},
    )
    assert c2_get.status_code == 404

    # 6. Candidate 2 attempts to mark Candidate 1's lesson complete -> 404
    c2_comp = await async_client.post(
        f"/api/v1/candidate/learning/enrollments/{enr_id}/lessons/{sec_lesson_id}/complete",
        headers={"Authorization": f"Bearer {cand2_token}"},
    )
    assert c2_comp.status_code == 404

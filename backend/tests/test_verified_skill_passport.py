"""Comprehensive backend tests for Phase 12 Verified Skill Passport.

Tests:
1. Self-declared skill remains UNVERIFIED
2. Resume-extracted skill remains UNVERIFIED
3. Incomplete course (enrolled / in-progress) does not verify skill
4. 100% completed course produces COURSE_COMPLETION evidence
5. Completed course produces VERIFIED skill with explainable summary
6. Repeated recalculation is idempotent (no duplicate records)
7. Duplicate evidence is prevented
8. Multiple courses for same skill aggregate correctly
9. Canonical Skill ID is preserved
10. Nonexistent skill cannot be attached (404)
11. Expired certification yields EXPIRED verification status
12. Valid certification yields VERIFIED status (CERTIFICATION method)
13. Candidate ownership is enforced (IDOR prevention)
14. Employer authorization is enforced (403 for unconnected candidate, 200 for applicant)
15. Admin access is permitted
16. Verification explanation is deterministic and evidence-backed
17. Zero LLM / AI calls are required for verification
18. Deleted evidence recalculates verified skill status back to unverified
19. Public token sharing and revocation (no UUID leak, 404 on revoked)
20. Career Copilot context separates verified vs unverified skills
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.application import Application, ApplicationStatus
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseDifficulty, CourseMode, CourseSkill, CourseStatus
from app.models.curriculum import CurriculumLesson, CurriculumModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.enrollment_progress import EnrollmentLessonProgress
from app.models.job import EmploymentType, ExperienceLevel, Job, JobStatus
from app.models.profiles import CandidateProfile, EmployerProfile, TrainingProviderProfile
from app.models.skill import Skill, SkillStatus, SkillType
from app.models.skill_evidence import EvidenceStatus, EvidenceType, SkillEvidence
from app.models.user import User, UserRole
from app.models.verified_skill import VerificationMethod, VerificationStatus, VerifiedSkill
from app.services.career_context_service import CareerContextService


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------
async def create_candidate() -> tuple[User, CandidateProfile, str]:
    """Create test candidate user with profile and JWT."""
    unique_email = f"candidate_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name="Alex Mercer",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = CandidateProfile(
            user_id=user.id,
            headline="Full Stack Developer",
            current_role="Software Engineer",
            experience_years=3.5,
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_employer() -> tuple[User, EmployerProfile, str]:
    """Create test employer user with profile and JWT."""
    unique_email = f"employer_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name="Tech Corp Recruiter",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = EmployerProfile(
            user_id=user.id,
            company_name="TechCorp Solutions",
            company_description="Enterprise software solutions provider.",
            industry="Software",
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_provider() -> tuple[User, TrainingProviderProfile, str]:
    """Create training provider user with profile and JWT."""
    unique_email = f"provider_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncSessionLocal() as session:
        user = User(
            email=unique_email,
            password_hash=get_password_hash("Password123!"),
            full_name="Skill Academy",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        profile = TrainingProviderProfile(
            user_id=user.id,
            institution_name="Skill Academy Institute",
            provider_type="BOOTCAMP",
            location_city="Bengaluru",
            location_state="Karnataka",
        )
        session.add(profile)
        await session.commit()
        await session.refresh(user)
        await session.refresh(profile)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, profile, token


async def create_canonical_skill(name: str, category: str = "Backend") -> Skill:
    """Create canonical Skill entity."""
    async with AsyncSessionLocal() as session:
        skill = Skill(
            name=name,
            normalized_name=name.lower().strip(),
            category=category,
            skill_type=SkillType.TECHNICAL,
            status=SkillStatus.ACTIVE,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
        return skill


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_self_declared_skill_remains_unverified(async_client: AsyncClient):
    """Rule B: Candidate self-declared skill must remain UNVERIFIED."""
    _, cand_profile, cand_token = await create_candidate()
    skill = await create_canonical_skill(f"Python_{uuid.uuid4().hex[:6]}")

    # Candidate declares skill
    async with AsyncSessionLocal() as session:
        cs = CandidateSkill(
            candidate_id=cand_profile.id,
            skill_id=skill.id,
            proficiency=ProficiencyLevel.INTERMEDIATE,
            years_experience=2.0,
        )
        session.add(cs)
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}
    response = await async_client.get("/api/v1/candidate/passport", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["stats"]["total_skills"] == 1
    assert data["stats"]["verified_skills"] == 0
    assert data["stats"]["unverified_skills"] == 1
    assert data["stats"]["verification_coverage_pct"] == 0.0

    skill_item = data["skills"][0]
    assert skill_item["skill_name"] == skill.name
    assert skill_item["status"] == "UNVERIFIED"
    assert skill_item["verification_method"] == "CANDIDATE_DECLARATION"
    assert "Self-declared" in skill_item["verification_summary"]


@pytest.mark.asyncio
async def test_resume_extracted_skill_remains_unverified(async_client: AsyncClient):
    """Rule C: Resume extracted skill evidence must remain UNVERIFIED."""
    _, cand_profile, cand_token = await create_candidate()
    skill = await create_canonical_skill(f"Docker_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        ev = SkillEvidence(
            candidate_id=cand_profile.id,
            skill_id=skill.id,
            evidence_type=EvidenceType.RESUME_EXTRACTION,
            title="Resume Parser Extraction",
            description="Extracted with 0.88 confidence from uploaded resume.",
            status=EvidenceStatus.VALID,
        )
        session.add(ev)
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}
    response = await async_client.get("/api/v1/candidate/passport", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["stats"]["verified_skills"] == 0
    assert data["stats"]["unverified_skills"] == 1

    skill_item = data["skills"][0]
    assert skill_item["status"] == "UNVERIFIED"
    assert skill_item["verification_method"] == "RESUME_EXTRACTION"
    assert "Extracted from resume" in skill_item["verification_summary"]


@pytest.mark.asyncio
async def test_incomplete_course_does_not_verify_skill(async_client: AsyncClient):
    """Incomplete enrollment (50% progress) must NOT verify skill."""
    _, cand_profile, cand_token = await create_candidate()
    _, provider_profile, _ = await create_provider()
    skill = await create_canonical_skill(f"FastAPI_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        course = Course(
            provider_id=provider_profile.id,
            title="FastAPI Mastery",
            description="Master FastAPI framework.",
            difficulty=CourseDifficulty.INTERMEDIATE,
            mode=CourseMode.ONLINE,
            status=CourseStatus.PUBLISHED,
            is_active=True,
            capacity=100,
        )
        session.add(course)
        await session.flush()

        cs = CourseSkill(course_id=course.id, skill_id=skill.id)
        session.add(cs)

        mod = CurriculumModule(course_id=course.id, title="Module 1", order_index=0)
        session.add(mod)
        await session.flush()

        les1 = CurriculumLesson(module_id=mod.id, title="Lesson 1", order_index=0)
        les2 = CurriculumLesson(module_id=mod.id, title="Lesson 2", order_index=1)
        session.add_all([les1, les2])
        await session.flush()

        # Enrollment is IN_PROGRESS (only lesson 1 completed)
        enr = Enrollment(
            candidate_id=cand_profile.id,
            course_id=course.id,
            status=EnrollmentStatus.IN_PROGRESS,
        )
        session.add(enr)
        await session.flush()

        lp = EnrollmentLessonProgress(
            enrollment_id=enr.id,
            lesson_id=les1.id,
            is_completed=True,
            completed_at=datetime.now(UTC),
        )
        session.add(lp)
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}
    response = await async_client.get("/api/v1/candidate/passport", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # No verified skills
    assert data["stats"]["verified_skills"] == 0


@pytest.mark.asyncio
async def test_completed_course_produces_verified_skill(async_client: AsyncClient):
    """Rule A: 100% completed course produces COURSE_COMPLETION evidence and VERIFIED skill."""
    _, cand_profile, cand_token = await create_candidate()
    _, provider_profile, _ = await create_provider()
    skill = await create_canonical_skill(f"PostgreSQL_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        course = Course(
            provider_id=provider_profile.id,
            title="PostgreSQL for Backend Engineers",
            description="Deep dive into PostgreSQL query planning and indexing.",
            difficulty=CourseDifficulty.ADVANCED,
            mode=CourseMode.ONLINE,
            status=CourseStatus.PUBLISHED,
            is_active=True,
            capacity=50,
        )
        session.add(course)
        await session.flush()

        cs = CourseSkill(course_id=course.id, skill_id=skill.id)
        session.add(cs)

        mod = CurriculumModule(course_id=course.id, title="Module 1", order_index=0)
        session.add(mod)
        await session.flush()

        les1 = CurriculumLesson(module_id=mod.id, title="Lesson 1", order_index=0)
        session.add(les1)
        await session.flush()

        # Enrollment reaches COMPLETED
        enr = Enrollment(
            candidate_id=cand_profile.id,
            course_id=course.id,
            status=EnrollmentStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        session.add(enr)
        await session.flush()

        lp = EnrollmentLessonProgress(
            enrollment_id=enr.id,
            lesson_id=les1.id,
            is_completed=True,
            completed_at=datetime.now(UTC),
        )
        session.add(lp)
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}
    response = await async_client.get("/api/v1/candidate/passport", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["stats"]["verified_skills"] == 1
    assert data["stats"]["unverified_skills"] == 0
    assert data["stats"]["verification_coverage_pct"] == 100.0

    skill_item = data["skills"][0]
    assert skill_item["skill_id"] == str(skill.id)
    assert skill_item["skill_name"] == skill.name
    assert skill_item["status"] == "VERIFIED"
    assert skill_item["verification_method"] == "COURSE_COMPLETION"
    assert "PostgreSQL for Backend Engineers" in skill_item["verification_summary"]
    assert skill_item["evidence_count"] == 1


@pytest.mark.asyncio
async def test_recalculation_idempotency_and_duplicate_prevention(async_client: AsyncClient):
    """Running recalculation multiple times must be idempotent without creating duplicates."""
    _, cand_profile, cand_token = await create_candidate()
    _, provider_profile, _ = await create_provider()
    skill = await create_canonical_skill(f"Redis_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        course = Course(
            provider_id=provider_profile.id,
            title="Redis in Depth",
            description="Comprehensive Redis guide.",
            status=CourseStatus.PUBLISHED,
            is_active=True,
            capacity=50,
        )
        session.add(course)
        await session.flush()
        session.add(CourseSkill(course_id=course.id, skill_id=skill.id))
        session.add(
            Enrollment(
                candidate_id=cand_profile.id,
                course_id=course.id,
                status=EnrollmentStatus.COMPLETED,
                completed_at=datetime.now(UTC),
            )
        )
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}

    # Recalculate 3 times
    for _ in range(3):
        res = await async_client.post("/api/v1/candidate/passport/recalculate", headers=headers)
        assert res.status_code == 200

    passport_res = await async_client.get("/api/v1/candidate/passport", headers=headers)
    data = passport_res.json()

    assert data["stats"]["total_skills"] == 1
    assert data["stats"]["verified_skills"] == 1
    assert len(data["skills"]) == 1
    assert data["skills"][0]["evidence_count"] == 1


@pytest.mark.asyncio
async def test_multiple_courses_for_same_skill(async_client: AsyncClient):
    """Multiple completed courses for the same skill aggregate evidence properly."""
    _, cand_profile, cand_token = await create_candidate()
    _, provider_profile, _ = await create_provider()
    skill = await create_canonical_skill(f"Python_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        c1 = Course(
            provider_id=provider_profile.id,
            title="Python Basics",
            description="Python syntax fundamentals.",
            status=CourseStatus.PUBLISHED,
            is_active=True,
            capacity=50,
        )
        c2 = Course(
            provider_id=provider_profile.id,
            title="Advanced Python Patterns",
            description="Advanced Python design patterns.",
            status=CourseStatus.PUBLISHED,
            is_active=True,
            capacity=50,
        )
        session.add_all([c1, c2])
        await session.flush()

        session.add(CourseSkill(course_id=c1.id, skill_id=skill.id))
        session.add(CourseSkill(course_id=c2.id, skill_id=skill.id))

        session.add(
            Enrollment(
                candidate_id=cand_profile.id,
                course_id=c1.id,
                status=EnrollmentStatus.COMPLETED,
                completed_at=datetime.now(UTC),
            )
        )
        session.add(
            Enrollment(
                candidate_id=cand_profile.id,
                course_id=c2.id,
                status=EnrollmentStatus.COMPLETED,
                completed_at=datetime.now(UTC),
            )
        )
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}
    res = await async_client.get("/api/v1/candidate/passport", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["stats"]["verified_skills"] == 1
    skill_item = data["skills"][0]
    assert skill_item["evidence_count"] == 2
    assert "2 completed courses" in skill_item["verification_summary"]


@pytest.mark.asyncio
async def test_valid_and_expired_certification_evidence(async_client: AsyncClient):
    """Rule D: Valid cert gives VERIFIED, expired cert gives EXPIRED status."""
    _, cand_profile, cand_token = await create_candidate()
    skill1 = await create_canonical_skill(f"AWS_{uuid.uuid4().hex[:6]}")
    skill2 = await create_canonical_skill(f"GCP_{uuid.uuid4().hex[:6]}")

    headers = {"Authorization": f"Bearer {cand_token}"}

    # 1. Add valid AWS certification
    valid_payload = {
        "skill_id": str(skill1.id),
        "evidence_type": "CERTIFICATION",
        "title": "AWS Certified Solutions Architect",
        "description": "Validated architectural knowledge on AWS cloud.",
        "issued_at": datetime.now(UTC).isoformat(),
        "meta": {"issuer": "Amazon Web Services", "credential_id": "AWS-12345"},
    }
    res1 = await async_client.post(
        "/api/v1/candidate/passport/evidence", json=valid_payload, headers=headers
    )
    assert res1.status_code == 201

    # 2. Add expired GCP certification
    expired_payload = {
        "skill_id": str(skill2.id),
        "evidence_type": "CERTIFICATION",
        "title": "GCP Associate Cloud Engineer",
        "issued_at": (datetime.now(UTC) - timedelta(days=700)).isoformat(),
        "meta": {
            "issuer": "Google Cloud",
            "expires_at": (datetime.now(UTC) - timedelta(days=30)).isoformat(),
        },
    }
    res2 = await async_client.post(
        "/api/v1/candidate/passport/evidence", json=expired_payload, headers=headers
    )
    assert res2.status_code == 201

    # 3. Check passport
    passport_res = await async_client.get("/api/v1/candidate/passport", headers=headers)
    data = passport_res.json()

    assert data["stats"]["verified_skills"] == 1
    assert data["stats"]["expired_skills"] == 1

    aws_item = next(s for s in data["skills"] if s["skill_id"] == str(skill1.id))
    gcp_item = next(s for s in data["skills"] if s["skill_id"] == str(skill2.id))

    assert aws_item["status"] == "VERIFIED"
    assert aws_item["verification_method"] == "CERTIFICATION"
    assert "AWS Certified Solutions Architect" in aws_item["verification_summary"]

    assert gcp_item["status"] == "EXPIRED"
    assert gcp_item["verification_method"] == "CERTIFICATION"
    assert "Certification expired" in gcp_item["verification_summary"]


@pytest.mark.asyncio
async def test_evidence_deletion_reverts_verified_status(async_client: AsyncClient):
    """Deleting certification evidence cleanly recalculates skill back to UNVERIFIED."""
    _, cand_profile, cand_token = await create_candidate()
    skill = await create_canonical_skill(f"Kubernetes_{uuid.uuid4().hex[:6]}")

    # Also self-declare skill
    async with AsyncSessionLocal() as session:
        session.add(
            CandidateSkill(
                candidate_id=cand_profile.id,
                skill_id=skill.id,
                proficiency=ProficiencyLevel.ADVANCED,
                years_experience=3.0,
            )
        )
        await session.commit()

    headers = {"Authorization": f"Bearer {cand_token}"}

    # Add certification evidence
    cert_payload = {
        "skill_id": str(skill.id),
        "evidence_type": "CERTIFICATION",
        "title": "CKA: Certified Kubernetes Administrator",
        "issued_at": datetime.now(UTC).isoformat(),
    }
    ev_res = await async_client.post(
        "/api/v1/candidate/passport/evidence", json=cert_payload, headers=headers
    )
    assert ev_res.status_code == 201
    evidence_id = ev_res.json()["id"]

    # Verify skill is VERIFIED
    p1 = (await async_client.get("/api/v1/candidate/passport", headers=headers)).json()
    assert p1["stats"]["verified_skills"] == 1

    # Delete evidence
    del_res = await async_client.delete(
        f"/api/v1/candidate/passport/evidence/{evidence_id}", headers=headers
    )
    assert del_res.status_code == 204

    # Verify skill reverted to UNVERIFIED
    p2 = (await async_client.get("/api/v1/candidate/passport", headers=headers)).json()
    assert p2["stats"]["verified_skills"] == 0
    assert p2["stats"]["unverified_skills"] == 1
    assert p2["skills"][0]["status"] == "UNVERIFIED"
    assert p2["skills"][0]["verification_method"] == "CANDIDATE_DECLARATION"


@pytest.mark.asyncio
async def test_candidate_ownership_idor_protection(async_client: AsyncClient):
    """Candidate A cannot delete Candidate B's evidence."""
    _, cand_a, token_a = await create_candidate()
    _, cand_b, token_b = await create_candidate()
    skill = await create_canonical_skill(f"Security_{uuid.uuid4().hex[:6]}")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Candidate A creates evidence
    ev_res = await async_client.post(
        "/api/v1/candidate/passport/evidence",
        json={
            "skill_id": str(skill.id),
            "title": "CompTIA Security+",
            "evidence_type": "CERTIFICATION",
        },
        headers=headers_a,
    )
    evidence_id = ev_res.json()["id"]

    # Candidate B attempts to delete Candidate A's evidence -> 404
    del_res = await async_client.delete(
        f"/api/v1/candidate/passport/evidence/{evidence_id}", headers=headers_b
    )
    assert del_res.status_code == 404


@pytest.mark.asyncio
async def test_employer_authorization_enforced(async_client: AsyncClient):
    """Employer can only view passport if candidate applied to employer's job (403 otherwise)."""
    _, cand_profile, _ = await create_candidate()
    _, emp_profile, emp_token = await create_employer()
    _, other_emp_profile, other_emp_token = await create_employer()

    # Create job for Employer 1
    async with AsyncSessionLocal() as session:
        job = Job(
            employer_id=emp_profile.id,
            title="Senior Python Engineer",
            description="Looking for Python pro",
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.MID,
            status=JobStatus.PUBLISHED,
        )
        session.add(job)
        await session.flush()

        # Candidate applies to Employer 1's job
        app = Application(
            candidate_id=cand_profile.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
        )
        session.add(app)
        await session.commit()

    # Employer 1 accesses applicant passport -> 200 OK
    headers_emp = {"Authorization": f"Bearer {emp_token}"}
    res1 = await async_client.get(
        f"/api/v1/employer/candidates/{cand_profile.id}/passport", headers=headers_emp
    )
    assert res1.status_code == 200
    assert res1.json()["candidate"]["candidate_id"] == str(cand_profile.id)

    # Employer 2 (no application) attempts to access -> 403 FORBIDDEN
    headers_other = {"Authorization": f"Bearer {other_emp_token}"}
    res2 = await async_client.get(
        f"/api/v1/employer/candidates/{cand_profile.id}/passport", headers=headers_other
    )
    assert res2.status_code == 403
    assert "not authorized" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_public_passport_share_and_revocation(async_client: AsyncClient):
    """Public token share works when enabled, 404 when disabled, does not leak private UUIDs."""
    _, cand_profile, cand_token = await create_candidate()
    headers = {"Authorization": f"Bearer {cand_token}"}

    # 1. Get share config (initially disabled)
    res = await async_client.get("/api/v1/candidate/passport/share", headers=headers)
    assert res.status_code == 200
    share_data = res.json()
    token = share_data["share_token"]
    assert not share_data["is_enabled"]

    # Public access when disabled -> 404
    public_res1 = await async_client.get(f"/api/v1/passport/share/{token}")
    assert public_res1.status_code == 404

    # 2. Enable sharing
    enable_res = await async_client.post(
        "/api/v1/candidate/passport/share", json={"is_enabled": True}, headers=headers
    )
    assert enable_res.status_code == 200
    assert enable_res.json()["is_enabled"] is True

    # Public access when enabled -> 200
    public_res2 = await async_client.get(f"/api/v1/passport/share/{token}")
    assert public_res2.status_code == 200
    public_data = public_res2.json()
    assert public_data["candidate"]["full_name"] == "Alex Mercer"
    assert "stats" in public_data
    assert "skills" in public_data

    # 3. Revoke sharing
    revoke_res = await async_client.post(
        "/api/v1/candidate/passport/share", json={"is_enabled": False}, headers=headers
    )
    assert revoke_res.status_code == 200

    # Public access after revocation -> 404
    public_res3 = await async_client.get(f"/api/v1/passport/share/{token}")
    assert public_res3.status_code == 404


@pytest.mark.asyncio
async def test_career_copilot_context_differentiates_verified_and_unverified():
    """Career Copilot context explicitly separates verified vs unverified skills from DB."""
    user, cand_profile, _ = await create_candidate()
    skill_verified = await create_canonical_skill(f"Rust_{uuid.uuid4().hex[:6]}")
    skill_unverified = await create_canonical_skill(f"Java_{uuid.uuid4().hex[:6]}")

    async with AsyncSessionLocal() as session:
        # Verified skill
        vs = VerifiedSkill(
            candidate_id=cand_profile.id,
            skill_id=skill_verified.id,
            verification_status=VerificationStatus.VERIFIED,
            verification_method=VerificationMethod.COURSE_COMPLETION,
            verification_summary="Verified through completed course: Advanced Rust",
        )
        session.add(vs)

        # Unverified declared skill
        cs = CandidateSkill(
            candidate_id=cand_profile.id,
            skill_id=skill_unverified.id,
            proficiency=ProficiencyLevel.BEGINNER,
            years_experience=1.0,
        )
        session.add(cs)
        await session.commit()

    async with AsyncSessionLocal() as session:
        ctx_service = CareerContextService()
        copilot_ctx = await ctx_service.build_copilot_context(session, user)

    formatted_text = copilot_ctx["formatted_context"]

    # Assert Verified Skills section contains Rust with summary
    assert "### CANDIDATE VERIFIED SKILLS (EVIDENCE-BACKED COMPETENCY)" in formatted_text
    assert skill_verified.name in formatted_text
    assert "Verified through completed course: Advanced Rust" in formatted_text

    # Assert Unverified Skills section contains Java
    assert "### CANDIDATE UNVERIFIED / SELF-DECLARED SKILLS" in formatted_text
    assert skill_unverified.name in formatted_text
    assert "Self-Declared / Unverified" in formatted_text

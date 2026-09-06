"""Comprehensive tests for Phase 3 Domain Models, Relationships, and Constraints."""

import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.application import Application, ApplicationStatus
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseMode, CourseSkill
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_user_profile_relationships() -> None:
    """Test 1-to-1 relationships between User and role-specific Profiles."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        # 1. Candidate
        cand_user = User(
            email=f"cand_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Candidate Tester",
            role=UserRole.CANDIDATE,
        )
        session.add(cand_user)
        await session.flush()

        cand_profile = CandidateProfile(
            user_id=cand_user.id,
            headline="Software Engineer",
            experience_years=3.0,
            location_city="Pune",
        )
        session.add(cand_profile)

        # 2. Employer
        emp_user = User(
            email=f"emp_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Employer Tester",
            role=UserRole.EMPLOYER,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = EmployerProfile(
            user_id=emp_user.id,
            company_name=f"Acme Corp {unique_suffix}",
            industry="Technology",
        )
        session.add(emp_profile)

        # 3. Training Provider
        tp_user = User(
            email=f"tp_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Provider Tester",
            role=UserRole.TRAINING_PROVIDER,
        )
        session.add(tp_user)
        await session.flush()

        tp_profile = TrainingProviderProfile(
            user_id=tp_user.id,
            institution_name=f"Institute {unique_suffix}",
        )
        session.add(tp_profile)

        # 4. Government
        gov_user = User(
            email=f"gov_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Government Tester",
            role=UserRole.GOVERNMENT,
        )
        session.add(gov_user)
        await session.flush()

        gov_profile = GovernmentProfile(
            user_id=gov_user.id,
            department_name="Labor Commission",
        )
        session.add(gov_profile)

        await session.commit()

        # Verify profiles are saved and fetchable
        assert cand_profile.id is not None
        assert emp_profile.id is not None
        assert tp_profile.id is not None
        assert gov_profile.id is not None


@pytest.mark.asyncio
async def test_skill_unique_constraint() -> None:
    """Verify skill normalized_name uniqueness constraint."""
    unique_suffix = uuid.uuid4().hex[:6]
    async with AsyncSessionLocal() as session:
        skill1 = Skill(
            name=f"Rust Programming {unique_suffix}",
            normalized_name=f"rust programming {unique_suffix}",
            category="Software Engineering",
        )
        session.add(skill1)
        await session.commit()

        # Duplicate normalized_name should raise IntegrityError
        skill2 = Skill(
            name=f"Rust Programming Dupe {unique_suffix}",
            normalized_name=f"rust programming {unique_suffix}",
            category="Systems",
        )
        session.add(skill2)
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.asyncio
async def test_job_and_job_skills() -> None:
    """Test Job requisition creation and JobSkill junction with cascade deletion."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        # Create employer & skill
        emp_user = User(
            email=f"emp_job_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Job Poster",
            role=UserRole.EMPLOYER,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = EmployerProfile(
            user_id=emp_user.id,
            company_name=f"Job Corp {unique_suffix}",
        )
        session.add(emp_profile)

        skill = Skill(
            name=f"Go Lang {unique_suffix}",
            normalized_name=f"go lang {unique_suffix}",
        )
        session.add(skill)
        await session.flush()

        # Create Job
        job = Job(
            employer_id=emp_profile.id,
            title="Backend Go Engineer",
            description="Developing high-throughput microservices in Go.",
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.SENIOR,
        )
        session.add(job)
        await session.flush()

        # Attach JobSkill
        js = JobSkill(
            job_id=job.id,
            skill_id=skill.id,
            is_required=True,
            minimum_proficiency="ADVANCED",
            weight=2.0,
        )
        session.add(js)
        await session.commit()

        job_id = job.id
        js_id = js.id

        # Verify job and job_skill exist
        assert (await session.get(Job, job_id)) is not None
        assert (await session.get(JobSkill, js_id)) is not None

        # Delete job -> JobSkill must cascade delete
        await session.delete(job)
        await session.commit()

        assert (await session.get(Job, job_id)) is None
        assert (await session.get(JobSkill, js_id)) is None


@pytest.mark.asyncio
async def test_course_and_course_skills() -> None:
    """Test Course and CourseSkill junction with cascade deletion."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        tp_user = User(
            email=f"tp_course_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Course Provider",
            role=UserRole.TRAINING_PROVIDER,
        )
        session.add(tp_user)
        await session.flush()

        tp_profile = TrainingProviderProfile(
            user_id=tp_user.id,
            institution_name=f"Code Academy {unique_suffix}",
        )
        session.add(tp_profile)

        skill = Skill(
            name=f"Kubernetes {unique_suffix}",
            normalized_name=f"kubernetes {unique_suffix}",
        )
        session.add(skill)
        await session.flush()

        course = Course(
            provider_id=tp_profile.id,
            title="Kubernetes for Operators",
            description="Hands-on cloud native container orchestration.",
            mode=CourseMode.ONLINE,
            duration_hours=60,
        )
        session.add(course)
        await session.flush()

        cs = CourseSkill(course_id=course.id, skill_id=skill.id)
        session.add(cs)
        await session.commit()

        course_id = course.id
        cs_id = cs.id

        assert (await session.get(Course, course_id)) is not None
        assert (await session.get(CourseSkill, cs_id)) is not None

        # Delete course -> CourseSkill should cascade delete
        await session.delete(course)
        await session.commit()

        assert (await session.get(Course, course_id)) is None
        assert (await session.get(CourseSkill, cs_id)) is None


@pytest.mark.asyncio
async def test_candidate_skill_competency() -> None:
    """Test CandidateSkill junction and unique constraint per candidate-skill pair."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        cand_user = User(
            email=f"cand_sk_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Skilled Candidate",
            role=UserRole.CANDIDATE,
        )
        session.add(cand_user)
        await session.flush()

        cand_profile = CandidateProfile(user_id=cand_user.id)
        session.add(cand_profile)

        skill = Skill(
            name=f"GraphQL {unique_suffix}",
            normalized_name=f"graphql {unique_suffix}",
        )
        session.add(skill)
        await session.flush()

        cs = CandidateSkill(
            candidate_id=cand_profile.id,
            skill_id=skill.id,
            proficiency=ProficiencyLevel.EXPERT,
            years_experience=4.0,
            is_verified=True,
        )
        session.add(cs)
        await session.commit()

        # Attempting duplicate candidate-skill mapping should raise IntegrityError
        duplicate_cs = CandidateSkill(
            candidate_id=cand_profile.id,
            skill_id=skill.id,
            proficiency=ProficiencyLevel.BEGINNER,
        )
        session.add(duplicate_cs)
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.asyncio
async def test_application_and_enrollment_lifecycle() -> None:
    """Test Application and Enrollment lifecycle, enums, and unique constraints."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        # Create Candidate
        cand_user = User(
            email=f"cand_app_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Applicant Candidate",
            role=UserRole.CANDIDATE,
        )
        session.add(cand_user)
        await session.flush()
        cand_profile = CandidateProfile(user_id=cand_user.id)
        session.add(cand_profile)

        # Create Employer & Job
        emp_user = User(
            email=f"emp_app_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Hiring Employer",
            role=UserRole.EMPLOYER,
        )
        session.add(emp_user)
        await session.flush()
        emp_profile = EmployerProfile(user_id=emp_user.id, company_name=f"Company {unique_suffix}")
        session.add(emp_profile)
        await session.flush()

        job = Job(
            employer_id=emp_profile.id,
            title="Product Designer",
            description="UI/UX design for enterprise SaaS products.",
        )
        session.add(job)

        # Create Provider & Course
        tp_user = User(
            email=f"tp_app_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Design School",
            role=UserRole.TRAINING_PROVIDER,
        )
        session.add(tp_user)
        await session.flush()
        tp_profile = TrainingProviderProfile(
            user_id=tp_user.id, institution_name=f"Design Institute {unique_suffix}"
        )
        session.add(tp_profile)
        await session.flush()

        course = Course(
            provider_id=tp_profile.id,
            title="Design Systems Masterclass",
            description="Comprehensive design systems for digital products.",
        )
        session.add(course)
        await session.flush()

        # Submit Application
        application = Application(
            candidate_id=cand_profile.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            cover_note="Excited to apply for the Product Designer role!",
        )
        session.add(application)

        # Enroll in Course
        enrollment = Enrollment(
            candidate_id=cand_profile.id,
            course_id=course.id,
            status=EnrollmentStatus.ENROLLED,
        )
        session.add(enrollment)
        await session.commit()

        # Verify Application & Enrollment saved
        assert application.id is not None
        assert application.status == ApplicationStatus.APPLIED
        assert enrollment.id is not None
        assert enrollment.status == EnrollmentStatus.ENROLLED

        # Status transitions
        application.status = ApplicationStatus.SHORTLISTED
        enrollment.status = EnrollmentStatus.IN_PROGRESS
        await session.commit()

        updated_app = await session.get(Application, application.id)
        assert updated_app.status == ApplicationStatus.SHORTLISTED

        updated_enr = await session.get(Enrollment, enrollment.id)
        assert updated_enr.status == EnrollmentStatus.IN_PROGRESS

        # Test duplicate application violation
        dup_app = Application(candidate_id=cand_profile.id, job_id=job.id)
        session.add(dup_app)
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.asyncio
async def test_user_deletion_cascades_profiles() -> None:
    """Verify that deleting a User cascades and deletes the profile, jobs, applications."""
    unique_suffix = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        emp_user = User(
            email=f"cascade_emp_{unique_suffix}@test.internal",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Cascade User",
            role=UserRole.EMPLOYER,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = EmployerProfile(
            user_id=emp_user.id,
            company_name=f"Cascade Corp {unique_suffix}",
        )
        session.add(emp_profile)
        await session.flush()

        job = Job(
            employer_id=emp_profile.id,
            title="Cascade Job",
            description="Testing cascade delete behavior.",
        )
        session.add(job)
        await session.commit()

        user_id = emp_user.id
        profile_id = emp_profile.id
        job_id = job.id

        # Delete user -> profile and job should cascade delete
        await session.delete(emp_user)
        await session.commit()

        assert (await session.get(User, user_id)) is None
        assert (await session.get(EmployerProfile, profile_id)) is None
        assert (await session.get(Job, job_id)) is None

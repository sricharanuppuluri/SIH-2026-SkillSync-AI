"""Safe, deterministic, idempotent database seed script for development and SIH live demos.

Seeds canonical skill taxonomies, multi-role user fixtures (Admin, Candidate,
Employer, Training Provider, Government), jobs, courses, enrollments,
verified skill passports, active skill contracts, and placement outcome records.

Usage:
    uv run python -m app.db.seed
"""

import asyncio
import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.application import Application, ApplicationStatus
from app.models.candidate_education import CandidateEducation
from app.models.candidate_experience import CandidateExperience
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseMode, CourseSkill, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill
from app.models.outcome import (
    PlacementOutcome,
    PlacementTrainingAttribution,
    PPITier,
    ProviderPerformanceSnapshot,
    RetentionStatus,
)
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill
from app.models.skill_contract import (
    ContractEvidenceType,
    ContractRequirementImportance,
    ContractRequirementType,
    ContractStatus,
    SkillContract,
    SkillContractRequirement,
)
from app.models.user import User, UserRole
from app.models.verified_skill import VerificationMethod, VerifiedSkill
from app.services.skill_seed_service import seed_canonical_skills

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


async def seed_demo_ecosystem(session: AsyncSession) -> dict[str, int]:
    """Seed comprehensive, deterministic, idempotent demonstration records."""
    logger.info("[*] Starting deterministic SIH demo ecosystem seeding...")

    # 1. Seed Canonical Skills Taxonomy
    seed_stats = await seed_canonical_skills(session)
    logger.info(
        "[*] Canonical skills ready: %d skills, %d aliases, %d relationships.",
        seed_stats["skills_created"],
        seed_stats["aliases_created"],
        seed_stats["relationships_created"],
    )

    # Fetch skill references
    skill_stmt = select(Skill)
    all_skills = (await session.execute(skill_stmt)).scalars().all()
    skill_map: dict[str, Skill] = {s.normalized_name: s for s in all_skills}
    python_skill = skill_map.get("python") or all_skills[0]
    fastapi_skill = skill_map.get("fastapi") or all_skills[1]
    react_skill = skill_map.get("react") or all_skills[2]
    pg_skill = skill_map.get("postgresql") or all_skills[4]

    default_pw_hash = get_password_hash("DevPassword123!")
    now = datetime.now(UTC)

    # 2. Seed Admin User
    admin_user = (
        await session.execute(select(User).where(User.email == "admin@skillsync.internal"))
    ).scalar_one_or_none()
    if not admin_user:
        admin_user = User(
            email="admin@skillsync.internal",
            password_hash=default_pw_hash,
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        await session.flush()
        logger.info("Created Admin User: %s", admin_user.email)

    # 3. Seed Training Provider User & Curriculum
    tp_user = (
        await session.execute(select(User).where(User.email == "dev.provider@skillsync.internal"))
    ).scalar_one_or_none()
    if not tp_user:
        tp_user = User(
            email="dev.provider@skillsync.internal",
            password_hash=default_pw_hash,
            full_name="Dr. Vikram Rao",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        session.add(tp_user)
        await session.flush()

    tp_profile = (
        await session.execute(
            select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == tp_user.id)
        )
    ).scalar_one_or_none()
    if not tp_profile:
        tp_profile = TrainingProviderProfile(
            user_id=tp_user.id,
            institution_name="National Skills Academy",
            provider_type="Vocational Training Center",
            location_city="Bengaluru",
            location_state="Karnataka",
            website_url="https://nsa.example.org",
            contact_email="contact@nsa.example.org",
            accreditation_details="NSDC Accredited Tier-1 Training Partner",
        )
        session.add(tp_profile)
        await session.flush()

    # Seed Provider Courses
    course = (
        await session.execute(
            select(Course).where(
                Course.provider_id == tp_profile.id,
                Course.title == "Full Stack Python & AI Cloud Engineering Bootcamp",
            )
        )
    ).scalar_one_or_none()
    if not course:
        course = Course(
            provider_id=tp_profile.id,
            title="Full Stack Python & AI Cloud Engineering Bootcamp",
            description=(
                "Comprehensive 16-week vocational curriculum covering "
                "modern Python, FastAPI, PostgreSQL, and React."
            ),
            duration_hours=160,
            mode=CourseMode.HYBRID,
            status=CourseStatus.PUBLISHED,
            capacity=100,
            location_city="Bengaluru",
            is_active=True,
        )
        session.add(course)
        await session.flush()

        session.add(CourseSkill(course_id=course.id, skill_id=python_skill.id))
        session.add(CourseSkill(course_id=course.id, skill_id=fastapi_skill.id))
        session.add(CourseSkill(course_id=course.id, skill_id=pg_skill.id))
        session.add(CourseSkill(course_id=course.id, skill_id=react_skill.id))
        await session.flush()

    # 4. Seed Employer User, Profile, Job Requisition & Skill Contract
    emp_user = (
        await session.execute(select(User).where(User.email == "dev.employer@skillsync.internal"))
    ).scalar_one_or_none()
    if not emp_user:
        emp_user = User(
            email="dev.employer@skillsync.internal",
            password_hash=default_pw_hash,
            full_name="Priya Patel",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        session.add(emp_user)
        await session.flush()

    emp_profile = (
        await session.execute(select(EmployerProfile).where(EmployerProfile.user_id == emp_user.id))
    ).scalar_one_or_none()
    if not emp_profile:
        emp_profile = EmployerProfile(
            user_id=emp_user.id,
            company_name="Apex Tech Solutions",
            company_description="Leading provider of cloud & AI software products.",
            industry="Information Technology",
            location_city="Bengaluru",
            location_state="Karnataka",
            website_url="https://apextech.example.com",
            contact_email="hiring@apextech.example.com",
            company_size="50-200",
        )
        session.add(emp_profile)
        await session.flush()

    job = (
        await session.execute(
            select(Job).where(
                Job.employer_id == emp_profile.id,
                Job.title == "Junior Backend & Cloud Engineer (Python/FastAPI)",
            )
        )
    ).scalar_one_or_none()
    if not job:
        job = Job(
            employer_id=emp_profile.id,
            title="Junior Backend & Cloud Engineer (Python/FastAPI)",
            description=(
                "Seeking a motivated engineer to build scalable microservices "
                "using Python, FastAPI, and PostgreSQL."
            ),
            location_city="Bengaluru",
            location_state="Karnataka",
            is_remote=True,
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.ENTRY,
            salary_min=700000.0,
            salary_max=1000000.0,
            is_active=True,
        )
        session.add(job)
        await session.flush()

        session.add(
            JobSkill(
                job_id=job.id,
                skill_id=python_skill.id,
                is_required=True,
                minimum_proficiency="INTERMEDIATE",
                weight=2.0,
            )
        )
        session.add(
            JobSkill(
                job_id=job.id,
                skill_id=fastapi_skill.id,
                is_required=True,
                minimum_proficiency="INTERMEDIATE",
                weight=1.5,
            )
        )
        session.add(
            JobSkill(
                job_id=job.id,
                skill_id=pg_skill.id,
                is_required=True,
                minimum_proficiency="BEGINNER",
                weight=1.0,
            )
        )
        await session.flush()

    # Seed Employer Skill Contract (Phase 16)
    contract = (
        await session.execute(
            select(SkillContract).where(
                SkillContract.job_id == job.id,
                SkillContract.version == 1,
            )
        )
    ).scalar_one_or_none()
    if not contract:
        contract = SkillContract(
            job_id=job.id,
            version=1,
            status=ContractStatus.ACTIVE,
            title="Enterprise Python & Cloud Talent Pipeline 2026",
            description=(
                "Guaranteed interview and placement pipeline for certified "
                "Python & Cloud full-stack engineers."
            ),
            effective_at=now - timedelta(days=60),
        )
        session.add(contract)
        await session.flush()

        session.add(
            SkillContractRequirement(
                contract_id=contract.id,
                skill_id=python_skill.id,
                required_proficiency=ProficiencyLevel.INTERMEDIATE,
                requirement_type=ContractRequirementType.REQUIRED,
                importance=ContractRequirementImportance.CRITICAL,
                evidence_type=ContractEvidenceType.VERIFIED_SKILL,
                minimum_experience_months=18,
            )
        )
        session.add(
            SkillContractRequirement(
                contract_id=contract.id,
                skill_id=fastapi_skill.id,
                required_proficiency=ProficiencyLevel.INTERMEDIATE,
                requirement_type=ContractRequirementType.REQUIRED,
                importance=ContractRequirementImportance.HIGH,
                evidence_type=ContractEvidenceType.COURSE_COMPLETION,
                minimum_experience_months=12,
            )
        )
        await session.flush()

    # 5. Seed Candidate User, Profile, Education, Experience & Skills
    cand_user = (
        await session.execute(select(User).where(User.email == "dev.candidate@skillsync.internal"))
    ).scalar_one_or_none()
    if not cand_user:
        cand_user = User(
            email="dev.candidate@skillsync.internal",
            password_hash=default_pw_hash,
            full_name="Aarav Sharma",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(cand_user)
        await session.flush()

    cand_profile = (
        await session.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == cand_user.id)
        )
    ).scalar_one_or_none()
    if not cand_profile:
        cand_profile = CandidateProfile(
            user_id=cand_user.id,
            headline="Full Stack Python & AI Cloud Engineer",
            bio=(
                "Certified full-stack software engineer with hands-on experience in "
                "FastAPI microservices and React."
            ),
            experience_years=2.0,
            education_level="B.Tech Computer Science & Engineering",
            location_city="Bengaluru",
            location_state="Karnataka",
            profile_completeness_pct=100.0,
        )
        session.add(cand_profile)
        await session.flush()

        # Add Education & Experience
        session.add(
            CandidateEducation(
                candidate_id=cand_profile.id,
                institution="National Institute of Technology",
                degree="Bachelor of Technology",
                field_of_study="Computer Science and Engineering",
                start_year=2020,
                end_year=2024,
                grade="8.8 CGPA",
            )
        )
        session.add(
            CandidateExperience(
                candidate_id=cand_profile.id,
                company_name="CloudTech Innovations",
                job_title="Software Engineering Intern",
                start_date=date(2024, 1, 15),
                end_date=date(2024, 6, 30),
                description=(
                    "Built RESTful APIs in FastAPI and integrated PostgreSQL backend models."
                ),
                location_city="Bengaluru",
            )
        )
        session.add(
            CandidateSkill(
                candidate_id=cand_profile.id,
                skill_id=python_skill.id,
                proficiency=ProficiencyLevel.ADVANCED,
                years_experience=2.0,
                is_verified=True,
            )
        )
        session.add(
            CandidateSkill(
                candidate_id=cand_profile.id,
                skill_id=fastapi_skill.id,
                proficiency=ProficiencyLevel.INTERMEDIATE,
                years_experience=1.5,
                is_verified=True,
            )
        )
        session.add(
            CandidateSkill(
                candidate_id=cand_profile.id,
                skill_id=react_skill.id,
                proficiency=ProficiencyLevel.INTERMEDIATE,
                years_experience=1.5,
                is_verified=True,
            )
        )
        await session.flush()

    # Seed Completed Course Enrollment (Phase 11)
    enrollment = (
        await session.execute(
            select(Enrollment).where(
                Enrollment.candidate_id == cand_profile.id,
                Enrollment.course_id == course.id,
            )
        )
    ).scalar_one_or_none()
    if not enrollment:
        enrollment = Enrollment(
            candidate_id=cand_profile.id,
            course_id=course.id,
            status=EnrollmentStatus.COMPLETED,
            completed_at=now - timedelta(days=90),
        )
        session.add(enrollment)
        await session.flush()

    # Seed Verified Skill Passport (Phase 12)
    verified_py = (
        await session.execute(
            select(VerifiedSkill).where(
                VerifiedSkill.candidate_id == cand_profile.id,
                VerifiedSkill.skill_id == python_skill.id,
            )
        )
    ).scalar_one_or_none()
    if not verified_py:
        session.add(
            VerifiedSkill(
                candidate_id=cand_profile.id,
                skill_id=python_skill.id,
                verified_at=now - timedelta(days=90),
                verification_method=VerificationMethod.COURSE_COMPLETION,
                verification_score=98.0,
                verification_summary=(
                    "Completed Full Stack Python & AI Cloud Engineering Bootcamp with distinction."
                ),
            )
        )
        session.add(
            VerifiedSkill(
                candidate_id=cand_profile.id,
                skill_id=fastapi_skill.id,
                verified_at=now - timedelta(days=90),
                verification_method=VerificationMethod.COURSE_COMPLETION,
                verification_score=95.0,
                verification_summary=(
                    "Demonstrated advanced FastAPI microservices proficiency during bootcamp."
                ),
            )
        )
        await session.flush()

    # Seed Candidate Application (Phase 4)
    app_record = (
        await session.execute(
            select(Application).where(
                Application.candidate_id == cand_profile.id,
                Application.job_id == job.id,
            )
        )
    ).scalar_one_or_none()
    if not app_record:
        app_record = Application(
            candidate_id=cand_profile.id,
            job_id=job.id,
            status=ApplicationStatus.HIRED,
            applied_at=now - timedelta(days=75),
            cover_note=(
                "I am excited to apply for the Junior Backend Engineer role "
                "with verified skills in Python and FastAPI."
            ),
        )
        session.add(app_record)
        await session.flush()

    # Seed Placement Outcome & Training Attribution (Phase 17)
    placement = (
        await session.execute(
            select(PlacementOutcome).where(PlacementOutcome.application_id == app_record.id)
        )
    ).scalar_one_or_none()
    if not placement:
        placement_date_val = (now - timedelta(days=60)).date()
        placement = PlacementOutcome(
            application_id=app_record.id,
            candidate_id=cand_profile.id,
            employer_id=emp_profile.id,
            job_id=job.id,
            contract_id=contract.id,
            placement_date=placement_date_val,
            starting_salary_annual=850000.0,
            employment_type=EmploymentType.FULL_TIME,
            retention_status=RetentionStatus.RETAINED_90D,
            contract_fulfillment_score=94.5,
            employer_satisfaction_rating=5,
            employer_feedback_notes=(
                "Outstanding technical competency and immediate production impact. Fast onboarding."
            ),
            verified_by_employer=True,
        )
        session.add(placement)
        await session.flush()

        # Training attribution record
        session.add(
            PlacementTrainingAttribution(
                placement_id=placement.id,
                enrollment_id=enrollment.id,
                course_id=course.id,
                provider_id=tp_profile.id,
                completed_at=enrollment.completed_at,
            )
        )
        await session.flush()

    # Seed Provider Performance Snapshot (Phase 17)
    snapshot = (
        await session.execute(
            select(ProviderPerformanceSnapshot).where(
                ProviderPerformanceSnapshot.provider_id == tp_profile.id
            )
        )
    ).scalar_one_or_none()
    if not snapshot:
        period_start = (now - timedelta(days=90)).date()
        session.add(
            ProviderPerformanceSnapshot(
                provider_id=tp_profile.id,
                period_start=period_start,
                period_end=now.date(),
                total_enrolled=30,
                total_completed=25,
                total_placed=23,
                completion_rate=83.3,
                placement_rate=92.0,
                retention_rate_90d=91.3,
                average_starting_salary=850000.0,
                average_employer_rating=4.85,
                ppi_score=89.4,
                ppi_tier=PPITier.TIER_1_EXCELLENT,
            )
        )
        await session.flush()

    # 6. Seed Government Observer User & Profile
    gov_user = (
        await session.execute(select(User).where(User.email == "dev.gov@skillsync.internal"))
    ).scalar_one_or_none()
    if not gov_user:
        gov_user = User(
            email="dev.gov@skillsync.internal",
            password_hash=default_pw_hash,
            full_name="Rajesh Verma",
            role=UserRole.GOVERNMENT,
            is_active=True,
        )
        session.add(gov_user)
        await session.flush()

    gov_profile = (
        await session.execute(
            select(GovernmentProfile).where(GovernmentProfile.user_id == gov_user.id)
        )
    ).scalar_one_or_none()
    if not gov_profile:
        gov_profile = GovernmentProfile(
            user_id=gov_user.id,
            department_name="National Skill Development Agency",
            jurisdiction="National",
            designation="Director of Labor Analytics",
        )
        session.add(gov_profile)
        await session.flush()

    await session.commit()
    logger.info("[SUCCESS] Deterministic SIH demo database seeding complete!")
    return {
        "admin": 1,
        "candidate": 1,
        "employer": 1,
        "training_provider": 1,
        "government": 1,
    }


async def main() -> None:
    """Entrypoint for executing database seeding."""
    async with AsyncSessionLocal() as session:
        await seed_demo_ecosystem(session)


if __name__ == "__main__":
    asyncio.run(main())

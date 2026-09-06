"""Safe, deterministic development database seed script.

Usage:
    uv run python -m app.db.seed
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseMode, CourseSkill
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.skill import Skill
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

SEED_SKILLS = [
    {
        "name": "Python",
        "category": "Software Engineering",
        "description": "High-level programming language for backend and AI",
    },
    {
        "name": "FastAPI",
        "category": "Software Engineering",
        "description": "Modern high-performance web framework for Python APIs",
    },
    {
        "name": "React",
        "category": "Frontend Development",
        "description": "JavaScript component library for user interfaces",
    },
    {
        "name": "TypeScript",
        "category": "Software Engineering",
        "description": "Strongly typed superset of JavaScript",
    },
    {
        "name": "PostgreSQL",
        "category": "Data Engineering",
        "description": "Powerful open-source relational database management system",
    },
    {
        "name": "Machine Learning",
        "category": "Artificial Intelligence",
        "description": "Designing algorithms that learn from training data",
    },
    {
        "name": "SQL",
        "category": "Data Engineering",
        "description": "Structured Query Language for managing relational databases",
    },
    {
        "name": "Docker",
        "category": "DevOps & Cloud",
        "description": "Container platform for packaging distributed applications",
    },
    {
        "name": "Data Analysis",
        "category": "Data Science",
        "description": "Inspecting, cleansing, and modeling data to discover insights",
    },
    {
        "name": "Cloud Computing",
        "category": "DevOps & Cloud",
        "description": "On-demand delivery of compute and storage over the internet",
    },
]


async def seed_skills(session: AsyncSession) -> dict[str, Skill]:
    """Seed standard core skill taxonomy idempotently."""
    logger.info("Seeding canonical skills...")
    skill_map: dict[str, Skill] = {}
    for item in SEED_SKILLS:
        norm = item["name"].strip().lower()
        stmt = select(Skill).where(Skill.normalized_name == norm)
        res = await session.execute(stmt)
        skill = res.scalars().first()
        if not skill:
            skill = Skill(
                name=item["name"],
                normalized_name=norm,
                category=item["category"],
                description=item["description"],
            )
            session.add(skill)
            await session.flush()
            logger.info("Created skill: %s", skill.name)
        skill_map[norm] = skill
    return skill_map


async def seed_dev_users_and_profiles(session: AsyncSession, skills: dict[str, Skill]) -> None:
    """Seed development fixture accounts with associated domain profiles idempotently."""
    logger.info("Seeding development users and profiles...")
    default_dev_hash = get_password_hash("DevPassword123!")

    # 1. Candidate User
    cand_stmt = select(User).where(User.email == "dev.candidate@skillsync.internal")
    res = await session.execute(cand_stmt)
    cand_user = res.scalars().first()
    if not cand_user:
        cand_user = User(
            email="dev.candidate@skillsync.internal",
            password_hash=default_dev_hash,
            full_name="Aarav Sharma",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        session.add(cand_user)
        await session.flush()

        cand_profile = CandidateProfile(
            user_id=cand_user.id,
            headline="Full Stack & AI Engineer",
            bio="Passionate engineer with experience in Python, FastAPI, and React.",
            experience_years=2.5,
            education_level="B.Tech Computer Science",
            location_city="Hyderabad",
            location_state="Telangana",
        )
        session.add(cand_profile)
        await session.flush()

        # Attach skills to candidate
        py_skill = skills.get("python")
        if py_skill:
            session.add(
                CandidateSkill(
                    candidate_id=cand_profile.id,
                    skill_id=py_skill.id,
                    proficiency=ProficiencyLevel.ADVANCED,
                    years_experience=2.5,
                    is_verified=True,
                )
            )

    # 2. Employer User
    emp_stmt = select(User).where(User.email == "dev.employer@skillsync.internal")
    res = await session.execute(emp_stmt)
    emp_user = res.scalars().first()
    if not emp_user:
        emp_user = User(
            email="dev.employer@skillsync.internal",
            password_hash=default_dev_hash,
            full_name="Priya Patel",
            role=UserRole.EMPLOYER,
            is_active=True,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = EmployerProfile(
            user_id=emp_user.id,
            company_name="Apex Tech Solutions",
            company_description="Leading provider of cloud & AI software products.",
            industry="Information Technology",
            location_city="Bengaluru",
            location_state="Karnataka",
            website_url="https://apextech.example.com",
        )
        session.add(emp_profile)
        await session.flush()

        # Seed sample job requisition
        job = Job(
            employer_id=emp_profile.id,
            title="Junior Backend Engineer (Python/FastAPI)",
            description=(
                "Seeking a motivated engineer to build scalable microservices "
                "using Python and Postgres."
            ),
            location_city="Bengaluru",
            location_state="Karnataka",
            is_remote=True,
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.ENTRY,
            salary_min=600000.0,
            salary_max=900000.0,
            is_active=True,
        )
        session.add(job)
        await session.flush()

        # Attach skill requirements to job
        py_skill = skills.get("python")
        fastapi_skill = skills.get("fastapi")
        if py_skill:
            session.add(
                JobSkill(
                    job_id=job.id,
                    skill_id=py_skill.id,
                    is_required=True,
                    minimum_proficiency="INTERMEDIATE",
                    weight=1.5,
                )
            )
        if fastapi_skill:
            session.add(
                JobSkill(
                    job_id=job.id,
                    skill_id=fastapi_skill.id,
                    is_required=True,
                    minimum_proficiency="BEGINNER",
                    weight=1.2,
                )
            )

    # 3. Training Provider User
    tp_stmt = select(User).where(User.email == "dev.provider@skillsync.internal")
    res = await session.execute(tp_stmt)
    tp_user = res.scalars().first()
    if not tp_user:
        tp_user = User(
            email="dev.provider@skillsync.internal",
            password_hash=default_dev_hash,
            full_name="Dr. Vikram Rao",
            role=UserRole.TRAINING_PROVIDER,
            is_active=True,
        )
        session.add(tp_user)
        await session.flush()

        tp_profile = TrainingProviderProfile(
            user_id=tp_user.id,
            institution_name="National Skills Academy",
            provider_type="Vocational Training Center",
            location_city="New Delhi",
            location_state="Delhi",
            website_url="https://nsa.example.org",
            contact_email="contact@nsa.example.org",
        )
        session.add(tp_profile)
        await session.flush()

        # Seed sample course
        course = Course(
            provider_id=tp_profile.id,
            title="Full Stack Python & Web Development Bootcamp",
            description=(
                "Comprehensive 12-week vocational curriculum covering "
                "modern Python, databases, and APIs."
            ),
            duration_hours=120,
            mode=CourseMode.HYBRID,
            capacity=50,
            location_city="New Delhi",
            is_active=True,
        )
        session.add(course)
        await session.flush()

        # Attach course skills
        py_skill = skills.get("python")
        sql_skill = skills.get("sql")
        if py_skill:
            session.add(CourseSkill(course_id=course.id, skill_id=py_skill.id))
        if sql_skill:
            session.add(CourseSkill(course_id=course.id, skill_id=sql_skill.id))

    # 4. Government Observer User
    gov_stmt = select(User).where(User.email == "dev.gov@skillsync.internal")
    res = await session.execute(gov_stmt)
    gov_user = res.scalars().first()
    if not gov_user:
        gov_user = User(
            email="dev.gov@skillsync.internal",
            password_hash=default_dev_hash,
            full_name="Rajesh Verma",
            role=UserRole.GOVERNMENT,
            is_active=True,
        )
        session.add(gov_user)
        await session.flush()

        gov_profile = GovernmentProfile(
            user_id=gov_user.id,
            department_name="National Skill Development Agency",
            jurisdiction="National",
            designation="Director of Labor Analytics",
        )
        session.add(gov_profile)

    await session.commit()
    logger.info("Database seeding complete!")


async def main() -> None:
    """Entry point for executing deterministic seed."""
    async with AsyncSessionLocal() as session:
        skills = await seed_skills(session)
        await seed_dev_users_and_profiles(session, skills)


if __name__ == "__main__":
    asyncio.run(main())

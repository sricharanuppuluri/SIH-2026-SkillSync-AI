"""Job requisition domain business service."""

import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.job import Job, JobSkill
from app.models.profiles import EmployerProfile
from app.models.skill import Skill
from app.schemas.job import JobCreate, JobUpdate


async def get_jobs(
    db: AsyncSession,
    employer_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Job]:
    """List jobs with eager loading of attached required skills."""
    query = (
        select(Job)
        .options(selectinload(Job.skills))
        .offset(skip)
        .limit(limit)
        .order_by(Job.created_at.desc())
    )
    if employer_id:
        query = query.where(Job.employer_id == employer_id)
    if is_active is not None:
        query = query.where(Job.is_active == is_active)

    result = await db.execute(query)
    return result.scalars().all()


async def get_job_by_id(db: AsyncSession, job_id: uuid.UUID) -> Job | None:
    """Retrieve job requisition by UUID with eager loaded skills."""
    query = select(Job).options(selectinload(Job.skills)).where(Job.id == job_id)
    result = await db.execute(query)
    return result.scalars().first()


async def create_job(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    schema: JobCreate,
) -> Job:
    """Create a new job posting attached to the employer profile with skill requirements."""
    # Verify employer profile exists
    employer = await db.get(EmployerProfile, employer_profile_id)
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer profile not found. Please complete profile setup first.",
        )

    job = Job(
        employer_id=employer_profile_id,
        title=schema.title.strip(),
        description=schema.description.strip(),
        location_city=schema.location_city.strip() if schema.location_city else None,
        location_state=schema.location_state.strip() if schema.location_state else None,
        is_remote=schema.is_remote,
        employment_type=schema.employment_type,
        experience_level=schema.experience_level,
        salary_min=schema.salary_min,
        salary_max=schema.salary_max,
        is_active=schema.is_active,
    )
    db.add(job)
    await db.flush()

    # Validate and attach skills
    for skill_req in schema.skills:
        skill = await db.get(Skill, skill_req.skill_id)
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill with ID {skill_req.skill_id} does not exist",
            )
        job_skill = JobSkill(
            job_id=job.id,
            skill_id=skill.id,
            is_required=skill_req.is_required,
            minimum_proficiency=skill_req.minimum_proficiency,
            weight=skill_req.weight,
        )
        db.add(job_skill)

    await db.commit()
    return await get_job_by_id(db, job.id)  # re-fetch with selectinload


async def update_job(
    db: AsyncSession,
    job: Job,
    schema: JobUpdate,
) -> Job:
    """Update job posting attributes."""
    if schema.title is not None:
        job.title = schema.title.strip()
    if schema.description is not None:
        job.description = schema.description.strip()
    if schema.location_city is not None:
        job.location_city = schema.location_city.strip() if schema.location_city else None
    if schema.location_state is not None:
        job.location_state = schema.location_state.strip() if schema.location_state else None
    if schema.is_remote is not None:
        job.is_remote = schema.is_remote
    if schema.employment_type is not None:
        job.employment_type = schema.employment_type
    if schema.experience_level is not None:
        job.experience_level = schema.experience_level
    if schema.salary_min is not None:
        job.salary_min = schema.salary_min
    if schema.salary_max is not None:
        job.salary_max = schema.salary_max
    if schema.is_active is not None:
        job.is_active = schema.is_active

    await db.commit()
    return await get_job_by_id(db, job.id)

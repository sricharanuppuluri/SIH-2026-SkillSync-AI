"""Job requisition domain business service."""

import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.job import Job, JobSkill, JobStatus
from app.models.profiles import EmployerProfile
from app.models.skill import Skill
from app.schemas.job import JobCreate, JobResponse, JobSkillResponse, JobUpdate


def serialize_job_response(job: Job, applications_count: int = 0) -> JobResponse:
    """Helper converting Job ORM model with eager loaded relations to JobResponse schema."""
    skills_response: list[JobSkillResponse] = []
    if job.skills:
        for js in job.skills:
            skill_name = js.skill.name if js.skill else None
            category = js.skill.category if js.skill else None
            skills_response.append(
                JobSkillResponse(
                    id=js.id,
                    skill_id=js.skill_id,
                    skill_name=skill_name,
                    category=category,
                    is_required=js.is_required,
                    minimum_proficiency=js.minimum_proficiency,
                    weight=js.weight,
                )
            )

    return JobResponse(
        id=job.id,
        employer_id=job.employer_id,
        title=job.title,
        description=job.description,
        location_city=job.location_city,
        location_state=job.location_state,
        is_remote=job.is_remote,
        employment_type=job.employment_type,
        experience_level=job.experience_level,
        status=job.status,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        is_active=job.is_active,
        skills=skills_response,
        applications_count=applications_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


async def get_jobs(
    db: AsyncSession,
    employer_id: uuid.UUID | None = None,
    job_status: JobStatus | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Job]:
    """List jobs with eager loading of attached required skills and canonical skills."""
    query = (
        select(Job)
        .options(selectinload(Job.skills).selectinload(JobSkill.skill))
        .offset(skip)
        .limit(limit)
        .order_by(Job.created_at.desc())
    )
    if employer_id:
        query = query.where(Job.employer_id == employer_id)
    if job_status is not None:
        query = query.where(Job.status == job_status)
    if is_active is not None:
        query = query.where(Job.is_active == is_active)

    result = await db.execute(query)
    return result.scalars().all()


async def get_job_by_id(db: AsyncSession, job_id: uuid.UUID) -> Job | None:
    """Retrieve job requisition by UUID with eager loaded skills."""
    query = (
        select(Job)
        .options(selectinload(Job.skills).selectinload(JobSkill.skill))
        .where(Job.id == job_id)
    )
    result = await db.execute(query)
    return result.scalars().first()


async def create_job(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    schema: JobCreate,
) -> Job:
    """Create a new job posting attached to the employer profile with skill requirements."""
    employer = await db.get(EmployerProfile, employer_profile_id)
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer profile not found. Please complete profile setup first.",
        )

    # Sync is_active with status
    is_active = schema.status == JobStatus.PUBLISHED if schema.status else schema.is_active

    job = Job(
        employer_id=employer_profile_id,
        title=schema.title.strip(),
        description=schema.description.strip(),
        location_city=schema.location_city.strip() if schema.location_city else None,
        location_state=schema.location_state.strip() if schema.location_state else None,
        is_remote=schema.is_remote,
        employment_type=schema.employment_type,
        experience_level=schema.experience_level,
        status=schema.status,
        salary_min=schema.salary_min,
        salary_max=schema.salary_max,
        is_active=is_active,
    )
    db.add(job)
    await db.flush()

    # Validate and attach skills (preventing duplicate skill_ids)
    attached_skill_ids: set[uuid.UUID] = set()
    for skill_req in schema.skills:
        if skill_req.skill_id in attached_skill_ids:
            continue
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
        attached_skill_ids.add(skill.id)

    await db.commit()
    return await get_job_by_id(db, job.id)


async def update_job(
    db: AsyncSession,
    job: Job,
    schema: JobUpdate,
) -> Job:
    """Update job posting attributes and optionally sync skills."""
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
    if schema.status is not None:
        job.status = schema.status
        job.is_active = schema.status == JobStatus.PUBLISHED
    elif schema.is_active is not None:
        job.is_active = schema.is_active
    if schema.salary_min is not None:
        job.salary_min = schema.salary_min
    if schema.salary_max is not None:
        job.salary_max = schema.salary_max

    # Update attached skills if provided
    if schema.skills is not None:
        job.skills.clear()
        await db.flush()

        attached_skill_ids: set[uuid.UUID] = set()
        for skill_req in schema.skills:
            if skill_req.skill_id in attached_skill_ids:
                continue
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
            job.skills.append(job_skill)
            attached_skill_ids.add(skill.id)

    await db.commit()
    await db.refresh(job)
    return await get_job_by_id(db, job.id)

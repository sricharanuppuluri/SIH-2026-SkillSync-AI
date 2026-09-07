"""Course and curriculum domain business service."""

import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, CourseSkill
from app.models.profiles import TrainingProviderProfile
from app.models.skill import Skill
from app.schemas.course import CourseCreate, CourseUpdate


async def get_courses(
    db: AsyncSession,
    provider_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Course]:
    """List courses with eager loading of taught skills and curriculum."""
    query = (
        select(Course)
        .options(
            selectinload(Course.skills),
            selectinload(Course.curriculum_modules),
            selectinload(Course.enrollments),
        )
        .offset(skip)
        .limit(limit)
        .order_by(Course.created_at.desc())
    )
    if provider_id:
        query = query.where(Course.provider_id == provider_id)
    if is_active is not None:
        query = query.where(Course.is_active == is_active)

    result = await db.execute(query)
    return result.scalars().all()


async def get_course_by_id(db: AsyncSession, course_id: uuid.UUID) -> Course | None:
    """Fetch course by UUID with eager loaded skills and curriculum."""
    query = (
        select(Course)
        .options(
            selectinload(Course.skills),
            selectinload(Course.curriculum_modules),
            selectinload(Course.enrollments),
        )
        .where(Course.id == course_id)
    )
    result = await db.execute(query)
    return result.scalars().first()


async def create_course(
    db: AsyncSession,
    provider_profile_id: uuid.UUID,
    schema: CourseCreate,
) -> Course:
    """Create a new course attached to the training provider profile."""
    provider = await db.get(TrainingProviderProfile, provider_profile_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training provider profile not found. Please complete profile setup first.",
        )

    course = Course(
        provider_id=provider_profile_id,
        title=schema.title.strip(),
        description=schema.description.strip(),
        duration_hours=schema.duration_hours,
        mode=schema.mode,
        capacity=schema.capacity,
        location_city=schema.location_city.strip() if schema.location_city else None,
        is_active=schema.is_active,
    )
    db.add(course)
    await db.flush()

    # Validate and attach skills
    for skill_req in schema.skills:
        skill = await db.get(Skill, skill_req.skill_id)
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill with ID {skill_req.skill_id} does not exist",
            )
        course_skill = CourseSkill(
            course_id=course.id,
            skill_id=skill.id,
        )
        db.add(course_skill)

    await db.commit()
    return await get_course_by_id(db, course.id)


async def update_course(
    db: AsyncSession,
    course: Course,
    schema: CourseUpdate,
) -> Course:
    """Update training course details."""
    if schema.title is not None:
        course.title = schema.title.strip()
    if schema.description is not None:
        course.description = schema.description.strip()
    if schema.duration_hours is not None:
        course.duration_hours = schema.duration_hours
    if schema.mode is not None:
        course.mode = schema.mode
    if schema.capacity is not None:
        course.capacity = schema.capacity
    if schema.location_city is not None:
        course.location_city = schema.location_city.strip() if schema.location_city else None
    if schema.is_active is not None:
        course.is_active = schema.is_active

    await db.commit()
    return await get_course_by_id(db, course.id)

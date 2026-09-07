"""Course domain service handling lifecycle, canonical skill mapping, validation, and discovery."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, CourseDifficulty, CourseMode, CourseSkill, CourseStatus
from app.models.curriculum import CurriculumModule
from app.models.enrollment import EnrollmentStatus
from app.models.skill import Skill, SkillStatus
from app.schemas.course import (
    CourseCreate,
    CoursePublishValidationResult,
    CourseResponse,
    CourseSkillResponse,
    CourseUpdate,
)
from app.schemas.curriculum import CurriculumLessonResponse, CurriculumModuleResponse


async def _serialize_course(course: Course) -> CourseResponse:
    """Helper to convert Course ORM instance to CourseResponse schema."""
    active_count = 0
    if hasattr(course, "enrollments") and course.enrollments is not None:
        active_count = sum(
            1
            for e in course.enrollments
            if e.status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS)
        )

    provider_name = None
    if hasattr(course, "provider") and course.provider is not None:
        provider_name = course.provider.institution_name

    skills_resp: list[CourseSkillResponse] = []
    if hasattr(course, "skills") and course.skills is not None:
        for cs in course.skills:
            skill_name = None
            skill_code = None
            if hasattr(cs, "skill") and cs.skill is not None:
                skill_name = cs.skill.name
                skill_code = getattr(cs.skill, "slug", None)
            skills_resp.append(
                CourseSkillResponse(
                    id=cs.id,
                    course_id=cs.course_id,
                    skill_id=cs.skill_id,
                    skill_name=skill_name,
                    skill_code=skill_code,
                    name=skill_name,
                )
            )

    modules_resp: list[CurriculumModuleResponse] = []
    if hasattr(course, "curriculum_modules") and course.curriculum_modules is not None:
        for m in course.curriculum_modules:
            lessons_resp = [
                CurriculumLessonResponse(
                    id=les.id,
                    module_id=les.module_id,
                    title=les.title,
                    description=les.description,
                    content=les.content,
                    duration_minutes=les.duration_minutes,
                    order_index=les.order_index,
                    created_at=les.created_at,
                    updated_at=les.updated_at,
                )
                for les in (m.lessons or [])
            ]
            modules_resp.append(
                CurriculumModuleResponse(
                    id=m.id,
                    course_id=m.course_id,
                    title=m.title,
                    description=m.description,
                    order_index=m.order_index,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                    lessons=lessons_resp,
                )
            )

    return CourseResponse(
        id=course.id,
        provider_id=course.provider_id,
        provider_name=provider_name,
        title=course.title,
        description=course.description,
        category=course.category,
        duration_hours=course.duration_hours,
        difficulty=course.difficulty,
        mode=course.mode,
        delivery_mode=course.mode,
        status=course.status,
        capacity=course.capacity,
        location_city=course.location_city,
        location_state=course.location_state,
        start_date=course.start_date,
        end_date=course.end_date,
        enrollment_deadline=course.enrollment_deadline,
        is_active=course.is_active,
        enrolled_count=active_count,
        remaining_capacity=max(0, course.capacity - active_count),
        skills=skills_resp,
        curriculum_modules=modules_resp,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


async def _load_full_course(db: AsyncSession, course_id: uuid.UUID) -> Course | None:
    """Fetch complete Course graph with provider, skills,
    canonical skill models, curriculum, and enrollments.
    """
    stmt = (
        select(Course)
        .where(Course.id == course_id)
        .options(
            selectinload(Course.provider),
            selectinload(Course.skills).selectinload(CourseSkill.skill),
            selectinload(Course.curriculum_modules).selectinload(CurriculumModule.lessons),
            selectinload(Course.enrollments),
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def _verify_canonical_skills(db: AsyncSession, skill_ids: list[uuid.UUID]) -> list[Skill]:
    """Verify that every provided skill_id exists in the canonical catalog and is active."""
    if not skill_ids:
        return []

    stmt = select(Skill).where(Skill.id.in_(skill_ids), Skill.status == SkillStatus.ACTIVE)
    res = await db.execute(stmt)
    valid_skills = res.scalars().all()

    valid_id_set = {s.id for s in valid_skills}
    for sid in skill_ids:
        if sid not in valid_id_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill '{sid}' not found in the canonical catalog or is inactive.",
            )

    return list(valid_skills)


# ---------------------------------------------------------------------------
# Training Provider Course Management
# ---------------------------------------------------------------------------
async def create_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    data: CourseCreate,
) -> CourseResponse:
    """Create a new training course in DRAFT status with canonical skills."""
    # 1. Resolve skill IDs from either skill_ids or skills field
    skill_ids_to_attach: list[uuid.UUID] = []
    if data.skill_ids:
        skill_ids_to_attach.extend(data.skill_ids)
    if data.skills:
        skill_ids_to_attach.extend([s.skill_id for s in data.skills])
    skill_ids_to_attach = list(dict.fromkeys(skill_ids_to_attach))  # deduplicate

    # 2. Validate canonical skills
    await _verify_canonical_skills(db, skill_ids_to_attach)

    # 3. Create course
    course = Course(
        provider_id=provider_id,
        title=data.title.strip(),
        description=data.description.strip(),
        category=data.category.strip() if data.category else None,
        duration_hours=max(1, data.duration_hours),
        difficulty=data.difficulty,
        mode=data.mode,
        status=CourseStatus.DRAFT,
        capacity=max(1, data.capacity),
        location_city=data.location_city.strip() if data.location_city else None,
        location_state=data.location_state.strip() if data.location_state else None,
        start_date=data.start_date,
        end_date=data.end_date,
        enrollment_deadline=data.enrollment_deadline,
        is_active=data.is_active,
    )
    db.add(course)
    await db.flush()

    # 4. Attach canonical skills
    for sid in skill_ids_to_attach:
        cs = CourseSkill(course_id=course.id, skill_id=sid)
        db.add(cs)

    await db.commit()

    full_course = await _load_full_course(db, course.id)
    if not full_course:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load newly created course.",
        )
    return await _serialize_course(full_course)


async def get_provider_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
) -> CourseResponse:
    """Retrieve course details owned by the authenticated provider."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )
    return await _serialize_course(course)


async def list_provider_courses(
    db: AsyncSession,
    provider_id: uuid.UUID,
    status_filter: CourseStatus | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[CourseResponse]:
    """List all courses belonging to the authenticated provider with optional filtering."""
    query = (
        select(Course)
        .where(Course.provider_id == provider_id)
        .options(
            selectinload(Course.provider),
            selectinload(Course.skills).selectinload(CourseSkill.skill),
            selectinload(Course.curriculum_modules).selectinload(CurriculumModule.lessons),
            selectinload(Course.enrollments),
        )
    )

    if status_filter is not None:
        query = query.where(Course.status == status_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Course.title.ilike(term),
                Course.description.ilike(term),
                Course.category.ilike(term),
            )
        )

    query = query.order_by(Course.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    courses = res.scalars().all()

    return [await _serialize_course(c) for c in courses]


async def update_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    data: CourseUpdate,
) -> CourseResponse:
    """Update course attributes with strict ownership verification
    and canonical skill validation.
    """
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    if data.title is not None and data.title.strip():
        course.title = data.title.strip()
    if data.description is not None and data.description.strip():
        course.description = data.description.strip()
    if data.category is not None:
        course.category = data.category.strip() if data.category.strip() else None
    if data.duration_hours is not None:
        course.duration_hours = max(1, data.duration_hours)
    if data.difficulty is not None:
        course.difficulty = data.difficulty
    if data.mode is not None:
        course.mode = data.mode
    if data.capacity is not None:
        # Prevent capacity lower than current active enrollments
        active_enrollments = sum(
            1
            for e in course.enrollments
            if e.status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS)
        )
        if data.capacity < active_enrollments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Capacity cannot be reduced below current active "
                    f"enrollments ({active_enrollments})."
                ),
            )
        course.capacity = max(1, data.capacity)
    if data.location_city is not None:
        course.location_city = data.location_city.strip() if data.location_city.strip() else None
    if data.location_state is not None:
        course.location_state = data.location_state.strip() if data.location_state.strip() else None
    if data.start_date is not None:
        course.start_date = data.start_date
    if data.end_date is not None:
        course.end_date = data.end_date
    if data.enrollment_deadline is not None:
        course.enrollment_deadline = data.enrollment_deadline
    if data.is_active is not None:
        course.is_active = data.is_active

    # Handle skills replacement if provided
    skill_ids_to_set: list[uuid.UUID] | None = None
    if data.skill_ids is not None:
        skill_ids_to_set = list(dict.fromkeys(data.skill_ids))
    elif data.skills is not None:
        skill_ids_to_set = list(dict.fromkeys([s.skill_id for s in data.skills]))

    if skill_ids_to_set is not None:
        await _verify_canonical_skills(db, skill_ids_to_set)
        # Delete existing mappings
        del_stmt = select(CourseSkill).where(CourseSkill.course_id == course.id)
        del_res = await db.execute(del_stmt)
        for old_cs in del_res.scalars().all():
            await db.delete(old_cs)
        await db.flush()

        # Add new mappings
        for sid in skill_ids_to_set:
            new_cs = CourseSkill(course_id=course.id, skill_id=sid)
            db.add(new_cs)

    db.add(course)
    await db.commit()

    reloaded = await _load_full_course(db, course.id)
    return await _serialize_course(reloaded)


def validate_course_for_publishing(course: Course) -> CoursePublishValidationResult:
    """Validate that a course meets all criteria required for publication."""
    errors: list[str] = []

    if not course.title or len(course.title.strip()) < 2:
        errors.append("Course title is required (at least 2 characters).")
    if not course.description or len(course.description.strip()) < 10:
        errors.append("Course description is required (at least 10 characters).")
    if course.capacity <= 0:
        errors.append("Course capacity must be greater than zero.")
    if course.duration_hours <= 0:
        errors.append("Course duration hours must be greater than zero.")

    if not course.skills or len(course.skills) == 0:
        errors.append("At least one canonical skill must be mapped to the course.")

    if not course.curriculum_modules or len(course.curriculum_modules) == 0:
        errors.append("Curriculum must contain at least one module.")
    else:
        empty_modules = [
            m.title for m in course.curriculum_modules if not m.lessons or len(m.lessons) == 0
        ]
        if empty_modules:
            errors.append(f"Modules must contain at least one lesson: {', '.join(empty_modules)}.")

    return CoursePublishValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
    )


async def publish_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
) -> CourseResponse:
    """Publish a course after ensuring all strict validation requirements are fulfilled."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    val = validate_course_for_publishing(course)
    if not val.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish course. Missing requirements: {'; '.join(val.errors)}",
        )

    course.status = CourseStatus.PUBLISHED
    db.add(course)
    await db.commit()

    reloaded = await _load_full_course(db, course.id)
    return await _serialize_course(reloaded)


async def close_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
) -> CourseResponse:
    """Transition course to CLOSED status, halting new enrollments while preserving history."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    course.status = CourseStatus.CLOSED
    db.add(course)
    await db.commit()

    reloaded = await _load_full_course(db, course.id)
    return await _serialize_course(reloaded)


async def delete_or_close_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
) -> dict:
    """Delete a course if no enrollments exist, or gracefully soft-close it if enrollments exist."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    has_enrollments = bool(course.enrollments and len(course.enrollments) > 0)
    if has_enrollments:
        course.status = CourseStatus.CLOSED
        course.is_active = False
        db.add(course)
        await db.commit()
        return {
            "status": "archived",
            "message": "Course has historical enrollments and was soft-closed rather than deleted.",
        }

    await db.delete(course)
    await db.commit()
    return {"status": "deleted", "message": "Course deleted successfully."}


async def add_skills_to_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    skill_ids: list[uuid.UUID],
) -> CourseResponse:
    """Add canonical skills to a course, ensuring ownership and preventing duplicate mappings."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    deduped_ids = list(dict.fromkeys(skill_ids))
    await _verify_canonical_skills(db, deduped_ids)

    existing_skill_ids = {cs.skill_id for cs in course.skills}
    for sid in deduped_ids:
        if sid not in existing_skill_ids:
            cs = CourseSkill(course_id=course.id, skill_id=sid)
            db.add(cs)

    await db.commit()
    reloaded = await _load_full_course(db, course.id)
    return await _serialize_course(reloaded)


async def remove_skill_from_course(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    skill_id: uuid.UUID,
) -> CourseResponse:
    """Remove a canonical skill mapping from a course."""
    course = await _load_full_course(db, course_id)
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )

    stmt = select(CourseSkill).where(
        CourseSkill.course_id == course.id,
        CourseSkill.skill_id == skill_id,
    )
    res = await db.execute(stmt)
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill mapping not found in this course.",
        )

    await db.delete(cs)
    await db.commit()

    reloaded = await _load_full_course(db, course.id)
    return await _serialize_course(reloaded)


# ---------------------------------------------------------------------------
# Candidate Public Course Discovery
# ---------------------------------------------------------------------------
async def list_public_courses(
    db: AsyncSession,
    search: str | None = None,
    skill_id: uuid.UUID | None = None,
    skill_ids: list[uuid.UUID] | None = None,
    difficulty: CourseDifficulty | None = None,
    mode: CourseMode | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[CourseResponse]:
    """List all PUBLISHED courses available for candidate discovery and enrollment."""
    query = (
        select(Course)
        .where(Course.status == CourseStatus.PUBLISHED, Course.is_active.is_(True))
        .options(
            selectinload(Course.provider),
            selectinload(Course.skills).selectinload(CourseSkill.skill),
            selectinload(Course.curriculum_modules).selectinload(CurriculumModule.lessons),
            selectinload(Course.enrollments),
        )
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Course.title.ilike(term),
                Course.description.ilike(term),
                Course.category.ilike(term),
            )
        )

    if difficulty is not None:
        query = query.where(Course.difficulty == difficulty)

    if mode is not None:
        query = query.where(Course.mode == mode)

    if category and category.strip():
        query = query.where(Course.category.ilike(f"%{category.strip()}%"))

    if skill_id is not None:
        query = query.join(Course.skills).where(CourseSkill.skill_id == skill_id)
    elif skill_ids and len(skill_ids) > 0:
        query = query.join(Course.skills).where(CourseSkill.skill_id.in_(skill_ids)).distinct()

    query = query.order_by(Course.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    courses = res.scalars().all()

    return [await _serialize_course(c) for c in courses]


async def get_public_course_detail(
    db: AsyncSession,
    course_id: uuid.UUID,
) -> CourseResponse:
    """Retrieve detailed information for a PUBLISHED course."""
    course = await _load_full_course(db, course_id)
    if not course or course.status != CourseStatus.PUBLISHED or not course.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or is not available for enrollment.",
        )
    return await _serialize_course(course)

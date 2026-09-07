"""Candidate training enrollment and lesson progress domain service."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, CourseStatus
from app.models.curriculum import CurriculumLesson, CurriculumModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.enrollment_progress import EnrollmentLessonProgress
from app.schemas.enrollment import (
    EnrollmentLessonProgressItem,
    EnrollmentProgressResponse,
    EnrollmentResponse,
)


async def enroll_candidate(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    course_id: uuid.UUID,
) -> EnrollmentResponse:
    """Transactionally enroll candidate in a published course respecting capacity limits."""
    # 1. Row-lock course record for transactional capacity check
    stmt = (
        select(Course)
        .where(Course.id == course_id)
        .options(
            selectinload(Course.provider),
            selectinload(Course.curriculum_modules).selectinload(CurriculumModule.lessons),
        )
        .with_for_update()
    )
    res = await db.execute(stmt)
    course = res.scalar_one_or_none()

    if not course or not course.is_active or course.status != CourseStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course is not available for enrollment.",
        )

    # 2. Check if candidate already enrolled
    existing_stmt = select(Enrollment).where(
        Enrollment.candidate_id == candidate_id,
        Enrollment.course_id == course_id,
    )
    existing_res = await db.execute(existing_stmt)
    existing_enr = existing_res.scalar_one_or_none()
    if existing_enr and existing_enr.status != EnrollmentStatus.DROPPED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate is already enrolled in this course.",
        )

    # 3. Check active capacity
    active_count_stmt = select(func.count(Enrollment.id)).where(
        Enrollment.course_id == course_id,
        Enrollment.status.in_([EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS]),
    )
    active_count_res = await db.execute(active_count_stmt)
    active_count = active_count_res.scalar() or 0

    if active_count >= course.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This course is currently full.",
        )

    # 4. Create or reactivate enrollment
    if existing_enr and existing_enr.status == EnrollmentStatus.DROPPED:
        existing_enr.status = EnrollmentStatus.ENROLLED
        existing_enr.enrolled_at = datetime.now(UTC)
        existing_enr.completed_at = None
        enrollment = existing_enr
        db.add(enrollment)
    else:
        enrollment = Enrollment(
            candidate_id=candidate_id,
            course_id=course_id,
            status=EnrollmentStatus.ENROLLED,
            enrolled_at=datetime.now(UTC),
        )
        db.add(enrollment)

    await db.flush()

    # 5. Populate initial lesson progress records for all lessons in the course
    all_lessons: list[CurriculumLesson] = []
    for mod in course.curriculum_modules or []:
        for les in mod.lessons or []:
            all_lessons.append(les)

    # Delete existing progress records if any
    del_prog = select(EnrollmentLessonProgress).where(
        EnrollmentLessonProgress.enrollment_id == enrollment.id
    )
    del_res = await db.execute(del_prog)
    for old_p in del_res.scalars().all():
        await db.delete(old_p)
    await db.flush()

    for les in all_lessons:
        prog = EnrollmentLessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=les.id,
            is_completed=False,
            completed_at=None,
        )
        db.add(prog)

    await db.commit()

    return EnrollmentResponse(
        id=enrollment.id,
        candidate_id=enrollment.candidate_id,
        course_id=enrollment.course_id,
        course_title=course.title,
        provider_name=course.provider.institution_name if course.provider else None,
        status=enrollment.status,
        progress_percent=0.0,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        created_at=enrollment.created_at,
        updated_at=enrollment.updated_at,
    )


async def get_candidate_enrollments(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    status_filter: EnrollmentStatus | None = None,
) -> list[EnrollmentResponse]:
    """Retrieve all course enrollments for the candidate with calculated progress percentage."""
    stmt = (
        select(Enrollment)
        .where(Enrollment.candidate_id == candidate_id)
        .options(
            selectinload(Enrollment.course).selectinload(Course.provider),
            selectinload(Enrollment.lesson_progress),
        )
        .order_by(Enrollment.created_at.desc())
    )

    if status_filter is not None:
        stmt = stmt.where(Enrollment.status == status_filter)

    res = await db.execute(stmt)
    enrollments = res.scalars().all()

    result: list[EnrollmentResponse] = []
    for e in enrollments:
        progress_pct = 0.0
        if e.lesson_progress:
            total_lp = len(e.lesson_progress)
            comp_lp = sum(1 for lp in e.lesson_progress if lp.is_completed)
            progress_pct = round((comp_lp / total_lp) * 100, 1) if total_lp > 0 else 0.0
        elif e.status == EnrollmentStatus.COMPLETED:
            progress_pct = 100.0

        provider_name = None
        if e.course and e.course.provider:
            provider_name = e.course.provider.institution_name

        result.append(
            EnrollmentResponse(
                id=e.id,
                candidate_id=e.candidate_id,
                course_id=e.course_id,
                course_title=e.course.title if e.course else "Course",
                provider_name=provider_name,
                status=e.status,
                progress_percent=progress_pct,
                enrolled_at=e.enrolled_at,
                completed_at=e.completed_at,
                created_at=e.created_at,
                updated_at=e.updated_at,
            )
        )

    return result


async def get_enrollment_progress(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    enrollment_id: uuid.UUID,
) -> EnrollmentProgressResponse:
    """Retrieve detailed lesson-by-lesson progress for a candidate enrollment."""
    stmt = (
        select(Enrollment)
        .where(
            Enrollment.id == enrollment_id,
            Enrollment.candidate_id == candidate_id,
        )
        .options(
            selectinload(Enrollment.course).selectinload(Course.provider),
            selectinload(Enrollment.course)
            .selectinload(Course.curriculum_modules)
            .selectinload(CurriculumModule.lessons),
            selectinload(Enrollment.lesson_progress),
        )
    )
    res = await db.execute(stmt)
    enrollment = res.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found or access denied.",
        )

    # Progress lookup
    prog_map = {p.lesson_id: p for p in (enrollment.lesson_progress or [])}

    lesson_items: list[EnrollmentLessonProgressItem] = []
    course = enrollment.course
    provider_name = course.provider.institution_name if (course and course.provider) else None

    sorted_modules = (
        sorted(course.curriculum_modules or [], key=lambda m: (m.order_index, m.created_at))
        if course
        else []
    )

    total_lessons = 0
    completed_lessons = 0

    for mod in sorted_modules:
        sorted_lessons = sorted(
            mod.lessons or [],
            key=lambda les: (les.order_index, les.created_at),
        )
        for les in sorted_lessons:
            total_lessons += 1
            prog_record = prog_map.get(les.id)
            is_comp = prog_record.is_completed if prog_record else False
            comp_time = prog_record.completed_at if prog_record else None

            if is_comp:
                completed_lessons += 1

            lesson_items.append(
                EnrollmentLessonProgressItem(
                    lesson_id=les.id,
                    lesson_title=les.title,
                    module_id=mod.id,
                    module_title=mod.title,
                    order_index=les.order_index,
                    duration_minutes=les.duration_minutes,
                    is_completed=is_comp,
                    completed_at=comp_time,
                )
            )

    progress_pct = round((completed_lessons / total_lessons) * 100, 1) if total_lessons > 0 else 0.0

    return EnrollmentProgressResponse(
        enrollment_id=enrollment.id,
        course_id=enrollment.course_id,
        course_title=course.title if course else "Course",
        provider_name=provider_name,
        status=enrollment.status,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        progress_percent=progress_pct,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        lessons=lesson_items,
    )


async def complete_lesson(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> EnrollmentProgressResponse:
    """Mark a lesson as completed, update progression status,
    and auto-complete course if 100% finished.
    """
    stmt = (
        select(Enrollment)
        .where(
            Enrollment.id == enrollment_id,
            Enrollment.candidate_id == candidate_id,
        )
        .options(
            selectinload(Enrollment.course)
            .selectinload(Course.curriculum_modules)
            .selectinload(CurriculumModule.lessons),
            selectinload(Enrollment.lesson_progress),
        )
    )
    res = await db.execute(stmt)
    enrollment = res.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found or access denied.",
        )

    if enrollment.status == EnrollmentStatus.DROPPED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update progress for a dropped enrollment.",
        )

    # Verify lesson belongs to the enrolled course
    course_lesson_ids: set[uuid.UUID] = set()
    for mod in enrollment.course.curriculum_modules or []:
        for les in mod.lessons or []:
            course_lesson_ids.add(les.id)

    if lesson_id not in course_lesson_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson does not belong to the enrolled course.",
        )

    # Find or create progress record
    prog_stmt = select(EnrollmentLessonProgress).where(
        EnrollmentLessonProgress.enrollment_id == enrollment.id,
        EnrollmentLessonProgress.lesson_id == lesson_id,
    )
    prog_res = await db.execute(prog_stmt)
    prog = prog_res.scalar_one_or_none()

    if not prog:
        prog = EnrollmentLessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=datetime.now(UTC),
        )
        db.add(prog)
    else:
        prog.is_completed = True
        prog.completed_at = datetime.now(UTC)
        db.add(prog)

    # Transition enrollment to IN_PROGRESS if ENROLLED
    if enrollment.status == EnrollmentStatus.ENROLLED:
        enrollment.status = EnrollmentStatus.IN_PROGRESS
        db.add(enrollment)

    await db.flush()

    # Re-check all lessons completion status
    all_prog_stmt = select(EnrollmentLessonProgress).where(
        EnrollmentLessonProgress.enrollment_id == enrollment.id
    )
    all_prog_res = await db.execute(all_prog_stmt)
    all_prog = all_prog_res.scalars().all()

    completed_lesson_ids = {p.lesson_id for p in all_prog if p.is_completed}
    if course_lesson_ids and course_lesson_ids.issubset(completed_lesson_ids):
        # All lessons are complete -> Automatically transition to COMPLETED
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_at = datetime.now(UTC)
        db.add(enrollment)

    await db.commit()

    return await get_enrollment_progress(db, candidate_id, enrollment_id)

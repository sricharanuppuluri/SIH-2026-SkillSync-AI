"""Candidate Learning API endpoints for course discovery, enrollment, and progress tracking."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.course import CourseDifficulty, CourseMode
from app.models.enrollment import EnrollmentStatus
from app.models.user import User, UserRole
from app.schemas.course import CourseResponse
from app.schemas.enrollment import (
    EnrollmentProgressResponse,
    EnrollmentResponse,
)
from app.services import (
    candidate_service,
    enrollment_service,
    training_course_service,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Course Discovery
# ---------------------------------------------------------------------------
@router.get(
    "/courses",
    response_model=list[CourseResponse],
    summary="Browse published training courses",
)
async def list_public_courses(
    search: str | None = Query(None, description="Search courses by keyword"),
    skill_id: uuid.UUID | None = Query(None, description="Filter by canonical skill ID"),
    difficulty: CourseDifficulty | None = Query(None, description="Filter by difficulty"),
    mode: CourseMode | None = Query(None, description="Filter by course delivery mode"),
    category: str | None = Query(None, description="Filter by course category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[CourseResponse]:
    """Retrieve catalog of published training courses available for enrollment."""
    return await training_course_service.list_public_courses(
        db,
        search=search,
        skill_id=skill_id,
        difficulty=difficulty,
        mode=mode,
        category=category,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/courses/{course_id}",
    response_model=CourseResponse,
    summary="Get published course details and curriculum",
)
async def get_public_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CourseResponse:
    """Retrieve details, canonical skills covered, curriculum structure, and remaining capacity."""
    return await training_course_service.get_public_course_detail(db, course_id)


# ---------------------------------------------------------------------------
# Enrollment & Progress
# ---------------------------------------------------------------------------
@router.post(
    "/courses/{course_id}/enroll",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll in a training course",
)
async def enroll_in_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> EnrollmentResponse:
    """Enroll candidate in published course with transactional capacity verification."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await enrollment_service.enroll_candidate(
        db, candidate_id=profile.id, course_id=course_id
    )


@router.get(
    "/enrollments",
    response_model=list[EnrollmentResponse],
    summary="List candidate's course enrollments",
)
async def list_enrollments(
    status: EnrollmentStatus | None = Query(None, description="Filter by enrollment status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[EnrollmentResponse]:
    """Retrieve all training enrollments with calculated completion progress."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await enrollment_service.get_candidate_enrollments(
        db, candidate_id=profile.id, status_filter=status
    )


@router.get(
    "/enrollments/{enrollment_id}",
    response_model=EnrollmentProgressResponse,
    summary="Get detailed enrollment lesson progress",
)
async def get_enrollment_progress(
    enrollment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> EnrollmentProgressResponse:
    """Retrieve breakdown of completed vs remaining lessons across course modules."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await enrollment_service.get_enrollment_progress(
        db, candidate_id=profile.id, enrollment_id=enrollment_id
    )


@router.post(
    "/enrollments/{enrollment_id}/lessons/{lesson_id}/complete",
    response_model=EnrollmentProgressResponse,
    summary="Mark a curriculum lesson as completed",
)
async def mark_lesson_complete(
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> EnrollmentProgressResponse:
    """Mark a lesson complete and automatically transition enrollment to COMPLETED
    if all lessons are done.
    """
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await enrollment_service.complete_lesson(
        db,
        candidate_id=profile.id,
        enrollment_id=enrollment_id,
        lesson_id=lesson_id,
    )

"""Course curriculum endpoints for viewing and provider offerings."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseResponse
from app.services import course_service, profile_service

router = APIRouter()


@router.get(
    "",
    response_model=list[CourseResponse],
    summary="List training courses",
)
async def list_courses(
    provider_id: uuid.UUID | None = Query(None, description="Filter by training provider ID"),
    is_active: bool | None = Query(None, description="Filter active/inactive courses"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[CourseResponse]:
    """Retrieve catalog of courses with attached skill curriculum."""
    courses = await course_service.get_courses(
        db, provider_id=provider_id, is_active=is_active, skip=skip, limit=limit
    )
    return [CourseResponse.model_validate(c) for c in courses]


@router.get(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Get course by ID",
)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """Retrieve single course by UUID."""
    course = await course_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID {course_id} not found",
        )
    return CourseResponse.model_validate(course)


@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course offering",
)
async def create_course(
    req: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Publish a new vocational or academic course. Requires Training Provider or Admin role."""
    provider_profile = await profile_service.get_or_create_training_provider_profile(
        db, current_user
    )
    course = await course_service.create_course(db, provider_profile.id, req)
    return CourseResponse.model_validate(course)

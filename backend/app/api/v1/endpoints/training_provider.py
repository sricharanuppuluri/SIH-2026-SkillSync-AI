"""Training Provider API endpoints for dashboard, profile, course lifecycle, curriculum,
and candidate enrollments.
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.course import CourseStatus
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.schemas.curriculum import (
    CurriculumLessonCreate,
    CurriculumLessonReorderItem,
    CurriculumLessonResponse,
    CurriculumLessonUpdate,
    CurriculumModuleCreate,
    CurriculumModuleReorderItem,
    CurriculumModuleResponse,
    CurriculumModuleUpdate,
)
from app.schemas.profiles import (
    TrainingProviderProfileResponse,
    TrainingProviderProfileUpdate,
)
from app.schemas.training_provider import TrainingProviderDashboardResponse
from app.services import (
    curriculum_service,
    training_course_service,
    training_provider_service,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Profile & Dashboard
# ---------------------------------------------------------------------------
@router.get(
    "/profile",
    response_model=TrainingProviderProfileResponse,
    summary="Get authenticated provider profile",
)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> TrainingProviderProfileResponse:
    """Retrieve or initialize profile details for the authenticated training provider."""
    return await training_provider_service.get_provider_profile_dto(db, current_user)


@router.put(
    "/profile",
    response_model=TrainingProviderProfileResponse,
    summary="Update authenticated provider profile",
)
async def update_profile(
    req: TrainingProviderProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> TrainingProviderProfileResponse:
    """Update institution name, type, location, website, and contact info."""
    return await training_provider_service.update_provider_profile(db, current_user, req)


@router.get(
    "/dashboard",
    response_model=TrainingProviderDashboardResponse,
    summary="Get training provider dashboard metrics",
)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> TrainingProviderDashboardResponse:
    """Retrieve live statistics on courses, capacity, and candidate enrollments."""
    return await training_provider_service.get_provider_dashboard(db, current_user)


# ---------------------------------------------------------------------------
# Course Management
# ---------------------------------------------------------------------------
@router.get(
    "/courses",
    response_model=list[CourseResponse],
    summary="List courses owned by authenticated provider",
)
async def list_courses(
    status: CourseStatus | None = Query(None, description="Filter by course status"),
    search: str | None = Query(None, description="Search courses by keyword"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> list[CourseResponse]:
    """Retrieve all courses created by the provider."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.list_provider_courses(
        db,
        provider_id=profile.id,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new training course (Draft)",
)
async def create_course(
    req: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Create a new course in DRAFT status attached to canonical skills."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.create_course(db, provider_id=profile.id, data=req)


@router.get(
    "/courses/{course_id}",
    response_model=CourseResponse,
    summary="Get course detail owned by provider",
)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Retrieve full course detail including canonical skills and curriculum modules."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.get_provider_course(
        db, provider_id=profile.id, course_id=course_id
    )


@router.put(
    "/courses/{course_id}",
    response_model=CourseResponse,
    summary="Update course details owned by provider",
)
async def update_course(
    course_id: uuid.UUID,
    req: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Update title, description, capacity, duration, mode, or canonical skills."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.update_course(
        db, provider_id=profile.id, course_id=course_id, data=req
    )


@router.delete(
    "/courses/{course_id}",
    summary="Delete or soft-close a course",
)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> dict:
    """Delete course if un-enrolled, or soft-close if enrollments exist to preserve history."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.delete_or_close_course(
        db, provider_id=profile.id, course_id=course_id
    )


@router.post(
    "/courses/{course_id}/publish",
    response_model=CourseResponse,
    summary="Publish course to public catalog",
)
async def publish_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Validate course curriculum, skills, capacity and transition status to PUBLISHED."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.publish_course(
        db, provider_id=profile.id, course_id=course_id
    )


@router.post(
    "/courses/{course_id}/close",
    response_model=CourseResponse,
    summary="Close course to new enrollments",
)
async def close_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Transition course status to CLOSED."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.close_course(
        db, provider_id=profile.id, course_id=course_id
    )


# ---------------------------------------------------------------------------
# Canonical Skills Mapping
# ---------------------------------------------------------------------------
@router.post(
    "/courses/{course_id}/skills",
    response_model=CourseResponse,
    summary="Attach canonical skills to course",
)
async def add_skills(
    course_id: uuid.UUID,
    skill_ids: list[uuid.UUID],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Map canonical skills from catalog to the course."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.add_skills_to_course(
        db, provider_id=profile.id, course_id=course_id, skill_ids=skill_ids
    )


@router.delete(
    "/courses/{course_id}/skills/{skill_id}",
    response_model=CourseResponse,
    summary="Remove canonical skill mapping from course",
)
async def remove_skill(
    course_id: uuid.UUID,
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CourseResponse:
    """Remove a canonical skill relationship from the course."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await training_course_service.remove_skill_from_course(
        db, provider_id=profile.id, course_id=course_id, skill_id=skill_id
    )


# ---------------------------------------------------------------------------
# Curriculum Modules & Lessons
# ---------------------------------------------------------------------------
@router.get(
    "/courses/{course_id}/curriculum",
    response_model=list[CurriculumModuleResponse],
    summary="Get course curriculum modules and lessons",
)
async def get_curriculum(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> list[CurriculumModuleResponse]:
    """Retrieve full curriculum hierarchy for a course."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.get_course_curriculum(
        db, course_id=course_id, provider_id=profile.id
    )


@router.post(
    "/courses/{course_id}/curriculum/modules",
    response_model=CurriculumModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add curriculum module to course",
)
async def create_module(
    course_id: uuid.UUID,
    req: CurriculumModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CurriculumModuleResponse:
    """Create a new module within course curriculum."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.create_module(
        db, provider_id=profile.id, course_id=course_id, data=req
    )


@router.put(
    "/courses/{course_id}/curriculum/modules/{module_id}",
    response_model=CurriculumModuleResponse,
    summary="Update curriculum module",
)
async def update_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    req: CurriculumModuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CurriculumModuleResponse:
    """Update title, description, or order of a curriculum module."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.update_module(
        db, provider_id=profile.id, course_id=course_id, module_id=module_id, data=req
    )


@router.delete(
    "/courses/{course_id}/curriculum/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete curriculum module",
)
async def delete_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> None:
    """Delete a curriculum module with cascade deletion to its lessons."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    await curriculum_service.delete_module(
        db, provider_id=profile.id, course_id=course_id, module_id=module_id
    )


@router.put(
    "/courses/{course_id}/curriculum/modules-reorder",
    response_model=list[CurriculumModuleResponse],
    summary="Reorder curriculum modules",
)
async def reorder_modules(
    course_id: uuid.UUID,
    items: list[CurriculumModuleReorderItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> list[CurriculumModuleResponse]:
    """Reorder multiple modules by updating order_index."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.reorder_modules(
        db, provider_id=profile.id, course_id=course_id, items=items
    )


@router.post(
    "/courses/{course_id}/curriculum/modules/{module_id}/lessons",
    response_model=CurriculumLessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add lesson to curriculum module",
)
async def create_lesson(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    req: CurriculumLessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CurriculumLessonResponse:
    """Add a lesson unit inside a curriculum module."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.create_lesson(
        db, provider_id=profile.id, course_id=course_id, module_id=module_id, data=req
    )


@router.put(
    "/courses/{course_id}/curriculum/modules/{module_id}/lessons/{lesson_id}",
    response_model=CurriculumLessonResponse,
    summary="Update curriculum lesson",
)
async def update_lesson(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
    req: CurriculumLessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> CurriculumLessonResponse:
    """Update lesson title, description, content, duration, or order."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.update_lesson(
        db,
        provider_id=profile.id,
        course_id=course_id,
        module_id=module_id,
        lesson_id=lesson_id,
        data=req,
    )


@router.delete(
    "/courses/{course_id}/curriculum/modules/{module_id}/lessons/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete curriculum lesson",
)
async def delete_lesson(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> None:
    """Delete a curriculum lesson unit."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    await curriculum_service.delete_lesson(
        db,
        provider_id=profile.id,
        course_id=course_id,
        module_id=module_id,
        lesson_id=lesson_id,
    )


@router.put(
    "/courses/{course_id}/curriculum/modules/{module_id}/lessons-reorder",
    response_model=list[CurriculumLessonResponse],
    summary="Reorder curriculum lessons",
)
async def reorder_lessons(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    items: list[CurriculumLessonReorderItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> list[CurriculumLessonResponse]:
    """Reorder multiple lessons within a module."""
    profile = await training_provider_service.get_or_create_provider_profile(db, current_user)
    return await curriculum_service.reorder_lessons(
        db,
        provider_id=profile.id,
        course_id=course_id,
        module_id=module_id,
        items=items,
    )

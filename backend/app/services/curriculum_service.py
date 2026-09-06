"""Curriculum domain service handling module and lesson CRUD and deterministic ordering."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.curriculum import CurriculumLesson, CurriculumModule
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


async def _verify_course_ownership(
    db: AsyncSession, provider_id: uuid.UUID, course_id: uuid.UUID
) -> Course:
    """Verify that the course exists and is owned by the authenticated provider."""
    stmt = select(Course).where(Course.id == course_id)
    res = await db.execute(stmt)
    course = res.scalar_one_or_none()
    if not course or course.provider_id != provider_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied.",
        )
    return course


async def get_course_curriculum(
    db: AsyncSession,
    course_id: uuid.UUID,
    provider_id: uuid.UUID | None = None,
) -> list[CurriculumModuleResponse]:
    """Retrieve full curriculum hierarchy (modules and ordered lessons) for a course."""
    if provider_id is not None:
        await _verify_course_ownership(db, provider_id, course_id)

    stmt = (
        select(CurriculumModule)
        .where(CurriculumModule.course_id == course_id)
        .options(selectinload(CurriculumModule.lessons))
        .order_by(CurriculumModule.order_index.asc(), CurriculumModule.created_at.asc())
    )
    res = await db.execute(stmt)
    modules = res.scalars().all()

    result: list[CurriculumModuleResponse] = []
    for m in modules:
        sorted_lessons = sorted(m.lessons or [], key=lambda les: (les.order_index, les.created_at))
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
            for les in sorted_lessons
        ]
        result.append(
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
    return result


async def create_module(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    data: CurriculumModuleCreate,
) -> CurriculumModuleResponse:
    """Create a new curriculum module with optional initial lessons."""
    await _verify_course_ownership(db, provider_id, course_id)

    # Determine order index if not specified
    count_stmt = select(func.count(CurriculumModule.id)).where(
        CurriculumModule.course_id == course_id
    )
    count_res = await db.execute(count_stmt)
    existing_count = count_res.scalar() or 0

    order_index = data.order_index if data.order_index > 0 else (existing_count + 1)

    module = CurriculumModule(
        course_id=course_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        order_index=order_index,
    )
    db.add(module)
    await db.flush()

    # Create nested lessons if provided
    created_lessons: list[CurriculumLesson] = []
    if data.lessons:
        for idx, l_in in enumerate(data.lessons, start=1):
            lesson = CurriculumLesson(
                module_id=module.id,
                title=l_in.title.strip(),
                description=l_in.description.strip() if l_in.description else None,
                content=l_in.content.strip() if l_in.content else None,
                duration_minutes=max(1, l_in.duration_minutes),
                order_index=l_in.order_index if l_in.order_index > 0 else idx,
            )
            db.add(lesson)
            created_lessons.append(lesson)

    await db.commit()
    await db.refresh(module)

    # Reload with lessons
    stmt = (
        select(CurriculumModule)
        .where(CurriculumModule.id == module.id)
        .options(selectinload(CurriculumModule.lessons))
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()

    return CurriculumModuleResponse(
        id=reloaded.id,
        course_id=reloaded.course_id,
        title=reloaded.title,
        description=reloaded.description,
        order_index=reloaded.order_index,
        created_at=reloaded.created_at,
        updated_at=reloaded.updated_at,
        lessons=[
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
            for les in reloaded.lessons
        ],
    )


async def update_module(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    data: CurriculumModuleUpdate,
) -> CurriculumModuleResponse:
    """Update a curriculum module title, description, or order index."""
    await _verify_course_ownership(db, provider_id, course_id)

    stmt = (
        select(CurriculumModule)
        .where(
            CurriculumModule.id == module_id,
            CurriculumModule.course_id == course_id,
        )
        .options(selectinload(CurriculumModule.lessons))
    )
    res = await db.execute(stmt)
    module = res.scalar_one_or_none()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum module not found.",
        )

    if data.title is not None and data.title.strip():
        module.title = data.title.strip()
    if data.description is not None:
        module.description = data.description.strip() if data.description.strip() else None
    if data.order_index is not None:
        module.order_index = max(1, data.order_index)

    db.add(module)
    await db.commit()
    await db.refresh(module)

    return CurriculumModuleResponse(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        created_at=module.created_at,
        updated_at=module.updated_at,
        lessons=[
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
            for les in module.lessons
        ],
    )


async def delete_module(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
) -> None:
    """Delete a curriculum module with cascading deletion of lessons."""
    await _verify_course_ownership(db, provider_id, course_id)

    stmt = select(CurriculumModule).where(
        CurriculumModule.id == module_id,
        CurriculumModule.course_id == course_id,
    )
    res = await db.execute(stmt)
    module = res.scalar_one_or_none()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum module not found.",
        )

    await db.delete(module)
    await db.commit()


async def reorder_modules(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    items: list[CurriculumModuleReorderItem],
) -> list[CurriculumModuleResponse]:
    """Update order indices for multiple curriculum modules."""
    await _verify_course_ownership(db, provider_id, course_id)

    for item in items:
        stmt = select(CurriculumModule).where(
            CurriculumModule.id == item.module_id,
            CurriculumModule.course_id == course_id,
        )
        res = await db.execute(stmt)
        mod = res.scalar_one_or_none()
        if mod:
            mod.order_index = item.order_index
            db.add(mod)

    await db.commit()
    return await get_course_curriculum(db, course_id, provider_id)


# ---------------------------------------------------------------------------
# Lesson CRUD & Reordering
# ---------------------------------------------------------------------------
async def create_lesson(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    data: CurriculumLessonCreate,
) -> CurriculumLessonResponse:
    """Create a new lesson inside a specified curriculum module."""
    await _verify_course_ownership(db, provider_id, course_id)

    stmt = select(CurriculumModule).where(
        CurriculumModule.id == module_id,
        CurriculumModule.course_id == course_id,
    )
    res = await db.execute(stmt)
    module = res.scalar_one_or_none()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum module not found.",
        )

    count_stmt = select(func.count(CurriculumLesson.id)).where(
        CurriculumLesson.module_id == module_id
    )
    count_res = await db.execute(count_stmt)
    existing_count = count_res.scalar() or 0

    order_index = data.order_index if data.order_index > 0 else (existing_count + 1)

    lesson = CurriculumLesson(
        module_id=module_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        content=data.content.strip() if data.content else None,
        duration_minutes=max(1, data.duration_minutes),
        order_index=order_index,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    return CurriculumLessonResponse(
        id=lesson.id,
        module_id=lesson.module_id,
        title=lesson.title,
        description=lesson.description,
        content=lesson.content,
        duration_minutes=lesson.duration_minutes,
        order_index=lesson.order_index,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
    )


async def update_lesson(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
    data: CurriculumLessonUpdate,
) -> CurriculumLessonResponse:
    """Update lesson content, duration, title, or order index."""
    await _verify_course_ownership(db, provider_id, course_id)

    stmt = select(CurriculumLesson).where(
        CurriculumLesson.id == lesson_id,
        CurriculumLesson.module_id == module_id,
    )
    res = await db.execute(stmt)
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum lesson not found.",
        )

    if data.title is not None and data.title.strip():
        lesson.title = data.title.strip()
    if data.description is not None:
        lesson.description = data.description.strip() if data.description.strip() else None
    if data.content is not None:
        lesson.content = data.content.strip() if data.content.strip() else None
    if data.duration_minutes is not None:
        lesson.duration_minutes = max(1, data.duration_minutes)
    if data.order_index is not None:
        lesson.order_index = max(1, data.order_index)

    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    return CurriculumLessonResponse(
        id=lesson.id,
        module_id=lesson.module_id,
        title=lesson.title,
        description=lesson.description,
        content=lesson.content,
        duration_minutes=lesson.duration_minutes,
        order_index=lesson.order_index,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
    )


async def delete_lesson(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> None:
    """Delete an individual curriculum lesson."""
    await _verify_course_ownership(db, provider_id, course_id)

    stmt = select(CurriculumLesson).where(
        CurriculumLesson.id == lesson_id,
        CurriculumLesson.module_id == module_id,
    )
    res = await db.execute(stmt)
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curriculum lesson not found.",
        )

    await db.delete(lesson)
    await db.commit()


async def reorder_lessons(
    db: AsyncSession,
    provider_id: uuid.UUID,
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    items: list[CurriculumLessonReorderItem],
) -> list[CurriculumLessonResponse]:
    """Update order indices for multiple curriculum lessons inside a module."""
    await _verify_course_ownership(db, provider_id, course_id)

    for item in items:
        stmt = select(CurriculumLesson).where(
            CurriculumLesson.id == item.lesson_id,
            CurriculumLesson.module_id == module_id,
        )
        res = await db.execute(stmt)
        les = res.scalar_one_or_none()
        if les:
            les.order_index = item.order_index
            db.add(les)

    await db.commit()

    # Return updated list
    stmt = (
        select(CurriculumLesson)
        .where(CurriculumLesson.module_id == module_id)
        .order_by(CurriculumLesson.order_index.asc())
    )
    res = await db.execute(stmt)
    lessons = res.scalars().all()
    return [
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
        for les in lessons
    ]

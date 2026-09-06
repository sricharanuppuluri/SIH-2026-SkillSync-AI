"""Curriculum Module and Lesson Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CurriculumLessonBase(BaseModel):
    """Base attributes for a curriculum lesson."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    content: str | None = None
    duration_minutes: int = Field(default=30, ge=1)
    order_index: int = Field(default=1, ge=1)


class CurriculumLessonCreate(CurriculumLessonBase):
    """Payload for creating a curriculum lesson."""

    pass


class CurriculumLessonUpdate(BaseModel):
    """Payload for updating a curriculum lesson."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    content: str | None = None
    duration_minutes: int | None = Field(default=None, ge=1)
    order_index: int | None = Field(default=None, ge=1)


class CurriculumLessonResponse(CurriculumLessonBase):
    """Serialized curriculum lesson."""

    id: uuid.UUID
    module_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CurriculumModuleBase(BaseModel):
    """Base attributes for a curriculum module."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    order_index: int = Field(default=1, ge=1)


class CurriculumModuleCreate(CurriculumModuleBase):
    """Payload for creating a curriculum module."""

    lessons: list[CurriculumLessonCreate] = Field(default_factory=list)


class CurriculumModuleUpdate(BaseModel):
    """Payload for updating a curriculum module."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    order_index: int | None = Field(default=None, ge=1)


class CurriculumModuleResponse(CurriculumModuleBase):
    """Serialized curriculum module with nested lessons."""

    id: uuid.UUID
    course_id: uuid.UUID
    lessons: list[CurriculumLessonResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CurriculumModuleReorderItem(BaseModel):
    """Item for reordering curriculum modules."""

    module_id: uuid.UUID
    order_index: int = Field(..., ge=1)


class CurriculumLessonReorderItem(BaseModel):
    """Item for reordering curriculum lessons."""

    lesson_id: uuid.UUID
    order_index: int = Field(..., ge=1)

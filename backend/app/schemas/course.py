"""Course and Course-Skill Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.course import CourseMode


class CourseSkillRequirement(BaseModel):
    """Specification of a skill taught in a course."""

    skill_id: uuid.UUID


class CourseSkillResponse(BaseModel):
    """Serialized representation of a course-skill relationship."""

    id: uuid.UUID
    skill_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class CourseBase(BaseModel):
    """Base attributes for training courses."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    duration_hours: int = Field(default=40, ge=1)
    mode: CourseMode = CourseMode.ONLINE
    capacity: int = Field(default=30, ge=1)
    location_city: str | None = Field(default=None, max_length=100)
    is_active: bool = True


class CourseCreate(CourseBase):
    """Payload for training provider course creation."""

    skills: list[CourseSkillRequirement] = Field(default_factory=list)


class CourseUpdate(BaseModel):
    """Payload for updating an existing course."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, min_length=10)
    duration_hours: int | None = Field(default=None, ge=1)
    mode: CourseMode | None = None
    capacity: int | None = Field(default=None, ge=1)
    location_city: str | None = None
    is_active: bool | None = None
    skills: list[CourseSkillRequirement] | None = None


class CourseResponse(CourseBase):
    """Serialized representation of a course."""

    id: uuid.UUID
    provider_id: uuid.UUID
    skills: list[CourseSkillResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

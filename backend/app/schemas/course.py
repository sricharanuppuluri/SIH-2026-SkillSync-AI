"""Course and Course-Skill Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.course import CourseDifficulty, CourseMode, CourseStatus
from app.schemas.curriculum import CurriculumModuleResponse


class CourseSkillRequirement(BaseModel):
    """Specification of a skill taught in a course."""

    skill_id: uuid.UUID


class CourseSkillResponse(BaseModel):
    """Serialized representation of a course-skill relationship."""

    id: uuid.UUID
    course_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str | None = None
    skill_code: str | None = None
    name: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_name(self) -> "CourseSkillResponse":
        if self.name is None and self.skill_name is not None:
            self.name = self.skill_name
        elif self.skill_name is None and self.name is not None:
            self.skill_name = self.name
        return self


class CourseBase(BaseModel):
    """Base attributes for training courses."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    category: str | None = Field(default=None, max_length=100)
    duration_hours: int = Field(default=40, ge=1)
    difficulty: CourseDifficulty = CourseDifficulty.INTERMEDIATE
    mode: CourseMode = CourseMode.ONLINE
    delivery_mode: CourseMode | None = None
    capacity: int = Field(default=30, ge=1)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)
    start_date: datetime | None = None
    end_date: datetime | None = None
    enrollment_deadline: datetime | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def sync_delivery_mode(self) -> "CourseBase":
        if self.delivery_mode is None and self.mode is not None:
            self.delivery_mode = self.mode
        elif self.mode is None and self.delivery_mode is not None:
            self.mode = self.delivery_mode
        return self


class CourseCreate(CourseBase):
    """Payload for training provider course creation."""

    skills: list[CourseSkillRequirement] = Field(default_factory=list)
    skill_ids: list[uuid.UUID] = Field(default_factory=list)


class CourseUpdate(BaseModel):
    """Payload for updating an existing course."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, min_length=10)
    category: str | None = Field(default=None, max_length=100)
    duration_hours: int | None = Field(default=None, ge=1)
    difficulty: CourseDifficulty | None = None
    mode: CourseMode | None = None
    delivery_mode: CourseMode | None = None
    capacity: int | None = Field(default=None, ge=1)
    location_city: str | None = None
    location_state: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    enrollment_deadline: datetime | None = None
    is_active: bool | None = None
    skills: list[CourseSkillRequirement] | None = None
    skill_ids: list[uuid.UUID] | None = None

    @model_validator(mode="after")
    def sync_mode(self) -> "CourseUpdate":
        if self.mode is None and self.delivery_mode is not None:
            self.mode = self.delivery_mode
        elif self.delivery_mode is None and self.mode is not None:
            self.delivery_mode = self.mode
        return self


class CourseResponse(CourseBase):
    """Serialized representation of a course."""

    id: uuid.UUID
    provider_id: uuid.UUID
    provider_name: str | None = None
    status: CourseStatus = CourseStatus.DRAFT
    skills: list[CourseSkillResponse] = Field(default_factory=list)
    curriculum_modules: list[CurriculumModuleResponse] = Field(default_factory=list)
    enrolled_count: int = 0
    remaining_capacity: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CoursePublishValidationResult(BaseModel):
    """Validation result when attempting to publish a course."""

    is_valid: bool
    errors: list[str] = Field(default_factory=list)

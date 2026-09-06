"""Job requisition and Job-Skill Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import EmploymentType, ExperienceLevel


class JobSkillRequirement(BaseModel):
    """Specification of a skill required by a job."""

    skill_id: uuid.UUID
    is_required: bool = True
    minimum_proficiency: str = Field(default="INTERMEDIATE", max_length=50)
    weight: float = Field(default=1.0, ge=0.0, le=10.0)


class JobSkillResponse(BaseModel):
    """Serialized representation of a job-skill relationship."""

    id: uuid.UUID
    skill_id: uuid.UUID
    is_required: bool
    minimum_proficiency: str
    weight: float

    model_config = ConfigDict(from_attributes=True)


class JobBase(BaseModel):
    """Base attributes for job requisitions."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)
    is_remote: bool = False
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    experience_level: ExperienceLevel = ExperienceLevel.MID
    salary_min: float | None = Field(default=None, ge=0)
    salary_max: float | None = Field(default=None, ge=0)
    is_active: bool = True


class JobCreate(JobBase):
    """Payload for employer job posting."""

    skills: list[JobSkillRequirement] = Field(default_factory=list)


class JobUpdate(BaseModel):
    """Payload for updating an existing job."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, min_length=10)
    location_city: str | None = None
    location_state: str | None = None
    is_remote: bool | None = None
    employment_type: EmploymentType | None = None
    experience_level: ExperienceLevel | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    is_active: bool | None = None
    skills: list[JobSkillRequirement] | None = None


class JobResponse(JobBase):
    """Serialized representation of a job posting."""

    id: uuid.UUID
    employer_id: uuid.UUID
    skills: list[JobSkillResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

"""Pydantic schemas for the candidate domain module."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.candidate_skill import ProficiencyLevel


# ---------------------------------------------------------------------------
# Candidate Profile Schemas
# ---------------------------------------------------------------------------
class CandidateProfileRead(BaseModel):
    """Detailed candidate profile read schema."""

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    headline: str | None = None
    bio: str | None = None
    current_role: str | None = None
    experience_years: float = 0.0
    education_level: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    resume_filename: str | None = None
    resume_file_size: int | None = None
    resume_uploaded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateProfileUpdate(BaseModel):
    """Update schema for candidate profile."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    headline: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    current_role: str | None = Field(default=None, max_length=100)
    experience_years: float | None = Field(default=None, ge=0.0)
    education_level: str | None = Field(default=None, max_length=100)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)


# ---------------------------------------------------------------------------
# Candidate Skill Schemas
# ---------------------------------------------------------------------------
class CandidateSkillCreate(BaseModel):
    """Request schema for associating a canonical skill with candidate."""

    skill_id: uuid.UUID
    proficiency: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE
    years_experience: float = Field(default=0.0, ge=0.0)


class CandidateSkillUpdate(BaseModel):
    """Request schema for updating proficiency or experience of an attached skill."""

    proficiency: ProficiencyLevel | None = None
    years_experience: float | None = Field(default=None, ge=0.0)


class CandidateSkillResponse(BaseModel):
    """Response schema for a candidate-linked skill."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str
    category: str
    skill_type: str
    proficiency: ProficiencyLevel
    years_experience: float
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Candidate Education Schemas
# ---------------------------------------------------------------------------
class CandidateEducationCreate(BaseModel):
    """Request schema for adding education entry."""

    institution: str = Field(..., min_length=1, max_length=255)
    degree: str = Field(..., min_length=1, max_length=100)
    field_of_study: str | None = Field(default=None, max_length=100)
    start_year: int | None = Field(default=None, ge=1900, le=2100)
    end_year: int | None = Field(default=None, ge=1900, le=2100)
    is_current: bool = False
    grade: str | None = Field(default=None, max_length=50)
    description: str | None = None


class CandidateEducationUpdate(BaseModel):
    """Request schema for modifying an education entry."""

    institution: str | None = Field(default=None, min_length=1, max_length=255)
    degree: str | None = Field(default=None, min_length=1, max_length=100)
    field_of_study: str | None = Field(default=None, max_length=100)
    start_year: int | None = Field(default=None, ge=1900, le=2100)
    end_year: int | None = Field(default=None, ge=1900, le=2100)
    is_current: bool | None = None
    grade: str | None = Field(default=None, max_length=50)
    description: str | None = None


class CandidateEducationResponse(BaseModel):
    """Response schema for an education entry."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    institution: str
    degree: str
    field_of_study: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    is_current: bool
    grade: str | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Candidate Experience Schemas
# ---------------------------------------------------------------------------
class CandidateExperienceCreate(BaseModel):
    """Request schema for adding professional experience."""

    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=100)
    employment_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=100)
    start_date: str | None = Field(default=None, max_length=50)
    end_date: str | None = Field(default=None, max_length=50)
    is_current: bool = False
    description: str | None = None


class CandidateExperienceUpdate(BaseModel):
    """Request schema for updating professional experience."""

    company: str | None = Field(default=None, min_length=1, max_length=255)
    title: str | None = Field(default=None, min_length=1, max_length=100)
    employment_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=100)
    start_date: str | None = Field(default=None, max_length=50)
    end_date: str | None = Field(default=None, max_length=50)
    is_current: bool | None = None
    description: str | None = None


class CandidateExperienceResponse(BaseModel):
    """Response schema for professional experience."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    company: str
    title: str
    employment_type: str | None = None
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Resume Schemas
# ---------------------------------------------------------------------------
class CandidateResumeUploadRequest(BaseModel):
    """Resume metadata and optional content upload."""

    filename: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., ge=0)
    resume_text: str | None = None


class CandidateResumeResponse(BaseModel):
    """Resume metadata response."""

    filename: str | None = None
    file_size: int | None = None
    uploaded_at: datetime | None = None
    has_resume: bool = False


# ---------------------------------------------------------------------------
# Profile Completeness & Dashboard Schemas
# ---------------------------------------------------------------------------
class ProfileCompletenessResponse(BaseModel):
    """Deterministic profile completeness score and section breakdown."""

    percentage: int
    completed_sections: list[str]
    missing_sections: list[str]
    section_scores: dict[str, int]


class CandidateDashboardResponse(BaseModel):
    """Aggregated metrics for candidate dashboard."""

    profile: CandidateProfileRead
    completeness: ProfileCompletenessResponse
    skills_count: int
    skills_by_proficiency: dict[str, int]
    experience_count: int
    education_count: int
    recent_experiences: list[CandidateExperienceResponse]
    highest_education: CandidateEducationResponse | None = None

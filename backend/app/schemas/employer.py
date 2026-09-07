"""Employer domain Pydantic schemas for dashboard, applicants, and job management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.application import ApplicationStatus
from app.models.job import JobStatus


class EmployerDashboardMetrics(BaseModel):
    """Aggregated numerical metrics for employer portal."""

    total_jobs: int = 0
    published_jobs: int = 0
    draft_jobs: int = 0
    closed_jobs: int = 0
    total_applications: int = 0
    applications_by_status: dict[str, int] = Field(default_factory=dict)


class EmployerRecentJobItem(BaseModel):
    """Snapshot of a recent job requisition for dashboard display."""

    id: uuid.UUID
    title: str
    status: JobStatus
    location_city: str | None = None
    applications_count: int = 0
    skills_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployerRecentApplicationItem(BaseModel):
    """Snapshot of a recent candidate application for dashboard display."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_headline: str | None = None
    job_id: uuid.UUID
    job_title: str
    status: ApplicationStatus
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployerDashboardResponse(BaseModel):
    """Comprehensive real-time dashboard data payload."""

    metrics: EmployerDashboardMetrics
    recent_jobs: list[EmployerRecentJobItem] = Field(default_factory=list)
    recent_applications: list[EmployerRecentApplicationItem] = Field(default_factory=list)


class EmployerApplicationCandidateInfo(BaseModel):
    """Safe candidate profile and identity details presented to employers."""

    id: uuid.UUID
    full_name: str
    email: str
    headline: str | None = None
    bio: str | None = None
    experience_years: float = 0.0
    education_level: str | None = None
    location_city: str | None = None
    location_state: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EmployerApplicationResponse(BaseModel):
    """Detailed job application representation for employer review."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    status: ApplicationStatus
    cover_note: str | None = None
    applied_at: datetime
    candidate: EmployerApplicationCandidateInfo

    model_config = ConfigDict(from_attributes=True)


class EmployerApplicationStatusUpdate(BaseModel):
    """Payload for updating candidate job application status."""

    status: ApplicationStatus

"""Course training enrollment Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enrollment import EnrollmentStatus


class EnrollmentCreate(BaseModel):
    """Payload for enrolling in a training course."""

    course_id: uuid.UUID


class EnrollmentUpdate(BaseModel):
    """Payload for updating enrollment status."""

    status: EnrollmentStatus | None = None


class EnrollmentLessonProgressItem(BaseModel):
    """Progress status for a single lesson."""

    lesson_id: uuid.UUID
    lesson_title: str
    module_id: uuid.UUID
    module_title: str
    order_index: int
    duration_minutes: int
    is_completed: bool
    completed_at: datetime | None = None


class EnrollmentProgressResponse(BaseModel):
    """Full progress report for a candidate enrollment."""

    enrollment_id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    provider_name: str | None = None
    status: EnrollmentStatus
    total_lessons: int
    completed_lessons: int
    progress_percent: float
    enrolled_at: datetime
    completed_at: datetime | None = None
    lessons: list[EnrollmentLessonProgressItem] = Field(default_factory=list)


class EnrollmentCandidateInfo(BaseModel):
    """Candidate details for training provider enrollment view."""

    enrollment_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_email: str
    course_id: uuid.UUID
    course_title: str
    status: EnrollmentStatus
    progress_percent: float = 0.0
    enrolled_at: datetime
    completed_at: datetime | None = None


class EnrollmentResponse(BaseModel):
    """Serialized representation of a course enrollment."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    course_id: uuid.UUID
    course_title: str | None = None
    provider_name: str | None = None
    status: EnrollmentStatus
    progress_percent: float = 0.0
    enrolled_at: datetime
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

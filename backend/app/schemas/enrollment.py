"""Course training enrollment Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enrollment import EnrollmentStatus


class EnrollmentCreate(BaseModel):
    """Payload for enrolling in a training course."""

    course_id: uuid.UUID


class EnrollmentUpdate(BaseModel):
    """Payload for updating enrollment status."""

    status: EnrollmentStatus | None = None


class EnrollmentResponse(BaseModel):
    """Serialized representation of a course enrollment."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    course_id: uuid.UUID
    status: EnrollmentStatus
    enrolled_at: datetime
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

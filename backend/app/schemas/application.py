"""Job application Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    """Payload for submitting a job application."""

    job_id: uuid.UUID
    cover_note: str | None = None


class ApplicationUpdate(BaseModel):
    """Payload for updating application status."""

    status: ApplicationStatus | None = None
    cover_note: str | None = None


class ApplicationResponse(BaseModel):
    """Serialized representation of a job application."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    status: ApplicationStatus
    cover_note: str | None
    applied_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

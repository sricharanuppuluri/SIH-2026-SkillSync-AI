"""Pydantic schemas for Verified Skill Passport and Skill Evidence domain."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.skill_evidence import EvidenceStatus, EvidenceType
from app.models.verified_skill import VerificationMethod, VerificationStatus


class SkillEvidenceCreate(BaseModel):
    """Schema for candidate manually creating skill evidence (e.g. certification)."""

    skill_id: uuid.UUID
    evidence_type: EvidenceType = Field(
        default=EvidenceType.CERTIFICATION,
        description="Type of evidence (e.g., CERTIFICATION, CANDIDATE_DECLARATION)",
    )
    title: str = Field(
        ..., min_length=1, max_length=255, description="Evidence title or credential name"
    )
    description: str | None = Field(default=None, description="Detailed description or notes")
    evidence_url: str | None = Field(
        default=None, max_length=500, description="Link or verification URL"
    )
    issued_at: datetime | None = Field(default=None, description="Issuing date")
    completed_at: datetime | None = Field(default=None, description="Completion date")
    meta: dict[str, Any] | None = Field(
        default=None, description="Structured attributes (e.g., issuer, credential ID)"
    )


class SkillEvidenceRead(BaseModel):
    """Schema for reading a skill evidence item."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str | None = None
    evidence_type: EvidenceType
    source_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    evidence_url: str | None = None
    issued_at: datetime | None = None
    completed_at: datetime | None = None
    meta: dict[str, Any] | None = None
    status: EvidenceStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VerifiedSkillItem(BaseModel):
    """Canonical representation of a skill within the candidate passport."""

    skill_id: uuid.UUID
    skill_name: str
    skill_slug: str
    category: str
    skill_type: str
    status: VerificationStatus
    verification_method: VerificationMethod
    verification_score: float | None = None
    verified_at: datetime | None = None
    expires_at: datetime | None = None
    verification_summary: str
    evidence_count: int = 0
    strongest_evidence_type: EvidenceType | None = None
    evidence_items: list[SkillEvidenceRead] = []

    model_config = ConfigDict(from_attributes=True)


class PassportCandidateSummary(BaseModel):
    """High-level summary of candidate profile for passport display."""

    candidate_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    headline: str | None = None
    current_role: str | None = None
    location_city: str | None = None
    location_state: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PassportStats(BaseModel):
    """Statistical breakdown of verification metrics."""

    total_skills: int = 0
    verified_skills: int = 0
    unverified_skills: int = 0
    expired_skills: int = 0
    total_evidence_items: int = 0
    verification_coverage_pct: float = 0.0


class CandidatePassportResponse(BaseModel):
    """Full candidate-owned Verified Skill Passport response."""

    candidate: PassportCandidateSummary
    stats: PassportStats
    skills: list[VerifiedSkillItem]
    last_recalculated_at: datetime | None = None
    share_token: str | None = None
    is_share_enabled: bool = False


class PublicPassportResponse(BaseModel):
    """Publicly shareable Verified Skill Passport profile."""

    candidate: PassportCandidateSummary
    stats: PassportStats
    skills: list[VerifiedSkillItem]
    shared_at: datetime | None = None


class PassportShareToggleRequest(BaseModel):
    """Payload to enable or disable public passport sharing."""

    is_enabled: bool = Field(..., description="Whether public sharing is enabled")


class PassportShareResponse(BaseModel):
    """Public sharing token configuration response."""

    share_token: str
    is_enabled: bool
    share_url: str | None = None

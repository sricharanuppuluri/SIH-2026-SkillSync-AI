"""Verified skill domain entity."""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import CandidateProfile
    from app.models.skill import Skill


class VerificationStatus(enum.StrEnum):
    """Deterministic verification state of a candidate skill."""

    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"


class VerificationMethod(enum.StrEnum):
    """Primary method or standard via which verification was granted."""

    COURSE_COMPLETION = "COURSE_COMPLETION"
    CERTIFICATION = "CERTIFICATION"
    ASSESSMENT = "ASSESSMENT"
    CANDIDATE_DECLARATION = "CANDIDATE_DECLARATION"
    RESUME_EXTRACTION = "RESUME_EXTRACTION"
    NONE = "NONE"


class VerifiedSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Canonical candidate-level verified skill record with deterministic explanations."""

    __tablename__ = "verified_skills"
    __table_args__ = (
        UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_verified_skill"),
        Index("ix_verified_skills_cand_status", "candidate_id", "verification_status"),
    )

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status", native_enum=True),
        default=VerificationStatus.UNVERIFIED,
        nullable=False,
        index=True,
    )
    verification_method: Mapped[VerificationMethod] = mapped_column(
        Enum(VerificationMethod, name="verification_method", native_enum=True),
        default=VerificationMethod.NONE,
        nullable=False,
        index=True,
    )
    verification_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_summary: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="verified_skills"
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="verified_skills")

    def __repr__(self) -> str:
        return (
            f"<VerifiedSkill cand_id={self.candidate_id} skill_id={self.skill_id} "
            f"status={self.verification_status.value} method={self.verification_method.value}>"
        )

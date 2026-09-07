"""Skill evidence domain model."""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import CandidateProfile
    from app.models.skill import Skill


class EvidenceType(enum.StrEnum):
    """Supported deterministic sources of skill evidence."""

    COURSE_COMPLETION = "COURSE_COMPLETION"
    CANDIDATE_DECLARATION = "CANDIDATE_DECLARATION"
    RESUME_EXTRACTION = "RESUME_EXTRACTION"
    CERTIFICATION = "CERTIFICATION"
    ASSESSMENT = "ASSESSMENT"


class EvidenceStatus(enum.StrEnum):
    """Operational lifecycle state of an evidence record."""

    VALID = "VALID"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class SkillEvidence(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Structured verifiable proof demonstrating candidate skill engagement or competency."""

    __tablename__ = "skill_evidence"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "skill_id",
            "evidence_type",
            "source_id",
            name="uq_skill_evidence_source",
        ),
        Index("ix_skill_evidence_candidate_skill", "candidate_id", "skill_id"),
        Index("ix_skill_evidence_candidate_type", "candidate_id", "evidence_type"),
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
    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidence_type", native_enum=True),
        nullable=False,
        index=True,
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[EvidenceStatus] = mapped_column(
        Enum(EvidenceStatus, name="evidence_status", native_enum=True),
        default=EvidenceStatus.VALID,
        nullable=False,
        index=True,
    )

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="skill_evidences"
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="evidences")

    def __repr__(self) -> str:
        return (
            f"<SkillEvidence id={self.id} cand_id={self.candidate_id} "
            f"skill_id={self.skill_id} type={self.evidence_type.value} status={self.status.value}>"
        )

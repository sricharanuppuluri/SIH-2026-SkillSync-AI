"""Employer Skill Contract domain model and competency specifications."""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.candidate_skill import ProficiencyLevel

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.skill import Skill


class ContractStatus(enum.StrEnum):
    """Lifecycle states of an employer skill contract."""

    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class ContractRequirementType(enum.StrEnum):
    """Necessity level of a contract skill requirement."""

    REQUIRED = "REQUIRED"
    PREFERRED = "PREFERRED"


class ContractRequirementImportance(enum.StrEnum):
    """Relative priority weighting of a contract skill requirement."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ContractEvidenceType(enum.StrEnum):
    """Verifiable proof requirement expected for candidate qualification."""

    NONE = "NONE"
    VERIFIED_SKILL = "VERIFIED_SKILL"
    COURSE_COMPLETION = "COURSE_COMPLETION"
    CERTIFICATION = "CERTIFICATION"
    ASSESSMENT = "ASSESSMENT"
    PROJECT = "PROJECT"
    WORK_EXPERIENCE = "WORK_EXPERIENCE"


class SkillContract(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Structured, versioned employer competency definition for a job requisition."""

    __tablename__ = "skill_contracts"
    __table_args__ = (UniqueConstraint("job_id", "version", name="uq_skill_contract_job_version"),)

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contract_status", native_enum=True),
        default=ContractStatus.DRAFT,
        index=True,
        nullable=False,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="contracts")
    requirements: Mapped[list["SkillContractRequirement"]] = relationship(
        "SkillContractRequirement",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="SkillContractRequirement.created_at",
    )

    def __repr__(self) -> str:
        return f"<SkillContract id={self.id} job_id={self.job_id} v={self.version}>"


class SkillContractRequirement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual canonical skill expectation within an employer skill contract."""

    __tablename__ = "skill_contract_requirements"
    __table_args__ = (
        UniqueConstraint("contract_id", "skill_id", name="uq_skill_contract_req_skill"),
    )

    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skill_contracts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    required_proficiency: Mapped[ProficiencyLevel] = mapped_column(
        Enum(ProficiencyLevel, name="proficiency_level", native_enum=True),
        default=ProficiencyLevel.INTERMEDIATE,
        nullable=False,
    )
    requirement_type: Mapped[ContractRequirementType] = mapped_column(
        Enum(ContractRequirementType, name="contract_requirement_type", native_enum=True),
        default=ContractRequirementType.REQUIRED,
        nullable=False,
    )
    importance: Mapped[ContractRequirementImportance] = mapped_column(
        Enum(ContractRequirementImportance, name="contract_importance", native_enum=True),
        default=ContractRequirementImportance.HIGH,
        nullable=False,
    )
    minimum_experience_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    evidence_type: Mapped[ContractEvidenceType] = mapped_column(
        Enum(ContractEvidenceType, name="contract_evidence_type", native_enum=True),
        default=ContractEvidenceType.NONE,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    contract: Mapped["SkillContract"] = relationship("SkillContract", back_populates="requirements")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="contract_requirements")

    def __repr__(self) -> str:
        return (
            f"<SkillContractRequirement contract_id={self.contract_id} "
            f"skill_id={self.skill_id} prof={self.required_proficiency.value} "
            f"imp={self.importance.value}>"
        )

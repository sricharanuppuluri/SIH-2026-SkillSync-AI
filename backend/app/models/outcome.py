"""Employment outcome intelligence and provider performance domain entities (Phase 17)."""

import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.job import EmploymentType

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.job import Job
    from app.models.profiles import CandidateProfile, EmployerProfile, TrainingProviderProfile
    from app.models.skill_contract import SkillContract


class RetentionStatus(enum.StrEnum):
    """Post-placement employment retention progression milestones."""

    ACTIVE = "ACTIVE"
    LEFT_WITHIN_30D = "LEFT_WITHIN_30D"
    RETAINED_90D = "RETAINED_90D"
    RETAINED_180D = "RETAINED_180D"
    TERMINATED = "TERMINATED"


class PPITier(enum.StrEnum):
    """Deterministic quality tiers for the Provider Performance Index."""

    TIER_1_EXCELLENT = "TIER_1_EXCELLENT"  # PPI >= 85
    TIER_2_PROFICIENT = "TIER_2_PROFICIENT"  # 70 <= PPI < 85
    TIER_3_DEVELOPING = "TIER_3_DEVELOPING"  # 50 <= PPI < 70
    TIER_4_NEEDS_IMPROVEMENT = "TIER_4_NEEDS_IMPROVEMENT"  # PPI < 50


class PlacementOutcome(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Verified employment placement outcome resulting from a hired job application."""

    __tablename__ = "placement_outcomes"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skill_contracts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    placement_date: Mapped[date] = mapped_column(Date, nullable=False)
    starting_salary_annual: Mapped[float | None] = mapped_column(Float, nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(
        SQLEnum(EmploymentType, name="employment_type", native_enum=True),
        default=EmploymentType.FULL_TIME,
        nullable=False,
    )
    retention_status: Mapped[RetentionStatus] = mapped_column(
        SQLEnum(RetentionStatus, name="retention_status", native_enum=True),
        default=RetentionStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    contract_fulfillment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    employer_satisfaction_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    employer_feedback_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_by_employer: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    application: Mapped["Application"] = relationship("Application", backref="placement_outcome")
    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile", backref="placements")
    employer: Mapped["EmployerProfile"] = relationship("EmployerProfile", backref="placements")
    job: Mapped["Job"] = relationship("Job", backref="placements")
    contract: Mapped["SkillContract | None"] = relationship("SkillContract", backref="placements")
    training_attributions: Mapped[list["PlacementTrainingAttribution"]] = relationship(
        "PlacementTrainingAttribution",
        back_populates="placement",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<PlacementOutcome id={self.id} cand_id={self.candidate_id} "
            f"job_id={self.job_id} retention={self.retention_status.value}>"
        )


class PlacementTrainingAttribution(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Associates completed candidate training courses with a placement outcome."""

    __tablename__ = "placement_training_attributions"
    __table_args__ = (
        UniqueConstraint("placement_id", "course_id", name="uq_placement_course_attribution"),
    )

    placement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("placement_outcomes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    placement: Mapped["PlacementOutcome"] = relationship(
        "PlacementOutcome", back_populates="training_attributions"
    )
    enrollment: Mapped["Enrollment"] = relationship("Enrollment")
    course: Mapped["Course"] = relationship("Course")
    provider: Mapped["TrainingProviderProfile"] = relationship("TrainingProviderProfile")

    def __repr__(self) -> str:
        return (
            f"<PlacementTrainingAttribution placement_id={self.placement_id} "
            f"course_id={self.course_id} provider_id={self.provider_id}>"
        )


class ProviderPerformanceSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Periodic or real-time snapshot of training provider performance metrics and PPI score."""

    __tablename__ = "provider_performance_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "provider_id", "period_start", "period_end", name="uq_provider_period_snapshot"
        ),
    )

    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    total_enrolled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_placed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    completion_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    placement_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    retention_rate_90d: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    average_starting_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_employer_rating: Mapped[float | None] = mapped_column(Float, nullable=True)

    ppi_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    ppi_tier: Mapped[PPITier] = mapped_column(
        SQLEnum(PPITier, name="ppi_tier", native_enum=True),
        default=PPITier.TIER_3_DEVELOPING,
        nullable=False,
    )

    # Relationships
    provider: Mapped["TrainingProviderProfile"] = relationship("TrainingProviderProfile")

    def __repr__(self) -> str:
        return (
            f"<ProviderPerformanceSnapshot provider_id={self.provider_id} "
            f"ppi={self.ppi_score} tier={self.ppi_tier.value}>"
        )

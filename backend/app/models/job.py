"""Job requisition and Job-Skill domain entities."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.profiles import EmployerProfile
    from app.models.skill import Skill


class EmploymentType(enum.StrEnum):
    """Job engagement arrangements."""

    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERNSHIP = "INTERNSHIP"


class ExperienceLevel(enum.StrEnum):
    """Seniority brackets for job requisitions."""

    ENTRY = "ENTRY"
    MID = "MID"
    SENIOR = "SENIOR"
    LEAD = "LEAD"


class JobStatus(enum.StrEnum):
    """Lifecycle states for employer job requisitions."""

    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class Job(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Employer job posting representing industry workforce demand."""

    __tablename__ = "jobs"

    employer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employer_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(
        SQLEnum(EmploymentType, name="employment_type", native_enum=True),
        default=EmploymentType.FULL_TIME,
        nullable=False,
    )
    experience_level: Mapped[ExperienceLevel] = mapped_column(
        SQLEnum(ExperienceLevel, name="experience_level", native_enum=True),
        default=ExperienceLevel.MID,
        nullable=False,
    )
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus, name="job_status", native_enum=True),
        default=JobStatus.PUBLISHED,
        nullable=False,
        index=True,
    )
    salary_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    employer: Mapped["EmployerProfile"] = relationship("EmployerProfile", back_populates="jobs")
    skills: Mapped[list["JobSkill"]] = relationship(
        "JobSkill", back_populates="job", cascade="all, delete-orphan"
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="job", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Job title='{self.title}' employer_id={self.employer_id}>"


class JobSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Many-to-many junction attaching required skills to job requisitions."""

    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),)

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    minimum_proficiency: Mapped[str] = mapped_column(
        String(50), default="INTERMEDIATE", nullable=False
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="job_skills")

    def __repr__(self) -> str:
        return f"<JobSkill job_id={self.job_id} skill_id={self.skill_id} req={self.is_required}>"

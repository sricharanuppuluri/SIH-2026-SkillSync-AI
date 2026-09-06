"""Role-specific profile domain models."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.candidate_education import CandidateEducation
    from app.models.candidate_experience import CandidateExperience
    from app.models.candidate_skill import CandidateSkill
    from app.models.copilot_conversation import CopilotConversation
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.job import Job
    from app.models.user import User


class CandidateProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Detailed profile information for job seekers, students, and workers."""

    __tablename__ = "candidate_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    experience_years: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    education_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_city: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)

    # Resume metadata & content
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resume_uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")
    skills: Mapped[list["CandidateSkill"]] = relationship(
        "CandidateSkill", back_populates="candidate", cascade="all, delete-orphan"
    )
    educations: Mapped[list["CandidateEducation"]] = relationship(
        "CandidateEducation", back_populates="candidate", cascade="all, delete-orphan"
    )
    experiences: Mapped[list["CandidateExperience"]] = relationship(
        "CandidateExperience", back_populates="candidate", cascade="all, delete-orphan"
    )
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="candidate", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="candidate", cascade="all, delete-orphan"
    )
    copilot_conversations: Mapped[list["CopilotConversation"]] = relationship(
        "CopilotConversation", back_populates="candidate", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CandidateProfile user_id={self.user_id} exp={self.experience_years}y>"


class EmployerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Corporate hiring identity representing employers and recruiters."""

    __tablename__ = "employer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    company_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    company_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="employer_profile")
    jobs: Mapped[list["Job"]] = relationship(
        "Job", back_populates="employer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EmployerProfile company='{self.company_name}' user_id={self.user_id}>"


class TrainingProviderProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Institutional profile for vocational centers, universities, and training institutes."""

    __tablename__ = "training_provider_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    institution_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    provider_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="training_provider_profile")
    courses: Mapped[list["Course"]] = relationship(
        "Course", back_populates="provider", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TrainingProviderProfile inst='{self.institution_name}' user_id={self.user_id}>"


class GovernmentProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Profile for policy analysts, regional labor officers, and workforce observers."""

    __tablename__ = "government_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    department_name: Mapped[str] = mapped_column(String(255), nullable=False)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="government_profile")

    def __repr__(self) -> str:
        return f"<GovernmentProfile dept='{self.department_name}' user_id={self.user_id}>"

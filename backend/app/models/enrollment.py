"""Candidate course training enrollment domain entity."""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.enrollment_progress import EnrollmentLessonProgress
    from app.models.profiles import CandidateProfile


class EnrollmentStatus(enum.StrEnum):
    """Enrollment progression states."""

    ENROLLED = "ENROLLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"


class Enrollment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Training program enrollment mapping candidates to curriculum courses."""

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("candidate_id", "course_id", name="uq_candidate_course_enrollment"),
    )

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        SQLEnum(EnrollmentStatus, name="enrollment_status", native_enum=True),
        default=EnrollmentStatus.ENROLLED,
        nullable=False,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="enrollments"
    )
    course: Mapped["Course"] = relationship("Course", back_populates="enrollments")
    lesson_progress: Mapped[list["EnrollmentLessonProgress"]] = relationship(
        "EnrollmentLessonProgress", back_populates="enrollment", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Enrollment cand_id={self.candidate_id} course_id={self.course_id} "
            f"status={self.status.value}>"
        )

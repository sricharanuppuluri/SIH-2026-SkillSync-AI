"""Enrollment lesson completion progress domain entity."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.curriculum import CurriculumLesson
    from app.models.enrollment import Enrollment


class EnrollmentLessonProgress(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks candidate completion progress per lesson within an enrolled course."""

    __tablename__ = "enrollment_lesson_progress"
    __table_args__ = (
        UniqueConstraint("enrollment_id", "lesson_id", name="uq_enrollment_lesson_progress"),
    )

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curriculum_lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship("Enrollment", back_populates="lesson_progress")
    lesson: Mapped["CurriculumLesson"] = relationship(
        "CurriculumLesson", back_populates="progress_records"
    )

    def __repr__(self) -> str:
        return (
            f"<EnrollmentLessonProgress enrollment_id={self.enrollment_id} "
            f"lesson_id={self.lesson_id} completed={self.is_completed}>"
        )

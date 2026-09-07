"""Curriculum Module and Lesson domain entities for structured course training."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.enrollment_progress import EnrollmentLessonProgress


class CurriculumModule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A thematic section or module within a course curriculum."""

    __tablename__ = "curriculum_modules"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="curriculum_modules")
    lessons: Mapped[list["CurriculumLesson"]] = relationship(
        "CurriculumLesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="CurriculumLesson.order_index",
    )

    def __repr__(self) -> str:
        return f"<CurriculumModule id={self.id} course_id={self.course_id} title='{self.title}'>"


class CurriculumLesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An individual instructional unit or lesson within a curriculum module."""

    __tablename__ = "curriculum_lessons"

    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curriculum_modules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    module: Mapped["CurriculumModule"] = relationship("CurriculumModule", back_populates="lessons")
    progress_records: Mapped[list["EnrollmentLessonProgress"]] = relationship(
        "EnrollmentLessonProgress",
        back_populates="lesson",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<CurriculumLesson id={self.id} module_id={self.module_id} title='{self.title}'>"

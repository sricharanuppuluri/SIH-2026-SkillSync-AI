"""Course and Course-Skill training curriculum domain entities."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.enrollment import Enrollment
    from app.models.profiles import TrainingProviderProfile
    from app.models.skill import Skill


class CourseMode(enum.StrEnum):
    """Delivery modes for training programs."""

    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    HYBRID = "HYBRID"


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Vocational curriculum or training course offered by an education provider."""

    __tablename__ = "courses"

    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    mode: Mapped[CourseMode] = mapped_column(
        SQLEnum(CourseMode, name="course_mode", native_enum=True),
        default=CourseMode.ONLINE,
        nullable=False,
    )
    capacity: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    provider: Mapped["TrainingProviderProfile"] = relationship(
        "TrainingProviderProfile", back_populates="courses"
    )
    skills: Mapped[list["CourseSkill"]] = relationship(
        "CourseSkill", back_populates="course", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Course title='{self.title}' provider_id={self.provider_id}>"


class CourseSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Junction attaching skills taught by a course to the curriculum."""

    __tablename__ = "course_skills"
    __table_args__ = (UniqueConstraint("course_id", "skill_id", name="uq_course_skill"),)

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="course_skills")

    def __repr__(self) -> str:
        return f"<CourseSkill course_id={self.course_id} skill_id={self.skill_id}>"

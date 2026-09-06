"""Skill taxonomy domain entity."""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.candidate_skill import CandidateSkill
    from app.models.course import CourseSkill
    from app.models.job import JobSkill


class Skill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Canonical skill entity supporting taxonomy normalization and matching."""

    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False, default="General"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    job_skills: Mapped[list["JobSkill"]] = relationship(
        "JobSkill", back_populates="skill", cascade="all, delete-orphan"
    )
    candidate_skills: Mapped[list["CandidateSkill"]] = relationship(
        "CandidateSkill", back_populates="skill", cascade="all, delete-orphan"
    )
    course_skills: Mapped[list["CourseSkill"]] = relationship(
        "CourseSkill", back_populates="skill", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Skill name='{self.name}' category='{self.category}'>"

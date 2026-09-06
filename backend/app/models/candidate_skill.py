"""Candidate skill competency domain entity."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import CandidateProfile
    from app.models.skill import Skill


class ProficiencyLevel(enum.StrEnum):
    """Proficiency gradations for candidate competencies."""

    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class CandidateSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Junction entity mapping candidate competencies to canonical skills."""

    __tablename__ = "candidate_skills"
    __table_args__ = (UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),)

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    proficiency: Mapped[ProficiencyLevel] = mapped_column(
        SQLEnum(ProficiencyLevel, name="proficiency_level", native_enum=True),
        default=ProficiencyLevel.INTERMEDIATE,
        nullable=False,
    )
    years_experience: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="skills"
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="candidate_skills")

    def __repr__(self) -> str:
        return (
            f"<CandidateSkill cand_id={self.candidate_id} skill_id={self.skill_id} "
            f"lvl={self.proficiency.value} verif={self.is_verified}>"
        )

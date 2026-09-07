"""Skill taxonomy domain entities supporting canonical catalog, hierarchy, and relationships."""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.candidate_skill import CandidateSkill
    from app.models.course import CourseSkill
    from app.models.job import JobSkill
    from app.models.skill_embedding import SkillEmbedding
    from app.models.skill_evidence import SkillEvidence
    from app.models.verified_skill import VerifiedSkill


class SkillType(enum.StrEnum):
    """Categorical classification of skill taxonomy entities."""

    TECHNICAL = "TECHNICAL"
    SOFT = "SOFT"
    DOMAIN = "DOMAIN"
    TOOL = "TOOL"
    CERTIFICATION = "CERTIFICATION"
    OTHER = "OTHER"


class SkillStatus(enum.StrEnum):
    """Lifecycle status of canonical skills."""

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class SkillRelationshipType(enum.StrEnum):
    """Semantic relationship types between canonical skills."""

    RELATED = "RELATED"
    PREREQUISITE = "PREREQUISITE"
    COMPLEMENTARY = "COMPLEMENTARY"


class Skill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Canonical skill entity supporting taxonomy, hierarchy, and graph relationships."""

    __tablename__ = "skills"

    def __init__(self, **kwargs):
        if "slug" not in kwargs and "name" in kwargs and kwargs["name"]:
            import re

            s = re.sub(r"[^a-z0-9]+", "-", kwargs["name"].lower()).strip("-")
            kwargs["slug"] = s or "skill"
        super().__init__(**kwargs)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    normalized_name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False, default="General"
    )
    subcategory: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    skill_type: Mapped[SkillType] = mapped_column(
        Enum(SkillType, name="skill_type", native_enum=True),
        default=SkillType.TECHNICAL,
        nullable=False,
        index=True,
    )
    status: Mapped[SkillStatus] = mapped_column(
        Enum(SkillStatus, name="skill_status", native_enum=True),
        default=SkillStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Hierarchical parent/child relationship
    parent_skill_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    parent: Mapped["Skill | None"] = relationship(
        "Skill",
        remote_side="Skill.id",
        back_populates="children",
    )
    children: Mapped[list["Skill"]] = relationship(
        "Skill",
        back_populates="parent",
    )

    # Aliases
    aliases: Mapped[list["SkillAlias"]] = relationship(
        "SkillAlias",
        back_populates="skill",
        cascade="all, delete-orphan",
    )

    # Graph Relationships
    outbound_relationships: Mapped[list["SkillRelationship"]] = relationship(
        "SkillRelationship",
        foreign_keys="[SkillRelationship.source_skill_id]",
        back_populates="source_skill",
        cascade="all, delete-orphan",
    )
    inbound_relationships: Mapped[list["SkillRelationship"]] = relationship(
        "SkillRelationship",
        foreign_keys="[SkillRelationship.target_skill_id]",
        back_populates="target_skill",
        cascade="all, delete-orphan",
    )

    # Domain relationships from Phase 3/4
    job_skills: Mapped[list["JobSkill"]] = relationship(
        "JobSkill", back_populates="skill", cascade="all, delete-orphan"
    )
    candidate_skills: Mapped[list["CandidateSkill"]] = relationship(
        "CandidateSkill", back_populates="skill", cascade="all, delete-orphan"
    )
    course_skills: Mapped[list["CourseSkill"]] = relationship(
        "CourseSkill", back_populates="skill", cascade="all, delete-orphan"
    )
    embeddings: Mapped[list["SkillEmbedding"]] = relationship(
        "SkillEmbedding", back_populates="skill", cascade="all, delete-orphan"
    )
    evidences: Mapped[list["SkillEvidence"]] = relationship(
        "SkillEvidence", back_populates="skill", cascade="all, delete-orphan"
    )
    verified_skills: Mapped[list["VerifiedSkill"]] = relationship(
        "VerifiedSkill", back_populates="skill", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Skill name='{self.name}' slug='{self.slug}' status='{self.status}'>"


class SkillAlias(Base, UUIDPrimaryKeyMixin):
    """Deterministic synonym and variation mapping for canonical skills."""

    __tablename__ = "skill_aliases"

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_alias: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    skill: Mapped[Skill] = relationship("Skill", back_populates="aliases")

    def __repr__(self) -> str:
        return f"<SkillAlias alias='{self.alias}' normalized='{self.normalized_alias}'>"


class SkillRelationship(Base, UUIDPrimaryKeyMixin):
    """Directed weighted relationship edge connecting canonical skills."""

    __tablename__ = "skill_relationships"

    source_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[SkillRelationshipType] = mapped_column(
        Enum(SkillRelationshipType, name="skill_relationship_type", native_enum=True),
        default=SkillRelationshipType.RELATED,
        nullable=False,
        index=True,
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    source_skill: Mapped[Skill] = relationship(
        "Skill",
        foreign_keys=[source_skill_id],
        back_populates="outbound_relationships",
    )
    target_skill: Mapped[Skill] = relationship(
        "Skill",
        foreign_keys=[target_skill_id],
        back_populates="inbound_relationships",
    )

    __table_args__ = (
        CheckConstraint(
            "source_skill_id != target_skill_id",
            name="ck_skill_relationships_no_self_loop",
        ),
        UniqueConstraint(
            "source_skill_id",
            "target_skill_id",
            "relationship_type",
            name="uq_skill_relationships_source_target_type",
        ),
        CheckConstraint(
            "weight >= 0.1 AND weight <= 2.0",
            name="ck_skill_relationships_weight_range",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<SkillRelationship {self.source_skill_id} --({self.relationship_type})--> "
            f"{self.target_skill_id} weight={self.weight}>"
        )

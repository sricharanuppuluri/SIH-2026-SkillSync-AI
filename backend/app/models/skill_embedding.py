"""Skill Embedding domain entity supporting semantic vector similarity search."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.skill import Skill


class SkillEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Vector embedding for canonical skills supporting semantic matching."""

    __tablename__ = "skill_embeddings"
    __table_args__ = (UniqueConstraint("skill_id", "model_name", name="uq_skill_embedding_model"),)

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="sentence-transformers/all-MiniLM-L6-v2",
    )
    embedding_dimension: Mapped[int] = mapped_column(Integer, nullable=False, default=384)

    # Relationships
    skill: Mapped["Skill"] = relationship("Skill", back_populates="embeddings")

    def __repr__(self) -> str:
        return (
            f"<SkillEmbedding id={self.id} skill_id={self.skill_id} "
            f"model='{self.model_name}' dim={self.embedding_dimension}>"
        )

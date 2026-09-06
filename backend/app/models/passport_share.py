"""Skill passport public sharing configuration entity."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import CandidateProfile


class SkillPassportShare(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Secure revocable sharing token for public candidate skill passport view."""

    __tablename__ = "skill_passport_shares"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    share_token: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="passport_share"
    )

    def __repr__(self) -> str:
        return f"<SkillPassportShare cand_id={self.candidate_id} enabled={self.is_enabled}>"

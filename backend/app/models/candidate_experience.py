"""Candidate professional work experience domain entity."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import CandidateProfile


class CandidateExperience(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Employment history and professional experience records for candidates."""

    __tablename__ = "candidate_experiences"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="experiences"
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateExperience company='{self.company}' title='{self.title}' "
            f"candidate_id={self.candidate_id}>"
        )

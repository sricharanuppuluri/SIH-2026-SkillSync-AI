"""AI Career Copilot conversation and message domain entities."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.profiles import CandidateProfile


class CopilotConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Conversational session between candidate and AI Career Copilot."""

    __tablename__ = "copilot_conversations"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), default="Career Discussion", nullable=False)

    # Relationships
    candidate: Mapped["CandidateProfile"] = relationship(
        "CandidateProfile", back_populates="copilot_conversations"
    )
    job: Mapped["Job | None"] = relationship("Job")
    messages: Mapped[list["CopilotMessage"]] = relationship(
        "CopilotMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="CopilotMessage.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<CopilotConversation id={self.id} cand_id={self.candidate_id} title='{self.title}'>"
        )


class CopilotMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual message record within a Copilot conversation."""

    __tablename__ = "copilot_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("copilot_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "user", "assistant", "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    structured_data: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Relationships
    conversation: Mapped["CopilotConversation"] = relationship(
        "CopilotConversation", back_populates="messages"
    )

    def __repr__(self) -> str:
        return f"<CopilotMessage id={self.id} role='{self.role}' conv_id={self.conversation_id}>"

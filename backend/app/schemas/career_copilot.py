"""Pydantic schemas for AI Career Copilot requests, responses, and conversations."""

import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CareerCopilotRequest(BaseModel):
    """Payload for submitting a prompt to the Career Copilot."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Candidate's question or prompt for the Career Copilot",
    )
    conversation_id: uuid.UUID | None = Field(
        None,
        description="Existing conversation ID to continue, or None to create a new session",
    )
    job_id: uuid.UUID | None = Field(
        None,
        description="Optional Job ID to ground the discussion in specific role requirements",
    )


class CareerCopilotResponse(BaseModel):
    """Structured, grounded response returned by the Career Copilot."""

    answer: str = Field(
        ...,
        description="Core guidance, analysis, and explanation",
    )
    key_facts: list[str] = Field(
        default_factory=list,
        description="Factual observations directly grounded in PostgreSQL database context",
    )
    action_items: list[str] = Field(
        default_factory=list,
        description="Concrete, actionable recommendations for career advancement",
    )
    skill_focus: list[str] = Field(
        default_factory=list,
        description="Canonical skill names referenced from supplied context",
    )
    source_context: list[str] = Field(
        default_factory=list,
        description="Context categories informing response (e.g. candidate_profile, skill_gap)",
    )
    limitations: list[str] = Field(
        default_factory=list,
        description="Known constraints, missing data warnings, or deterministic boundaries",
    )


class CareerCopilotChatResult(BaseModel):
    """Full API return envelope for a Copilot interaction."""

    conversation_id: uuid.UUID = Field(
        ...,
        description="Unique identifier of the persisted conversation session",
    )
    response: CareerCopilotResponse = Field(
        ...,
        description="Structured advice payload",
    )
    ai_status: Literal["available", "degraded", "offline"] = Field(
        ...,
        description="Operational status of the underlying AI inference engine",
    )
    job_id: uuid.UUID | None = Field(
        None,
        description="Active job context ID if linked",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Timestamp of the message generation",
    )


class CopilotMessageResponse(BaseModel):
    """Schema representing a persisted message in a Copilot conversation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    structured_data: dict[str, Any] | None = None
    created_at: datetime


class CopilotConversationSummary(BaseModel):
    """Summary representation of a Copilot conversation for listings."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID | None = None
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class CopilotConversationResponse(BaseModel):
    """Detailed conversation schema with complete message history."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID | None = None
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[CopilotMessageResponse] = []

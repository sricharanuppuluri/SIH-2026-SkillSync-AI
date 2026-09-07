"""Skill extraction Pydantic schemas for request/response and LLM output validation."""

import uuid
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator


class ExtractionSourceType(StrEnum):
    """Supported source text types for skill extraction."""

    JOB = "JOB"
    RESUME = "RESUME"
    COURSE = "COURSE"
    PROFILE = "PROFILE"
    OTHER = "OTHER"


# ---------------------------------------------------------------------------
# LLM raw output validation
# ---------------------------------------------------------------------------


class RawSkillItem(BaseModel):
    """A single skill item as returned by the LLM. Strictly validated."""

    name: str = Field(..., min_length=1, max_length=200, description="Raw skill name from model")
    confidence: float = Field(
        ..., description="Extraction confidence — values outside [0.0, 1.0] are clamped"
    )
    evidence: str = Field(
        default="", max_length=500, description="Short evidence fragment from source text"
    )

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Skill name cannot be empty")
        return cleaned

    @model_validator(mode="after")
    def clamp_confidence(self) -> "RawSkillItem":
        """Clamp confidence to [0.0, 1.0] regardless of LLM output range."""
        self.confidence = round(max(0.0, min(1.0, self.confidence)), 4)
        return self


class RawExtractionResponse(BaseModel):
    """Top-level JSON structure expected from the LLM.

    Validates and rejects malformed model output before it enters the pipeline.
    """

    skills: list[RawSkillItem] = Field(
        default_factory=list,
        description="Extracted skill items",
        max_length=100,  # prevent excessive model output
    )

    @model_validator(mode="after")
    def deduplicate_raw_names(self) -> "RawExtractionResponse":
        """Remove exact duplicate raw names (case-insensitive) before resolution."""
        seen: set[str] = set()
        unique: list[RawSkillItem] = []
        for item in self.skills:
            key = item.name.strip().lower()
            if key not in seen:
                seen.add(key)
                unique.append(item)
        self.skills = unique
        return self


# ---------------------------------------------------------------------------
# Resolved extraction result
# ---------------------------------------------------------------------------


class SkillExtractionItem(BaseModel):
    """A fully resolved skill extraction item linking raw LLM output to the canonical catalog."""

    raw_name: str = Field(..., description="Raw skill name as extracted by the LLM")
    normalized_name: str = Field(..., description="Deterministically normalized form")
    canonical_skill_id: uuid.UUID | None = Field(
        default=None, description="Resolved canonical Skill ID (null if unresolved)"
    )
    canonical_skill_name: str | None = Field(
        default=None, description="Canonical skill display name (null if unresolved)"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence")
    evidence: str = Field(default="", description="Short evidence fragment from source text")
    resolved: bool = Field(default=False, description="True when matched to canonical catalog")


class SkillExtractionRequest(BaseModel):
    """Request payload for POST /api/v1/skills/extract."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Source text to extract skills from (10–10 000 characters)",
    )
    source_type: ExtractionSourceType = Field(
        default=ExtractionSourceType.OTHER,
        description="Type of source document",
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 10:
            raise ValueError("Text must be at least 10 characters after stripping whitespace")
        return stripped


class SkillExtractionResponse(BaseModel):
    """Response payload for POST /api/v1/skills/extract."""

    success: bool = Field(..., description="True when extraction completed without fatal errors")
    skills: list[SkillExtractionItem] = Field(
        default_factory=list, description="Resolved skill extraction items"
    )
    model: str = Field(..., description="Ollama model used for extraction")
    source_type: ExtractionSourceType = Field(..., description="Source type of the input text")
    processing_time_ms: float = Field(..., description="Total processing time in milliseconds")
    resolved_count: int = Field(default=0, description="Number of skills resolved to canonical IDs")
    unresolved_count: int = Field(
        default=0, description="Number of skills not found in canonical catalog"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g., Ollama fallback, unknown skills)",
    )

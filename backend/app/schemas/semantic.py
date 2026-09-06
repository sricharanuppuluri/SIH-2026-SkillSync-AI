"""Semantic skill matching and vector embedding schemas."""

import enum
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.skill import SkillType


class MatchType(enum.StrEnum):
    """Categorical match classification in order of precedence."""

    EXACT = "EXACT"
    ALIAS = "ALIAS"
    STRONG_SEMANTIC = "STRONG_SEMANTIC"
    SEMANTIC = "SEMANTIC"
    NO_MATCH = "NO_MATCH"


class SemanticMatchRequest(BaseModel):
    """Request payload for semantic skill matching."""

    text: Annotated[
        str,
        Field(
            ...,
            min_length=2,
            max_length=500,
            description="Input skill phrase or raw text to match",
        ),
    ]
    top_k: Annotated[
        int,
        Field(
            default=5,
            ge=1,
            le=20,
            description="Maximum number of candidate matches to return",
        ),
    ]
    skill_type: SkillType | None = Field(
        None,
        description="Optional filter/guardrail to constrain matching by skill type",
    )


class SemanticMatchItem(BaseModel):
    """A matched canonical skill candidate with similarity evidence and explanation."""

    model_config = ConfigDict(from_attributes=True)

    skill_id: uuid.UUID = Field(..., description="Canonical skill UUID")
    skill_name: str = Field(..., description="Canonical name of the matched skill")
    skill_type: SkillType = Field(..., description="Skill classification type")
    category: str = Field(default="General", description="Taxonomy category of the skill")
    similarity: Annotated[
        float,
        Field(
            ge=0.0,
            le=1.0,
            description=(
                "Normalized similarity metric score "
                "(1.0 for exact/alias, 0.0-1.0 for cosine similarity)"
            ),
        ),
    ]
    match_type: MatchType = Field(
        ...,
        description="Classification of how this match was determined",
    )
    matched_via: str = Field(
        ...,
        description=(
            "Explanation of match provenance "
            "(e.g. 'Exact canonical match', 'Alias: ...', 'Semantic embedding')"
        ),
    )
    explanation: str = Field(
        ...,
        description="Deterministic, human-readable explanation of why this skill matched",
    )


class SemanticMatchResponse(BaseModel):
    """Response payload containing ranked candidate matches."""

    query: str = Field(..., description="Original raw query text")
    normalized_query: str = Field(..., description="Normalized query text used for matching")
    matches: list[SemanticMatchItem] = Field(
        default_factory=list,
        description="Ranked candidate matches obeying deterministic tie-breaking",
    )
    model_name: str = Field(
        ...,
        description="Name of the embedding model used for semantic analysis",
    )


class EmbeddingStatusResponse(BaseModel):
    """System status and coverage metrics for skill vector embeddings."""

    total_active_skills: int = Field(
        ...,
        description="Count of active canonical skills in catalog",
    )
    embedded_skills: int = Field(
        ...,
        description="Count of canonical skills with current embeddings",
    )
    missing_embeddings: int = Field(
        ...,
        description="Count of canonical skills missing embeddings",
    )
    model_name: str = Field(..., description="Configured embedding model identifier")
    dimension: int = Field(..., description="Vector dimensionality (e.g., 384)")
    is_model_available: bool = Field(
        ...,
        description="Whether the local embedding model is loaded/ready",
    )

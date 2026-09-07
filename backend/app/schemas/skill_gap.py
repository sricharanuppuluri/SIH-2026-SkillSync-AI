"""Skill Gap Analysis schemas for deterministic evaluation of candidate skills against jobs."""

import enum
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.candidate_skill import ProficiencyLevel
from app.models.skill import SkillType


class SkillGapStatus(enum.StrEnum):
    """Categorical match status between candidate competence and job requirement."""

    MATCHED = "MATCHED"
    PARTIAL = "PARTIAL"
    MISSING = "MISSING"


class GapSeverity(enum.StrEnum):
    """Deterministic severity classification for skill deficits."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SkillGapItem(BaseModel):
    """Detailed deterministic comparison record for a single job requirement."""

    model_config = ConfigDict(from_attributes=True)

    skill_id: uuid.UUID = Field(..., description="Canonical skill UUID")
    skill_name: str = Field(..., description="Canonical display name of the skill")
    skill_type: SkillType = Field(
        ..., description="Skill classification type (TECHNICAL, SOFT, etc.)"
    )
    category: str = Field(default="General", description="Taxonomy category of the skill")
    status: SkillGapStatus = Field(..., description="Match status: MATCHED, PARTIAL, or MISSING")
    required_proficiency: ProficiencyLevel = Field(
        ..., description="Minimum proficiency level required by the job"
    )
    candidate_proficiency: ProficiencyLevel | None = Field(
        None, description="Candidate's current proficiency level, or null if missing"
    )
    candidate_years_experience: float | None = Field(
        None, description="Candidate's logged years of experience with this skill"
    )
    is_required: bool = Field(True, description="Whether this skill is mandatory or optional")
    weight: float = Field(1.0, description="Relative importance weight of the skill on the job")
    severity: GapSeverity | None = Field(
        None,
        description="Gap deficit severity (HIGH for missing/delta>=2, MEDIUM for delta=1)",
    )
    proficiency_delta: int = Field(
        0,
        description="Numeric deficit between required and candidate proficiency",
    )
    explanation: str = Field(
        ..., description="Deterministic, explainable sentence describing the comparison"
    )


class SkillGapSummary(BaseModel):
    """Summary counts and aggregates of the gap analysis."""

    model_config = ConfigDict(from_attributes=True)

    total_required_skills: Annotated[
        int, Field(ge=0, description="Total skills specified on the job")
    ]
    matched_skills: Annotated[int, Field(ge=0, description="Count of fully matched skills")]
    partial_skills: Annotated[
        int, Field(ge=0, description="Count of skills with partial proficiency")
    ]
    missing_skills: Annotated[
        int, Field(ge=0, description="Count of skills absent from candidate profile")
    ]


class SkillGapReport(BaseModel):
    """Comprehensive, explainable Skill Gap Analysis report."""

    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID = Field(..., description="Target Job requisition UUID")
    job_title: str = Field(..., description="Job title")
    employer_name: str | None = Field(None, description="Employer / Company posting the job")
    candidate_id: uuid.UUID = Field(..., description="Candidate profile UUID")
    skill_alignment_score: Annotated[
        float,
        Field(
            ge=0.0,
            le=100.0,
            description="Deterministic alignment score from 0.0 to 100.0",
        ),
    ]
    summary: SkillGapSummary = Field(
        ..., description="High-level counts of matched/partial/missing skills"
    )
    gaps: list[SkillGapItem] = Field(
        default_factory=list,
        description="Detailed itemized breakdown for each required job skill",
    )

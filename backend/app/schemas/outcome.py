"""Pydantic validation schemas for Employment Outcome Intelligence."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import EmploymentType
from app.models.outcome import PPITier, RetentionStatus


class TrainingAttributionResponse(BaseModel):
    """Schema for associated completed training course attribution."""

    id: uuid.UUID
    enrollment_id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    provider_id: uuid.UUID
    provider_name: str
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlacementOutcomeCreate(BaseModel):
    """Payload to record a new verified placement outcome."""

    application_id: uuid.UUID = Field(..., description="Unique ID of the hired job application")
    placement_date: date = Field(..., description="Date employment commenced")
    starting_salary_annual: float | None = Field(
        None, ge=0.0, description="Annual starting salary in local currency"
    )
    employment_type: EmploymentType = Field(
        default=EmploymentType.FULL_TIME, description="Type of employment engagement"
    )
    contract_id: uuid.UUID | None = Field(
        None, description="Optional associated Employer Skill Contract ID"
    )


class RetentionUpdatePayload(BaseModel):
    """Payload to update retention milestone and optional feedback."""

    retention_status: RetentionStatus = Field(..., description="Target retention status milestone")
    employer_satisfaction_rating: int | None = Field(
        None, ge=1, le=5, description="Employer satisfaction score from 1 (poor) to 5 (excellent)"
    )
    contract_fulfillment_score: float | None = Field(
        None, ge=0.0, le=100.0, description="Skill contract fulfillment score percentage (0-100)"
    )
    employer_feedback_notes: str | None = Field(
        None, max_length=2000, description="Qualitative feedback from hiring manager"
    )


class EmployerFeedbackPayload(BaseModel):
    """Payload to submit or update employer feedback on a placed graduate."""

    employer_satisfaction_rating: int = Field(
        ..., ge=1, le=5, description="Employer satisfaction score from 1 to 5"
    )
    contract_fulfillment_score: float | None = Field(
        None, ge=0.0, le=100.0, description="Skill contract fulfillment score percentage (0-100)"
    )
    employer_feedback_notes: str | None = Field(
        None, max_length=2000, description="Qualitative feedback notes"
    )


class PlacementOutcomeResponse(BaseModel):
    """Detailed placement outcome response schema."""

    id: uuid.UUID
    application_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str | None = None
    employer_id: uuid.UUID
    employer_company_name: str | None = None
    job_id: uuid.UUID
    job_title: str | None = None
    contract_id: uuid.UUID | None = None
    contract_title: str | None = None
    placement_date: date
    starting_salary_annual: float | None = None
    employment_type: EmploymentType
    retention_status: RetentionStatus
    contract_fulfillment_score: float | None = None
    employer_satisfaction_rating: int | None = None
    employer_feedback_notes: str | None = None
    verified_by_employer: bool = True
    training_attributions: list[TrainingAttributionResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlacementOutcomeSummary(BaseModel):
    """Summary representation of a placement record."""

    id: uuid.UUID
    application_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str | None = None
    employer_company_name: str | None = None
    job_title: str | None = None
    placement_date: date
    employment_type: EmploymentType
    retention_status: RetentionStatus
    starting_salary_annual: float | None = None
    employer_satisfaction_rating: int | None = None
    has_training_attribution: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProviderPerformanceResponse(BaseModel):
    """Institutional PPI breakdown and historical placement metrics for a training provider."""

    provider_id: uuid.UUID
    provider_name: str
    period_start: date | None = None
    period_end: date | None = None
    total_enrolled: int = 0
    total_completed: int = 0
    total_placed: int = 0
    completion_rate: float = 0.0
    placement_rate: float = 0.0
    retention_rate_90d: float = 0.0
    average_starting_salary: float | None = None
    average_employer_rating: float | None = None
    ppi_score: float = 0.0
    ppi_tier: PPITier = PPITier.TIER_3_DEVELOPING
    calculation_breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Weighted sub-score contributions to the total PPI score",
    )

    model_config = ConfigDict(from_attributes=True)


class ProviderLeaderboardItem(BaseModel):
    """Ranked training provider performance benchmark entry."""

    rank: int
    provider_id: uuid.UUID
    provider_name: str
    ppi_score: float
    ppi_tier: PPITier
    completion_rate: float
    placement_rate: float
    retention_rate_90d: float
    average_starting_salary: float | None = None
    average_employer_rating: float | None = None
    total_graduates: int = 0
    total_placed: int = 0

    model_config = ConfigDict(from_attributes=True)


class SkillPlacementRateInsight(BaseModel):
    """Aggregated placement and wage conversion metrics for a canonical skill."""

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    placement_count: int = 0
    placement_rate: float = 0.0
    average_salary: float | None = None
    retention_rate_90d: float = 0.0


class DistrictOutcomeKPIs(BaseModel):
    """Geographic outcome intelligence metrics for regional planning."""

    district: str
    state: str | None = None
    total_placements: int = 0
    average_salary: float | None = None
    retention_rate_90d: float = 0.0


class OutcomeAnalyticsOverview(BaseModel):
    """Macro-level employment outcome KPIs for government and institutional intelligence."""

    total_placements: int = 0
    placement_rate: float = 0.0
    average_retention_90d: float = 0.0
    average_starting_salary: float | None = None
    average_employer_satisfaction: float | None = None
    total_tracked_candidates: int = 0
    placement_by_employment_type: dict[str, int] = Field(default_factory=dict)
    retention_distribution: dict[str, int] = Field(default_factory=dict)
    district_benchmarks: list[DistrictOutcomeKPIs] = Field(default_factory=list)

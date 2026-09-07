"""Pydantic schemas for the Phase 13 Skill Demand Digital Twin module."""

import enum
import uuid

from pydantic import BaseModel, ConfigDict, Field


class SkillShortageStatus(enum.StrEnum):
    """Deterministic platform demand-supply gap classification.

    Thresholds (demand / max(verified_supply, 1)):
        HIGH_SHORTAGE     : ratio >= 3.0  OR  (demand >= 3 AND verified_supply == 0)
        MODERATE_SHORTAGE : 1.5 <= ratio < 3.0
        BALANCED          : 0.7 <= ratio < 1.5
        SURPLUS           : ratio < 0.7   OR  (demand == 0 AND verified_supply > 0)
    """

    HIGH_SHORTAGE = "HIGH_SHORTAGE"
    MODERATE_SHORTAGE = "MODERATE_SHORTAGE"
    BALANCED = "BALANCED"
    SURPLUS = "SURPLUS"


class SkillDemandTrendItem(BaseModel):
    """Historical monthly demand aggregation item.

    NOTE: Phase 13 shows only historical/actual data.
    Forecasting belongs to Phase 14.
    """

    period: str = Field(..., description="Human-readable period label, e.g. 'January 2026'")
    period_date: str = Field(..., description="ISO date string YYYY-MM-01 for chart sorting")
    demand_count: int = Field(default=0, description="Active published job postings in period")


class SkillDemandLocationItem(BaseModel):
    """Geographic breakdown of skill demand (platform data only)."""

    city: str = Field(default="Unknown", description="City name or 'Remote'")
    state: str | None = Field(default=None, description="State or region")
    is_remote: bool = Field(default=False, description="Remote-only jobs")
    demand_count: int = Field(default=0, description="Number of active jobs requiring skill")
    demand_share_percentage: float = Field(
        default=0.0, description="Share (%) of this skill's total demand"
    )


class SkillDemandIndustryItem(BaseModel):
    """Industry sector breakdown of skill demand (derived from employer industry field)."""

    industry: str = Field(default="General / Other", description="Industry classification")
    demand_count: int = Field(default=0, description="Number of active jobs requiring skill")
    demand_share_percentage: float = Field(
        default=0.0, description="Share (%) of this skill's total demand"
    )


class SkillDemandTrainingItem(BaseModel):
    """Published training course teaching a demanded skill."""

    course_id: uuid.UUID
    course_title: str
    difficulty_level: str
    delivery_mode: str
    duration_hours: int
    capacity: int
    institution_name: str

    model_config = ConfigDict(from_attributes=True)


class SkillDemandSummaryItem(BaseModel):
    """Summary item in the demand leaderboard — aggregate demand, supply, shortage status."""

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    skill_type: str | None = None
    demand_count: int = Field(
        default=0, description="Number of active published jobs requiring this skill"
    )
    demand_share_percentage: float = Field(
        default=0.0, description="Percentage of total active jobs requiring this skill"
    )
    rank: int = Field(default=0, description="Demand rank (1 = highest demand)")
    verified_supply_count: int = Field(
        default=0, description="Distinct candidates with VERIFIED status for this skill"
    )
    demand_supply_ratio: float = Field(
        default=0.0, description="demand_count / max(verified_supply_count, 1)"
    )
    shortage_status: SkillShortageStatus = Field(
        default=SkillShortageStatus.BALANCED,
        description="Deterministic shortage classification based on demand/supply ratio",
    )
    training_courses_count: int = Field(
        default=0, description="Number of published active courses teaching this skill"
    )

    model_config = ConfigDict(from_attributes=True)


class DemandOverviewKPIs(BaseModel):
    """Platform-wide Digital Twin executive KPI summary.

    IMPORTANT: All values are computed from SkillSync platform data only.
    This is NOT an authoritative real-world labor-market dataset.
    """

    total_active_jobs: int = 0
    unique_skills_in_demand: int = 0
    verified_candidate_supply: int = 0
    published_training_courses: int = 0
    skills_in_shortage: int = 0


class DemandOverviewResponse(BaseModel):
    """Aggregated Digital Twin Overview Response for the dashboard."""

    kpis: DemandOverviewKPIs
    top_demanded_skills: list[SkillDemandSummaryItem] = Field(default_factory=list)
    highest_shortage_skills: list[SkillDemandSummaryItem] = Field(default_factory=list)


class SkillSupplyBreakdown(BaseModel):
    """Detailed candidate supply breakdown for a specific skill."""

    verified_candidates: int = Field(
        default=0, description="Candidates with VERIFIED VerifiedSkill record"
    )
    unverified_candidates: int = Field(
        default=0,
        description="Candidates declaring skill (CandidateSkill) without VERIFIED status",
    )
    total_candidates: int = Field(default=0, description="max(declared, verified)")
    by_verification_method: dict[str, int] = Field(
        default_factory=dict,
        description="Breakdown of verified count by verification method",
    )


class SkillDemandDetailResponse(BaseModel):
    """Full 360-degree Digital Twin detail for a specific canonical skill.

    IMPORTANT: Aggregate counts only — no personal candidate or employer data exposed.
    """

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    skill_type: str | None = None
    description: str | None = None

    # Demand
    demand_count: int = 0
    demand_share_percentage: float = 0.0
    rank: int = 0

    # Supply
    supply: SkillSupplyBreakdown

    # Gap
    demand_supply_ratio: float = 0.0
    shortage_status: SkillShortageStatus = SkillShortageStatus.BALANCED

    # Training
    published_courses_count: int = 0
    training_providers_count: int = 0

    # Drill-downs (top-5 each for detail view)
    top_industries: list[SkillDemandIndustryItem] = Field(default_factory=list)
    top_locations: list[SkillDemandLocationItem] = Field(default_factory=list)
    historical_trends: list[SkillDemandTrendItem] = Field(default_factory=list)
    related_skills: list[str] = Field(default_factory=list)

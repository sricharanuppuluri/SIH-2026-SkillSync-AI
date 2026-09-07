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


# ===========================================================================
# Phase 14: Skill Demand Forecasting Schemas
# ===========================================================================


class ForecastModelType(enum.StrEnum):
    """Statistical model selected for forecasting."""

    HOLT = "holt"
    LINEAR_TREND = "linear_trend"
    BASELINE_FALLBACK = "baseline_fallback"
    MOVING_AVERAGE = "moving_average"


class DemandGrowthTrend(enum.StrEnum):
    """Deterministic demand trajectory classification."""

    INCREASING = "INCREASING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


class DemandSeriesPoint(BaseModel):
    """Data point in the unified actual vs forecast time series."""

    month: str = Field(..., description="Human-readable month, e.g. 'January 2026'")
    month_date: str = Field(..., description="ISO format date YYYY-MM-01")
    actual_demand: int | None = Field(default=None, description="Actual observed demand")
    predicted_demand: int | None = Field(
        default=None, description="Forecasted/predicted future demand"
    )
    lower_bound: int | None = Field(default=None, description="Lower confidence interval bound")
    upper_bound: int | None = Field(default=None, description="Upper confidence interval bound")
    data_type: str = Field(..., description="'ACTUAL' or 'FORECAST'")


class SkillForecastMonthItem(BaseModel):
    """Forecast details for a single forward-looking month."""

    forecast_month: str = Field(..., description="Forecast period label, e.g. 'March 2026'")
    forecast_month_date: str = Field(..., description="ISO date YYYY-MM-01")
    predicted_demand: int = Field(default=0, ge=0, description="Predicted demand count (>= 0)")
    lower_bound: int = Field(default=0, ge=0, description="Lower bound of 95% confidence interval")
    upper_bound: int = Field(default=0, ge=0, description="Upper bound of 95% confidence interval")
    confidence_level: float = Field(default=0.95, description="Confidence level (0.95 = 95%)")


class SkillForecastResponse(BaseModel):
    """Comprehensive 360 forecast detail for a specific skill."""

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    skill_type: str | None = None
    current_actual_demand: int = Field(
        default=0, description="Latest known actual monthly demand count"
    )
    latest_actual_month: str | None = Field(
        default=None, description="Period of the latest actual demand data"
    )
    forecast_horizon_months: int = Field(default=3, description="Forecast horizon in months (1-12)")
    model_used: str = Field(
        default="baseline_fallback", description="Name of statistical model applied"
    )
    historical_observations_count: int = Field(
        default=0, description="Number of historical monthly data points used"
    )
    confidence_level: float = Field(default=0.95, description="Confidence interval percentage")
    forecasted_demand_end: int = Field(
        default=0, description="Projected demand at the end of the horizon"
    )
    expected_growth_percentage: float = Field(
        default=0.0, description="Projected percentage growth from latest actual"
    )
    growth_trend: DemandGrowthTrend = Field(
        default=DemandGrowthTrend.STABLE, description="INCREASING, STABLE, or DECLINING"
    )
    growth_interpretation: str = Field(
        ..., description="Deterministic human-readable explanation of trend"
    )
    current_verified_supply: int = Field(
        default=0, description="Current Phase 12 verified candidate supply"
    )
    current_shortage_status: SkillShortageStatus = Field(
        default=SkillShortageStatus.BALANCED,
        description="Phase 13 current actual demand shortage status",
    )
    forecasted_demand_supply_ratio: float = Field(
        default=0.0, description="forecasted_demand_end / max(current_verified_supply, 1)"
    )
    forecasted_shortage_status: SkillShortageStatus = Field(
        default=SkillShortageStatus.BALANCED,
        description="Projected shortage status based on forecast demand vs current supply",
    )
    available_training_courses_count: int = Field(
        default=0, description="Phase 11 published courses available for this skill"
    )
    training_insight: str = Field(
        ..., description="Relationship summary between forecast demand and training capacity"
    )
    evaluation_mae: float | None = Field(
        default=None, description="Mean Absolute Error from backtesting evaluation (if feasible)"
    )
    monthly_forecasts: list[SkillForecastMonthItem] = Field(default_factory=list)
    combined_series: list[DemandSeriesPoint] = Field(
        default_factory=list,
        description="Unified chronological actual + forecast points for charts",
    )


class GlobalForecastSummaryItem(BaseModel):
    """Summary item in the global demand forecast leaderboard."""

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    skill_type: str | None = None
    current_demand: int = Field(default=0, description="Current actual demand")
    forecasted_demand: int = Field(default=0, description="Forecasted demand at horizon end")
    growth_percentage: float = Field(default=0.0, description="Expected growth percentage")
    growth_trend: DemandGrowthTrend = Field(default=DemandGrowthTrend.STABLE)
    current_shortage_status: SkillShortageStatus = Field(default=SkillShortageStatus.BALANCED)
    forecasted_shortage_status: SkillShortageStatus = Field(default=SkillShortageStatus.BALANCED)
    model_used: str = Field(default="baseline_fallback")
    lower_bound: int = Field(default=0)
    upper_bound: int = Field(default=0)

    model_config = ConfigDict(from_attributes=True)


class GlobalForecastOverviewResponse(BaseModel):
    """Global multi-skill forecasting leaderboard response."""

    horizon_months: int = Field(default=3, description="Forecast horizon in months")
    total_current_demand: int = Field(default=0, description="Total active demand across skills")
    total_forecasted_demand: int = Field(
        default=0, description="Total projected demand across skills"
    )
    overall_growth_percentage: float = Field(
        default=0.0, description="Aggregate projected growth rate"
    )
    top_growing_skills: list[GlobalForecastSummaryItem] = Field(default_factory=list)
    top_declining_skills: list[GlobalForecastSummaryItem] = Field(default_factory=list)
    high_forecast_shortage_skills: list[GlobalForecastSummaryItem] = Field(default_factory=list)
    forecast_items: list[GlobalForecastSummaryItem] = Field(default_factory=list)

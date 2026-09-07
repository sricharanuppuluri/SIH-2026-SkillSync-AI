"""Pydantic schemas for Phase 15: What-If Skill Demand Simulator."""

import enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.demand import SkillShortageStatus


class SimulatorBaselineType(enum.StrEnum):
    ACTUAL = "ACTUAL"
    FORECAST = "FORECAST"


class SkillScenarioInput(BaseModel):
    """Scenario inputs for a single canonical skill simulation."""

    skill_id: UUID = Field(..., description="Canonical skill UUID")
    baseline_type: SimulatorBaselineType = Field(
        default=SimulatorBaselineType.ACTUAL,
        description="Base simulation on current ACTUAL data or Phase 14 FORECAST data",
    )
    forecast_horizon: int = Field(
        default=3,
        ge=1,
        le=12,
        description="Forecast horizon in months if baseline_type is FORECAST (1-12)",
    )
    demand_change_percent: float = Field(
        default=0.0,
        ge=-100.0,
        le=500.0,
        description="Hypothetical percentage change in demand (-100% to +500%)",
    )
    additional_verified_supply: int = Field(
        default=0,
        ge=0,
        le=1_000_000,
        description="Hypothetical number of additional verified candidates (>=0)",
    )
    additional_training_capacity: int = Field(
        default=0,
        ge=0,
        le=1_000_000,
        description="Hypothetical number of additional training course seats (>=0)",
    )


class SkillScenarioBaseline(BaseModel):
    """Baseline metrics before applying what-if scenario modifications."""

    demand: int = Field(..., description="Baseline demand count")
    verified_supply: int = Field(..., description="Baseline verified candidate supply count")
    training_capacity: int = Field(..., description="Baseline training course seats capacity")
    shortage_ratio: float = Field(..., description="Baseline demand / verified supply ratio")
    shortage_category: SkillShortageStatus = Field(
        ..., description="Baseline shortage classification"
    )
    baseline_type: SimulatorBaselineType = Field(..., description="ACTUAL or FORECAST")
    forecast_horizon: int | None = Field(default=None, description="Forecast horizon if applicable")


class SkillScenarioProjected(BaseModel):
    """Projected metrics resulting from what-if scenario modifications."""

    demand: int = Field(..., description="Projected demand count")
    verified_supply: int = Field(..., description="Projected verified candidate supply count")
    training_capacity: int = Field(..., description="Projected training course seats capacity")
    shortage_ratio: float = Field(..., description="Projected demand / verified supply ratio")
    shortage_category: SkillShortageStatus = Field(
        ..., description="Projected shortage classification"
    )


class SkillScenarioImpact(BaseModel):
    """Impact and deltas between baseline and projected values."""

    demand_change: int = Field(..., description="Absolute change in demand (projected - baseline)")
    demand_change_percent: float = Field(..., description="Percentage change in demand")
    supply_change: int = Field(..., description="Absolute change in verified supply")
    supply_change_percent: float = Field(..., description="Percentage change in verified supply")
    training_capacity_change: int = Field(..., description="Absolute change in training capacity")
    training_capacity_change_percent: float = Field(
        ..., description="Percentage change in training capacity"
    )
    shortage_ratio_change: float = Field(
        ..., description="Change in shortage ratio (projected - baseline)"
    )
    category_changed: bool = Field(..., description="Whether the shortage category changed")
    previous_category: SkillShortageStatus = Field(..., description="Original shortage category")
    new_category: SkillShortageStatus = Field(..., description="New shortage category")


class SkillScenarioResult(BaseModel):
    """Complete simulation result for a canonical skill."""

    model_config = ConfigDict(from_attributes=True)

    skill_id: UUID
    skill_name: str
    category: str | None = None
    skill_type: str | None = None
    baseline: SkillScenarioBaseline
    scenario: SkillScenarioInput
    projected: SkillScenarioProjected
    impact: SkillScenarioImpact
    explanation: str = Field(
        ..., description="Deterministic plain-text explanation of simulated impact"
    )
    related_skills: list[str] = Field(
        default_factory=list,
        description="Complementary or related canonical skills from catalog for context",
    )


class MultiSkillScenarioRequest(BaseModel):
    """Batch simulation request for multiple canonical skills."""

    skills: list[SkillScenarioInput] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of skill scenarios to simulate in batch",
    )


class MultiSkillScenarioResponse(BaseModel):
    """Batch simulation response containing individual skill results and summary."""

    results: list[SkillScenarioResult]
    total_skills: int
    categories_improved_count: int = 0
    categories_worsened_count: int = 0
    categories_unchanged_count: int = 0

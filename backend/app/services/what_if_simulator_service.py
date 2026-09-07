"""Phase 15: What-If Skill Demand Simulator Service.

Deterministic, non-destructive scenario modeling for SkillSync AI.
Enables authorized users to model hypothetical interventions in demand, verified supply,
and training capacity against ACTUAL or FORECAST baselines without altering platform data.
"""

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course, CourseSkill, CourseStatus
from app.models.job import Job, JobSkill, JobStatus
from app.models.skill import Skill, SkillRelationship
from app.models.verified_skill import VerificationStatus, VerifiedSkill
from app.schemas.demand import SkillShortageStatus
from app.schemas.simulator import (
    MultiSkillScenarioRequest,
    MultiSkillScenarioResponse,
    SimulatorBaselineType,
    SkillScenarioBaseline,
    SkillScenarioImpact,
    SkillScenarioInput,
    SkillScenarioProjected,
    SkillScenarioResult,
)
from app.services.demand_forecast_service import get_skill_forecast


def _classify_shortage(demand: int, supply: int) -> tuple[float, SkillShortageStatus]:
    """Deterministic ratio and shortage classification matching Phase 13 rules."""
    denom = max(supply, 1)
    ratio = round(demand / denom, 2)
    if demand >= 3 and supply == 0:
        return ratio, SkillShortageStatus.HIGH_SHORTAGE
    if ratio >= 3.0:
        return ratio, SkillShortageStatus.HIGH_SHORTAGE
    if ratio >= 1.5:
        return ratio, SkillShortageStatus.MODERATE_SHORTAGE
    if ratio >= 0.7:
        return ratio, SkillShortageStatus.BALANCED
    if demand == 0 and supply == 0:
        return 0.0, SkillShortageStatus.BALANCED
    return ratio, SkillShortageStatus.SURPLUS


def _get_category_severity(category: SkillShortageStatus) -> int:
    """Integer severity rank for comparing category transitions (higher = more severe shortage)."""
    ranks = {
        SkillShortageStatus.SURPLUS: 1,
        SkillShortageStatus.BALANCED: 2,
        SkillShortageStatus.MODERATE_SHORTAGE: 3,
        SkillShortageStatus.HIGH_SHORTAGE: 4,
    }
    return ranks.get(category, 2)


def _generate_explanation(
    skill_name: str,
    baseline: SkillScenarioBaseline,
    scenario: SkillScenarioInput,
    projected: SkillScenarioProjected,
    impact: SkillScenarioImpact,
) -> str:
    """Generate deterministic, explainable plain-text summary of the simulated scenario."""
    parts = []
    baseline_desc = (
        "actual platform baseline"
        if baseline.baseline_type == SimulatorBaselineType.ACTUAL
        else f"Phase 14 forecast baseline ({baseline.forecast_horizon}M horizon)"
    )
    parts.append(f"Simulation for {skill_name} evaluated against {baseline_desc}.")

    # Demand change
    if scenario.demand_change_percent != 0:
        direction = "increases" if scenario.demand_change_percent > 0 else "decreases"
        parts.append(
            f"Demand {direction} by {abs(scenario.demand_change_percent):.1f}%, "
            f"shifting projected demand from {baseline.demand} to {projected.demand}."
        )
    else:
        parts.append(f"Demand is held constant at {baseline.demand}.")

    # Supply change
    if scenario.additional_verified_supply > 0:
        parts.append(
            f"Adding {scenario.additional_verified_supply} verified candidates expands "
            f"verified supply from {baseline.verified_supply} to {projected.verified_supply}."
        )

    # Training capacity change
    if scenario.additional_training_capacity > 0:
        parts.append(
            f"Adding {scenario.additional_training_capacity} training seats increases "
            f"course capacity from {baseline.training_capacity} to "
            f"{projected.training_capacity} seats (potential future talent pipeline)."
        )

    # Shortage ratio & category
    ratio_dir = "decreases" if impact.shortage_ratio_change < 0 else "increases"
    parts.append(
        f"The demand-to-supply shortage ratio {ratio_dir} from "
        f"{baseline.shortage_ratio:.2f} to {projected.shortage_ratio:.2f}."
    )

    if impact.category_changed:
        parts.append(
            f"Shortage classification transitions from {impact.previous_category.value} "
            f"to {impact.new_category.value}."
        )
    else:
        parts.append(f"Shortage classification remains {impact.new_category.value}.")

    if scenario.additional_training_capacity > 0:
        parts.append(
            "Note: Training capacity expansion represents learning infrastructure and "
            "does not directly convert 1:1 into immediate verified candidate supply."
        )

    return " ".join(parts)


async def simulate_skill_scenario(
    db: AsyncSession,
    scenario: SkillScenarioInput,
) -> SkillScenarioResult:
    """Run a stateless what-if simulation for a single canonical skill."""
    # 1. Fetch Skill
    skill = await db.get(Skill, scenario.skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID '{scenario.skill_id}' not found in canonical catalog.",
        )

    # 2. Baseline verified supply
    supply_q = select(func.count(distinct(VerifiedSkill.candidate_id))).where(
        VerifiedSkill.skill_id == scenario.skill_id,
        VerifiedSkill.verification_status == VerificationStatus.VERIFIED,
    )
    baseline_supply = (await db.scalar(supply_q)) or 0

    # 3. Baseline training capacity
    capacity_q = (
        select(func.coalesce(func.sum(Course.capacity), 0))
        .join(CourseSkill, CourseSkill.course_id == Course.id)
        .where(
            CourseSkill.skill_id == scenario.skill_id,
            Course.status == CourseStatus.PUBLISHED,
            Course.is_active == True,  # noqa: E712
        )
    )
    baseline_capacity = int((await db.scalar(capacity_q)) or 0)

    # 4. Baseline demand
    if scenario.baseline_type == SimulatorBaselineType.FORECAST:
        forecast_resp = await get_skill_forecast(
            db=db,
            skill_id=scenario.skill_id,
            horizon=scenario.forecast_horizon,
        )
        baseline_demand = max(0, int(forecast_resp.forecasted_demand_end))
    else:
        # Actual published active jobs
        demand_q = (
            select(func.count(Job.id))
            .join(JobSkill, JobSkill.job_id == Job.id)
            .where(
                JobSkill.skill_id == scenario.skill_id,
                Job.status == JobStatus.PUBLISHED,
                Job.is_active == True,  # noqa: E712
            )
        )
        baseline_demand = (await db.scalar(demand_q)) or 0

    # Baseline ratio & classification
    baseline_ratio, baseline_category = _classify_shortage(baseline_demand, baseline_supply)

    baseline_obj = SkillScenarioBaseline(
        demand=baseline_demand,
        verified_supply=baseline_supply,
        training_capacity=baseline_capacity,
        shortage_ratio=baseline_ratio,
        shortage_category=baseline_category,
        baseline_type=scenario.baseline_type,
        forecast_horizon=(
            scenario.forecast_horizon
            if scenario.baseline_type == SimulatorBaselineType.FORECAST
            else None
        ),
    )

    # 5. Projected calculations
    projected_demand = max(
        0, int(round(baseline_demand * (1.0 + scenario.demand_change_percent / 100.0)))
    )
    projected_supply = max(0, baseline_supply + scenario.additional_verified_supply)
    projected_capacity = max(0, baseline_capacity + scenario.additional_training_capacity)
    projected_ratio, projected_category = _classify_shortage(projected_demand, projected_supply)

    projected_obj = SkillScenarioProjected(
        demand=projected_demand,
        verified_supply=projected_supply,
        training_capacity=projected_capacity,
        shortage_ratio=projected_ratio,
        shortage_category=projected_category,
    )

    # 6. Impact calculation
    demand_change = projected_demand - baseline_demand
    demand_change_pct = (
        round((demand_change / baseline_demand * 100.0), 1)
        if baseline_demand > 0
        else (0.0 if projected_demand == 0 else 100.0)
    )

    supply_change = projected_supply - baseline_supply
    supply_change_pct = (
        round((supply_change / baseline_supply * 100.0), 1)
        if baseline_supply > 0
        else (0.0 if projected_supply == 0 else 100.0)
    )

    capacity_change = projected_capacity - baseline_capacity
    capacity_change_pct = (
        round((capacity_change / baseline_capacity * 100.0), 1)
        if baseline_capacity > 0
        else (0.0 if projected_capacity == 0 else 100.0)
    )

    ratio_change = round(projected_ratio - baseline_ratio, 2)
    category_changed = baseline_category != projected_category

    impact_obj = SkillScenarioImpact(
        demand_change=demand_change,
        demand_change_percent=demand_change_pct,
        supply_change=supply_change,
        supply_change_percent=supply_change_pct,
        training_capacity_change=capacity_change,
        training_capacity_change_percent=capacity_change_pct,
        shortage_ratio_change=ratio_change,
        category_changed=category_changed,
        previous_category=baseline_category,
        new_category=projected_category,
    )

    # 7. Related skills lookup from Phase 5
    rel_q = (
        select(Skill.name)
        .join(
            SkillRelationship,
            or_(
                (SkillRelationship.target_skill_id == Skill.id)
                & (SkillRelationship.source_skill_id == scenario.skill_id),
                (SkillRelationship.source_skill_id == Skill.id)
                & (SkillRelationship.target_skill_id == scenario.skill_id),
            ),
        )
        .where(Skill.id != scenario.skill_id)
        .distinct()
        .limit(10)
    )
    related_skills = list((await db.scalars(rel_q)).all())

    # 8. Deterministic explanation
    explanation = _generate_explanation(
        skill_name=skill.name,
        baseline=baseline_obj,
        scenario=scenario,
        projected=projected_obj,
        impact=impact_obj,
    )

    return SkillScenarioResult(
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        skill_type=skill.skill_type.value
        if hasattr(skill.skill_type, "value")
        else str(skill.skill_type)
        if skill.skill_type
        else None,
        baseline=baseline_obj,
        scenario=scenario,
        projected=projected_obj,
        impact=impact_obj,
        explanation=explanation,
        related_skills=related_skills,
    )


async def simulate_multi_skill_scenario(
    db: AsyncSession,
    request: MultiSkillScenarioRequest,
) -> MultiSkillScenarioResponse:
    """Run batch what-if simulations for multiple canonical skills with batched queries."""
    if not request.skills:
        return MultiSkillScenarioResponse(
            results=[],
            total_skills=0,
            categories_improved_count=0,
            categories_worsened_count=0,
            categories_unchanged_count=0,
        )

    # Validate all skill IDs exist in batch
    skill_ids = [s.skill_id for s in request.skills]
    skills_q = select(Skill).where(Skill.id.in_(skill_ids))
    found_skills = (await db.scalars(skills_q)).all()
    found_ids = {s.id for s in found_skills}

    for s_input in request.skills:
        if s_input.skill_id not in found_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill with ID '{s_input.skill_id}' not found in canonical catalog.",
            )

    results: list[SkillScenarioResult] = []
    improved = 0
    worsened = 0
    unchanged = 0

    for s_input in request.skills:
        result = await simulate_skill_scenario(db=db, scenario=s_input)
        results.append(result)

        prev_severity = _get_category_severity(result.impact.previous_category)
        new_severity = _get_category_severity(result.impact.new_category)
        if new_severity < prev_severity:
            improved += 1
        elif new_severity > prev_severity:
            worsened += 1
        else:
            unchanged += 1

    return MultiSkillScenarioResponse(
        results=results,
        total_skills=len(results),
        categories_improved_count=improved,
        categories_worsened_count=worsened,
        categories_unchanged_count=unchanged,
    )

"""Phase 14: Skill Demand Forecasting Service.

Deterministic, statistical, local forecasting engine for SkillSync AI.
Supports Holt Exponential Smoothing, Linear Trend Regression, and Baseline Fallbacks
with 1–12 month horizons, 95% confidence intervals, growth classifications, and
forecasted shortage tracking.

NOTE: Actual demand remains the immutable source of truth from Phase 13.
Predictions are clearly identified, bounded (>= 0), and never overwrite history.
"""

import datetime
import math
import uuid

import numpy as np
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from statsmodels.tsa.api import Holt

from app.models.course import Course, CourseSkill, CourseStatus
from app.models.job import Job, JobSkill, JobStatus
from app.models.profiles import EmployerProfile
from app.models.skill import Skill
from app.models.verified_skill import VerificationStatus, VerifiedSkill
from app.schemas.demand import (
    DemandGrowthTrend,
    DemandSeriesPoint,
    ForecastModelType,
    GlobalForecastOverviewResponse,
    GlobalForecastSummaryItem,
    SkillDemandTrendItem,
    SkillForecastMonthItem,
    SkillForecastResponse,
    SkillShortageStatus,
)


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


def _add_months(year: int, month: int, step: int) -> tuple[int, int]:
    """Add integer step of months to (year, month)."""
    total_months = (year * 12 + (month - 1)) + step
    y = total_months // 12
    m = (total_months % 12) + 1
    return y, m


def _generate_month_sequence(
    latest_year: int, latest_month: int, horizon: int
) -> list[tuple[str, str]]:
    """Return [(Month Year label, YYYY-MM-01)] for horizon months forward."""
    seq: list[tuple[str, str]] = []
    for step in range(1, horizon + 1):
        y, m = _add_months(latest_year, latest_month, step)
        dt = datetime.date(y, m, 1)
        label = dt.strftime("%B %Y")
        iso = dt.strftime("%Y-%m-01")
        seq.append((label, iso))
    return seq


def _fit_and_forecast(
    counts: list[int],
    horizon: int,
) -> tuple[list[int], list[int], list[int], str, float | None]:
    """Generate forward predictions, lower bounds, upper bounds, model name, and MAE.

    Returns:
        (predictions, lower_bounds, upper_bounds, model_name, mae)
    """
    n = len(counts)

    # 1. Zero or empty series
    if n == 0 or all(c == 0 for c in counts):
        preds = [0] * horizon
        lowers = [0] * horizon
        uppers = [0] * horizon
        return preds, lowers, uppers, ForecastModelType.BASELINE_FALLBACK.value, 0.0

    # 2. Sparse history (1 to 2 points) -> Baseline / Moving Average Fallback
    if n < 3:
        avg = float(np.mean(counts))
        pred_val = max(0, int(round(avg)))
        preds = [pred_val] * horizon
        spread = max(1, int(round(avg * 0.25)))
        lowers = [max(0, pred_val - spread)] * horizon
        uppers = [pred_val + spread] * horizon
        return preds, lowers, uppers, ForecastModelType.BASELINE_FALLBACK.value, None

    # 3. Calculate MAE with backtesting if n >= 4
    mae: float | None = None
    if n >= 4:
        try:
            train = counts[:-2]
            test = counts[-2:]
            x_tr = np.arange(len(train))
            slope, intercept = np.polyfit(x_tr, train, 1)
            x_te = np.arange(len(train), len(counts))
            test_preds = np.maximum(0, np.round(slope * x_te + intercept))
            mae = float(np.mean(np.abs(np.array(test) - test_preds)))
            mae = round(mae, 2)
        except Exception:
            mae = None

    # 4. Holt Exponential Smoothing for 6+ observations
    if n >= 6 and len(set(counts)) > 1:
        try:
            y_arr = np.array(counts, dtype=float)
            holt_model = Holt(y_arr, initialization_method="estimated").fit(
                smoothing_level=0.4, smoothing_trend=0.2
            )
            raw_forecast = holt_model.forecast(horizon)
            residuals = y_arr - holt_model.fittedvalues
            sigma = float(np.std(residuals)) if len(residuals) > 0 else 1.0

            preds = []
            lowers = []
            uppers = []
            for i, val in enumerate(raw_forecast):
                p = max(0, int(round(val)))
                margin = max(1, int(round(1.96 * sigma * math.sqrt(i + 1))))
                preds.append(p)
                lowers.append(max(0, p - margin))
                uppers.append(p + margin)

            return preds, lowers, uppers, ForecastModelType.HOLT.value, mae
        except Exception:
            pass  # Fall through to linear trend if Holt fails

    # 5. Linear Trend Regression (3+ observations)
    try:
        x = np.arange(n)
        slope, intercept = np.polyfit(x, counts, 1)
        fitted = slope * x + intercept
        residuals = counts - fitted
        sigma = float(np.std(residuals)) if len(residuals) > 0 else 1.0

        preds = []
        lowers = []
        uppers = []
        for step in range(1, horizon + 1):
            future_x = (n - 1) + step
            raw_p = slope * future_x + intercept
            p = max(0, int(round(raw_p)))
            margin = max(1, int(round(1.96 * sigma * math.sqrt(step))))
            preds.append(p)
            lowers.append(max(0, p - margin))
            uppers.append(p + margin)

        return preds, lowers, uppers, ForecastModelType.LINEAR_TREND.value, mae
    except Exception:
        # 6. Final safety baseline
        last_val = counts[-1]
        preds = [max(0, last_val)] * horizon
        lowers = [max(0, last_val - 1)] * horizon
        uppers = [last_val + 1] * horizon
        return preds, lowers, uppers, ForecastModelType.BASELINE_FALLBACK.value, mae


def _classify_growth_trend(
    latest_actual: int, forecast_end: int, horizon: int, skill_name: str
) -> tuple[float, DemandGrowthTrend, str]:
    """Compute growth %, trend category, and deterministic interpretation."""
    denom = max(latest_actual, 1)
    diff = forecast_end - latest_actual
    growth_pct = round((diff / denom) * 100.0, 1)

    if growth_pct >= 10.0:
        trend = DemandGrowthTrend.INCREASING
        interp = (
            f"Demand for {skill_name} is projected to increase by {growth_pct:+0.1f}% "
            f"over the next {horizon} months (from {latest_actual} to {forecast_end} jobs)."
        )
    elif growth_pct <= -10.0:
        trend = DemandGrowthTrend.DECLINING
        interp = (
            f"Demand for {skill_name} is projected to decline by {abs(growth_pct):0.1f}% "
            f"over the next {horizon} months (from {latest_actual} to {forecast_end} jobs)."
        )
    else:
        trend = DemandGrowthTrend.STABLE
        interp = (
            f"Demand for {skill_name} is projected to remain relatively stable "
            f"({growth_pct:+0.1f}%) over the next {horizon} months."
        )

    return growth_pct, trend, interp


async def get_skill_forecast(
    db: AsyncSession,
    skill_id: uuid.UUID,
    horizon: int = 3,
) -> SkillForecastResponse:
    """Compute detailed 360 forecast for a single canonical skill."""
    if horizon < 1 or horizon > 12:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail="Forecast horizon must be between 1 and 12 months.",
        )

    # 1. Fetch Skill
    skill = await db.get(Skill, skill_id)
    if not skill:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Skill not found")

    # 2. Historical Monthly Job Counts (Active + Published jobs only)
    jobs_q = (
        select(Job.created_at)
        .join(JobSkill, JobSkill.job_id == Job.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
        .order_by(Job.created_at.asc())
    )
    job_dates = (await db.scalars(jobs_q)).all()

    month_counts: dict[str, int] = {}
    month_labels: dict[str, str] = {}
    for dt in job_dates:
        if not dt:
            continue
        period_key = dt.strftime("%Y-%m")
        month_counts[period_key] = month_counts.get(period_key, 0) + 1
        month_labels[period_key] = dt.strftime("%B %Y")

    historical_trends = [
        SkillDemandTrendItem(
            period=month_labels[k],
            period_date=f"{k}-01",
            demand_count=cnt,
        )
        for k, cnt in sorted(month_counts.items())
    ]

    hist_counts = [item.demand_count for item in historical_trends]
    latest_actual = hist_counts[-1] if hist_counts else 0
    latest_month_label = historical_trends[-1].period if historical_trends else None

    # Base reference date for forward projection
    if historical_trends:
        parts = historical_trends[-1].period_date.split("-")
        ref_year, ref_month = int(parts[0]), int(parts[1])
    else:
        today = datetime.date.today()
        ref_year, ref_month = today.year, today.month

    # 3. Statistical Forecasting
    preds, lowers, uppers, model_name, mae = _fit_and_forecast(hist_counts, horizon)
    future_months = _generate_month_sequence(ref_year, ref_month, horizon)

    monthly_forecasts: list[SkillForecastMonthItem] = []
    for (label, iso_date), p, l_b, u_b in zip(future_months, preds, lowers, uppers, strict=False):
        monthly_forecasts.append(
            SkillForecastMonthItem(
                forecast_month=label,
                forecast_month_date=iso_date,
                predicted_demand=p,
                lower_bound=l_b,
                upper_bound=u_b,
                confidence_level=0.95,
            )
        )

    forecast_end = preds[-1] if preds else 0
    growth_pct, trend, interpretation = _classify_growth_trend(
        latest_actual, forecast_end, horizon, skill.name
    )

    # 4. Verified Supply from Phase 12
    supply_q = select(func.count(distinct(VerifiedSkill.candidate_id))).where(
        VerifiedSkill.skill_id == skill_id,
        VerifiedSkill.verification_status == VerificationStatus.VERIFIED,
    )
    verified_supply = (await db.scalar(supply_q)) or 0

    # 5. Shortages
    _, current_shortage = _classify_shortage(latest_actual, verified_supply)
    forecast_ratio, forecasted_shortage = _classify_shortage(forecast_end, verified_supply)

    # 6. Training Courses from Phase 11
    course_q = (
        select(
            func.count(distinct(Course.id)),
            func.count(distinct(Course.provider_id)),
        )
        .join(CourseSkill, CourseSkill.course_id == Course.id)
        .where(
            CourseSkill.skill_id == skill_id,
            Course.status == CourseStatus.PUBLISHED,
            Course.is_active == True,  # noqa: E712
        )
    )
    course_res = (await db.execute(course_q)).first()
    courses_count = int(course_res[0]) if course_res else 0
    providers_count = int(course_res[1]) if course_res else 0

    training_insight = (
        f"There are {courses_count} published training courses across {providers_count} "
        f"provider(s) mapped to {skill.name}."
    )

    # 7. Combined Time Series for Visual Charts
    combined_series: list[DemandSeriesPoint] = []
    for h in historical_trends:
        combined_series.append(
            DemandSeriesPoint(
                month=h.period,
                month_date=h.period_date,
                actual_demand=h.demand_count,
                predicted_demand=None,
                lower_bound=None,
                upper_bound=None,
                data_type="ACTUAL",
            )
        )
    for mf in monthly_forecasts:
        combined_series.append(
            DemandSeriesPoint(
                month=mf.forecast_month,
                month_date=mf.forecast_month_date,
                actual_demand=None,
                predicted_demand=mf.predicted_demand,
                lower_bound=mf.lower_bound,
                upper_bound=mf.upper_bound,
                data_type="FORECAST",
            )
        )

    return SkillForecastResponse(
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        skill_type=skill.skill_type,
        current_actual_demand=latest_actual,
        latest_actual_month=latest_month_label,
        forecast_horizon_months=horizon,
        model_used=model_name,
        historical_observations_count=len(hist_counts),
        confidence_level=0.95,
        forecasted_demand_end=forecast_end,
        expected_growth_percentage=growth_pct,
        growth_trend=trend,
        growth_interpretation=interpretation,
        current_verified_supply=verified_supply,
        current_shortage_status=current_shortage,
        forecasted_demand_supply_ratio=forecast_ratio,
        forecasted_shortage_status=forecasted_shortage,
        available_training_courses_count=courses_count,
        training_insight=training_insight,
        evaluation_mae=mae,
        monthly_forecasts=monthly_forecasts,
        combined_series=combined_series,
    )


async def get_global_demand_forecast(
    db: AsyncSession,
    horizon: int = 3,
    industry: str | None = None,
    location: str | None = None,
    limit: int = 50,
) -> GlobalForecastOverviewResponse:
    """Batch-computes multi-skill demand forecasts for the global forecasting dashboard.

    Aggregates historical demand without N+1 queries by grouping active published jobs
    by canonical skill and monthly period.
    """
    if horizon < 1 or horizon > 12:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail="Forecast horizon must be between 1 and 12 months.",
        )

    # 1. Base Job Query with optional industry / location filters
    q = (
        select(
            Skill.id.label("skill_id"),
            Skill.name.label("skill_name"),
            Skill.category.label("category"),
            Skill.skill_type.label("skill_type"),
            Job.created_at.label("created_at"),
        )
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .where(
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )

    if industry:
        q = q.join(EmployerProfile, EmployerProfile.id == Job.employer_id).where(
            EmployerProfile.industry.ilike(f"%{industry.strip()}%")
        )
    if location:
        loc_term = f"%{location.strip()}%"
        q = q.where(
            or_(
                Job.location_city.ilike(loc_term),
                Job.location_state.ilike(loc_term),
            )
        )

    q = q.order_by(Job.created_at.asc())
    rows = (await db.execute(q)).all()

    # 2. Group monthly counts per skill
    skill_meta: dict[uuid.UUID, dict] = {}
    skill_monthly: dict[uuid.UUID, dict[str, int]] = {}

    for row in rows:
        sid = row.skill_id
        if sid not in skill_meta:
            skill_meta[sid] = {
                "name": row.skill_name,
                "category": row.category,
                "skill_type": row.skill_type,
            }
            skill_monthly[sid] = {}

        if row.created_at:
            m_key = row.created_at.strftime("%Y-%m")
        else:
            m_key = datetime.date.today().strftime("%Y-%m")
        skill_monthly[sid][m_key] = skill_monthly[sid].get(m_key, 0) + 1

    # 3. Supply counts per skill
    supply_q = (
        select(VerifiedSkill.skill_id, func.count(distinct(VerifiedSkill.candidate_id)))
        .where(VerifiedSkill.verification_status == VerificationStatus.VERIFIED)
        .group_by(VerifiedSkill.skill_id)
    )
    supply_rows = (await db.execute(supply_q)).all()
    supply_map: dict[uuid.UUID, int] = {r[0]: int(r[1]) for r in supply_rows}

    # 4. Forecast each skill in memory
    items: list[GlobalForecastSummaryItem] = []
    total_current = 0
    total_forecasted = 0

    for sid, months_dict in skill_monthly.items():
        sorted_counts = [cnt for _, cnt in sorted(months_dict.items())]
        latest_act = sorted_counts[-1] if sorted_counts else 0
        preds, lowers, uppers, model_name, _ = _fit_and_forecast(sorted_counts, horizon)
        f_end = preds[-1] if preds else 0
        l_bound = lowers[-1] if lowers else 0
        u_bound = uppers[-1] if uppers else 0

        sup = supply_map.get(sid, 0)
        _, cur_shortage = _classify_shortage(latest_act, sup)
        _, f_shortage = _classify_shortage(f_end, sup)
        growth_pct, trend, _ = _classify_growth_trend(
            latest_act, f_end, horizon, skill_meta[sid]["name"]
        )

        total_current += latest_act
        total_forecasted += f_end

        items.append(
            GlobalForecastSummaryItem(
                skill_id=sid,
                skill_name=skill_meta[sid]["name"],
                category=skill_meta[sid]["category"],
                skill_type=skill_meta[sid]["skill_type"],
                current_demand=latest_act,
                forecasted_demand=f_end,
                growth_percentage=growth_pct,
                growth_trend=trend,
                current_shortage_status=cur_shortage,
                forecasted_shortage_status=f_shortage,
                model_used=model_name,
                lower_bound=l_bound,
                upper_bound=u_bound,
            )
        )

    # Sort leaderboard by forecasted demand desc
    items.sort(key=lambda s: s.forecasted_demand, reverse=True)

    top_growing = sorted(
        [s for s in items if s.growth_percentage > 0],
        key=lambda s: s.growth_percentage,
        reverse=True,
    )[:10]

    top_declining = sorted(
        [s for s in items if s.growth_percentage < 0],
        key=lambda s: s.growth_percentage,
    )[:10]

    high_shortages = [
        s for s in items if s.forecasted_shortage_status == SkillShortageStatus.HIGH_SHORTAGE
    ][:10]

    overall_growth = (
        round(((total_forecasted - total_current) / max(total_current, 1)) * 100.0, 1)
        if total_current > 0
        else 0.0
    )

    return GlobalForecastOverviewResponse(
        horizon_months=horizon,
        total_current_demand=total_current,
        total_forecasted_demand=total_forecasted,
        overall_growth_percentage=overall_growth,
        top_growing_skills=top_growing,
        top_declining_skills=top_declining,
        high_forecast_shortage_skills=high_shortages,
        forecast_items=items[:limit],
    )

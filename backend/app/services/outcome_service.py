"""Outcome intelligence and provider performance business services (Phase 17)."""

import uuid
from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application, ApplicationStatus
from app.models.course import Course
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import Job
from app.models.outcome import (
    PlacementOutcome,
    PlacementTrainingAttribution,
    PPITier,
    ProviderPerformanceSnapshot,
    RetentionStatus,
)
from app.models.profiles import CandidateProfile, EmployerProfile, TrainingProviderProfile
from app.models.skill import Skill
from app.models.skill_contract import ContractStatus, SkillContract
from app.models.user import User, UserRole
from app.schemas.outcome import (
    DistrictOutcomeKPIs,
    OutcomeAnalyticsOverview,
    PlacementOutcomeCreate,
    PlacementOutcomeResponse,
    PlacementOutcomeSummary,
    ProviderLeaderboardItem,
    ProviderPerformanceResponse,
    RetentionUpdatePayload,
    SkillPlacementRateInsight,
    TrainingAttributionResponse,
)


def calculate_provider_performance_index(
    completion_rate: float,
    placement_rate: float,
    retention_rate_90d: float,
    average_employer_rating: float | None,
) -> tuple[float, PPITier, dict[str, float]]:
    """Calculates deterministic Provider Performance Index (0-100) and assigned Tier.

    Formula:
        PPI = 0.25 * CompletionRate
            + 0.35 * PlacementRate
            + 0.20 * RetentionRate90d
            + 0.20 * EmployerRatingNormalized
        where EmployerRatingNormalized = (AverageEmployerRating / 5) * 100
    """
    comp = max(0.0, min(100.0, float(completion_rate)))
    place = max(0.0, min(100.0, float(placement_rate)))
    ret = max(0.0, min(100.0, float(retention_rate_90d)))

    if average_employer_rating is not None and average_employer_rating > 0:
        emp_norm = max(0.0, min(100.0, (float(average_employer_rating) / 5.0) * 100.0))
    else:
        emp_norm = 0.0

    comp_contrib = 0.25 * comp
    place_contrib = 0.35 * place
    ret_contrib = 0.20 * ret
    emp_contrib = 0.20 * emp_norm

    raw_ppi = comp_contrib + place_contrib + ret_contrib + emp_contrib
    ppi_score = round(max(0.0, min(100.0, raw_ppi)), 2)

    if ppi_score >= 85.0:
        tier = PPITier.TIER_1_EXCELLENT
    elif ppi_score >= 70.0:
        tier = PPITier.TIER_2_PROFICIENT
    elif ppi_score >= 50.0:
        tier = PPITier.TIER_3_DEVELOPING
    else:
        tier = PPITier.TIER_4_NEEDS_IMPROVEMENT

    breakdown = {
        "completion_contribution": round(comp_contrib, 2),
        "placement_contribution": round(place_contrib, 2),
        "retention_contribution": round(ret_contrib, 2),
        "employer_rating_contribution": round(emp_contrib, 2),
    }

    return ppi_score, tier, breakdown


async def _load_full_placement(
    db: AsyncSession, placement_id: uuid.UUID
) -> PlacementOutcome | None:
    """Helper to query placement outcome with all relational models eager-loaded."""
    query = (
        select(PlacementOutcome)
        .options(
            selectinload(PlacementOutcome.application),
            selectinload(PlacementOutcome.candidate).selectinload(CandidateProfile.user),
            selectinload(PlacementOutcome.employer),
            selectinload(PlacementOutcome.job),
            selectinload(PlacementOutcome.contract),
            selectinload(PlacementOutcome.training_attributions).selectinload(
                PlacementTrainingAttribution.course
            ),
            selectinload(PlacementOutcome.training_attributions).selectinload(
                PlacementTrainingAttribution.provider
            ),
        )
        .where(PlacementOutcome.id == placement_id)
    )
    res = await db.execute(query)
    return res.scalar_one_or_none()


def _format_placement_response(
    outcome: PlacementOutcome, anonymize_candidate: bool = False
) -> PlacementOutcomeResponse:
    """Builds clean response schema with optional PII mask for caller."""
    attributions = [
        TrainingAttributionResponse(
            id=attr.id,
            enrollment_id=attr.enrollment_id,
            course_id=attr.course_id,
            course_title=attr.course.title if attr.course else "Unknown Course",
            provider_id=attr.provider_id,
            provider_name=attr.provider.institution_name if attr.provider else "Unknown Provider",
            completed_at=attr.completed_at,
        )
        for attr in outcome.training_attributions
    ]

    candidate_display = None
    if outcome.candidate and outcome.candidate.user:
        if anonymize_candidate:
            name_parts = outcome.candidate.user.full_name.split()
            first = name_parts[0] if name_parts else "Candidate"
            last_init = f" {name_parts[-1][0]}." if len(name_parts) > 1 and name_parts[-1] else ""
            candidate_display = f"{first}{last_init}"
        else:
            candidate_display = outcome.candidate.user.full_name

    return PlacementOutcomeResponse(
        id=outcome.id,
        application_id=outcome.application_id,
        candidate_id=outcome.candidate_id,
        candidate_name=candidate_display,
        employer_id=outcome.employer_id,
        employer_company_name=outcome.employer.company_name if outcome.employer else None,
        job_id=outcome.job_id,
        job_title=outcome.job.title if outcome.job else None,
        contract_id=outcome.contract_id,
        contract_title=outcome.contract.title if outcome.contract else None,
        placement_date=outcome.placement_date,
        starting_salary_annual=outcome.starting_salary_annual,
        employment_type=outcome.employment_type,
        retention_status=outcome.retention_status,
        contract_fulfillment_score=outcome.contract_fulfillment_score,
        employer_satisfaction_rating=outcome.employer_satisfaction_rating,
        employer_feedback_notes=outcome.employer_feedback_notes,
        verified_by_employer=outcome.verified_by_employer,
        training_attributions=attributions,
        created_at=outcome.created_at,
        updated_at=outcome.updated_at,
    )


async def record_placement(
    db: AsyncSession, payload: PlacementOutcomeCreate, user: User
) -> PlacementOutcomeResponse:
    """Verifies eligibility and records a placement outcome with training attributions."""
    if user.role not in (UserRole.EMPLOYER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers and administrators can record employment placement outcomes",
        )

    # 1. Fetch application and verify existence
    app_query = (
        select(Application)
        .options(
            selectinload(Application.job),
            selectinload(Application.candidate),
        )
        .where(Application.id == payload.application_id)
    )
    res = await db.execute(app_query)
    application = res.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application '{payload.application_id}' not found",
        )

    # 2. Verify hired status
    if application.status != ApplicationStatus.HIRED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Application must be in HIRED state to record placement "
                f"(current: {application.status.value})"
            ),
        )

    # 3. Verify employer ownership
    if user.role == UserRole.EMPLOYER:
        emp_res = await db.execute(
            select(EmployerProfile).where(EmployerProfile.user_id == user.id)
        )
        employer_profile = emp_res.scalar_one_or_none()
        if not employer_profile or application.job.employer_id != employer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You can only record placement outcomes for candidates "
                    "hired into your own job requisitions"
                ),
            )
        employer_id = employer_profile.id
    else:
        employer_id = application.job.employer_id

    # 4. Check existing duplicate placement
    existing = await db.scalar(
        select(PlacementOutcome).where(PlacementOutcome.application_id == payload.application_id)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A placement outcome has already been recorded for this job application",
        )

    # 5. Contract resolution
    contract_id = payload.contract_id
    if contract_id:
        contract = await db.scalar(
            select(SkillContract).where(
                SkillContract.id == contract_id,
                SkillContract.job_id == application.job_id,
            )
        )
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified skill contract does not exist or does not belong to this job",
            )
    else:
        # Check active contract for this job
        active_contract = await db.scalar(
            select(SkillContract).where(
                SkillContract.job_id == application.job_id,
                SkillContract.status == ContractStatus.ACTIVE,
            )
        )
        contract_id = active_contract.id if active_contract else None

    # 6. Create PlacementOutcome
    outcome_id = uuid.uuid4()
    outcome = PlacementOutcome(
        id=outcome_id,
        application_id=application.id,
        candidate_id=application.candidate_id,
        employer_id=employer_id,
        job_id=application.job_id,
        contract_id=contract_id,
        placement_date=payload.placement_date,
        starting_salary_annual=payload.starting_salary_annual,
        employment_type=payload.employment_type,
        retention_status=RetentionStatus.ACTIVE,
        verified_by_employer=True,
    )
    db.add(outcome)
    await db.flush()

    # 7. Associate candidate's completed training pathways (0..N attributions)
    enrollments_query = (
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(
            Enrollment.candidate_id == application.candidate_id,
            Enrollment.status == EnrollmentStatus.COMPLETED,
        )
    )
    enr_res = await db.execute(enrollments_query)
    completed_enrollments = enr_res.scalars().all()

    for enr in completed_enrollments:
        if enr.course:
            attr = PlacementTrainingAttribution(
                id=uuid.uuid4(),
                placement_id=outcome_id,
                enrollment_id=enr.id,
                course_id=enr.course_id,
                provider_id=enr.course.provider_id,
                completed_at=enr.completed_at or enr.updated_at or datetime.now(UTC),
            )
            db.add(attr)

    await db.commit()

    loaded = await _load_full_placement(db, outcome_id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Failed to load created placement")
    return _format_placement_response(loaded)


async def get_placement_by_id(
    db: AsyncSession, placement_id: uuid.UUID, user: User
) -> PlacementOutcomeResponse:
    """Retrieves single placement outcome with RBAC / IDOR enforcement."""
    loaded = await _load_full_placement(db, placement_id)
    if not loaded:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Placement outcome '{placement_id}' not found",
        )

    anonymize = False
    if user.role == UserRole.CANDIDATE:
        cand_prof = await db.scalar(
            select(CandidateProfile).where(CandidateProfile.user_id == user.id)
        )
        if not cand_prof or loaded.candidate_id != cand_prof.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to access this placement outcome",
            )
    elif user.role == UserRole.EMPLOYER:
        emp_prof = await db.scalar(
            select(EmployerProfile).where(EmployerProfile.user_id == user.id)
        )
        if not emp_prof or loaded.employer_id != emp_prof.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to access another employer's placement outcome",
            )
    elif user.role == UserRole.TRAINING_PROVIDER:
        tp_prof = await db.scalar(
            select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == user.id)
        )
        has_attr = any(attr.provider_id == tp_prof.id for attr in loaded.training_attributions)
        if not tp_prof or not has_attr:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to access this placement record",
            )
        anonymize = True

    return _format_placement_response(loaded, anonymize_candidate=anonymize)


async def update_retention_and_feedback(
    db: AsyncSession,
    placement_id: uuid.UUID,
    payload: RetentionUpdatePayload,
    user: User,
) -> PlacementOutcomeResponse:
    """Updates retention milestones and employer feedback under strict transition validation."""
    query = (
        select(PlacementOutcome)
        .options(
            selectinload(PlacementOutcome.training_attributions),
        )
        .where(PlacementOutcome.id == placement_id)
    )
    res = await db.execute(query)
    outcome = res.scalar_one_or_none()

    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Placement outcome '{placement_id}' not found",
        )

    # RBAC check
    if user.role == UserRole.EMPLOYER:
        emp_prof = await db.scalar(
            select(EmployerProfile).where(EmployerProfile.user_id == user.id)
        )
        if not emp_prof or outcome.employer_id != emp_prof.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to update this placement outcome",
            )
    elif user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the hiring employer or an administrator can update retention and feedback",
        )

    # Validate valid progression milestones
    curr = outcome.retention_status
    target = payload.retention_status

    valid_transitions = {
        RetentionStatus.ACTIVE: {
            RetentionStatus.ACTIVE,
            RetentionStatus.LEFT_WITHIN_30D,
            RetentionStatus.RETAINED_90D,
            RetentionStatus.TERMINATED,
        },
        RetentionStatus.RETAINED_90D: {
            RetentionStatus.RETAINED_90D,
            RetentionStatus.RETAINED_180D,
            RetentionStatus.TERMINATED,
        },
        RetentionStatus.RETAINED_180D: {
            RetentionStatus.RETAINED_180D,
            RetentionStatus.TERMINATED,
        },
        RetentionStatus.LEFT_WITHIN_30D: {
            RetentionStatus.LEFT_WITHIN_30D,
        },
        RetentionStatus.TERMINATED: {
            RetentionStatus.TERMINATED,
        },
    }

    if target not in valid_transitions.get(curr, {curr}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid retention status transition from {curr.value} to {target.value}",
        )

    # Score validations
    if payload.employer_satisfaction_rating is not None:
        if not (1 <= payload.employer_satisfaction_rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employer satisfaction rating must be an integer between 1 and 5",
            )
        outcome.employer_satisfaction_rating = payload.employer_satisfaction_rating

    if payload.contract_fulfillment_score is not None:
        if not (0.0 <= payload.contract_fulfillment_score <= 100.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract fulfillment score must be between 0.0 and 100.0",
            )
        outcome.contract_fulfillment_score = payload.contract_fulfillment_score

    if payload.employer_feedback_notes is not None:
        outcome.employer_feedback_notes = payload.employer_feedback_notes

    outcome.retention_status = target
    await db.commit()

    loaded = await _load_full_placement(db, outcome.id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Failed to load updated placement")
    return _format_placement_response(loaded)


async def list_placements(
    db: AsyncSession,
    user: User,
    limit: int = 50,
    offset: int = 0,
) -> list[PlacementOutcomeSummary]:
    """Lists authorized placement summaries for the current user."""
    query = select(PlacementOutcome).options(
        selectinload(PlacementOutcome.candidate).selectinload(CandidateProfile.user),
        selectinload(PlacementOutcome.employer),
        selectinload(PlacementOutcome.job),
        selectinload(PlacementOutcome.training_attributions),
    )

    anonymize = False
    if user.role == UserRole.EMPLOYER:
        emp_prof = await db.scalar(
            select(EmployerProfile).where(EmployerProfile.user_id == user.id)
        )
        if not emp_prof:
            return []
        query = query.where(PlacementOutcome.employer_id == emp_prof.id)
    elif user.role == UserRole.CANDIDATE:
        cand_prof = await db.scalar(
            select(CandidateProfile).where(CandidateProfile.user_id == user.id)
        )
        if not cand_prof:
            return []
        query = query.where(PlacementOutcome.candidate_id == cand_prof.id)
    elif user.role == UserRole.TRAINING_PROVIDER:
        tp_prof = await db.scalar(
            select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == user.id)
        )
        if not tp_prof:
            return []
        query = query.join(
            PlacementTrainingAttribution,
            PlacementOutcome.id == PlacementTrainingAttribution.placement_id,
        ).where(PlacementTrainingAttribution.provider_id == tp_prof.id)
        anonymize = True

    query = query.order_by(PlacementOutcome.placement_date.desc()).offset(offset).limit(limit)
    res = await db.execute(query)
    outcomes = res.scalars().all()

    summaries = []
    for o in outcomes:
        candidate_name = None
        if o.candidate and o.candidate.user:
            if anonymize:
                parts = o.candidate.user.full_name.split()
                first = parts[0] if parts else "Graduate"
                last_i = f" {parts[-1][0]}." if len(parts) > 1 and parts[-1] else ""
                candidate_name = f"{first}{last_i}"
            else:
                candidate_name = o.candidate.user.full_name

        summaries.append(
            PlacementOutcomeSummary(
                id=o.id,
                application_id=o.application_id,
                candidate_id=o.candidate_id,
                candidate_name=candidate_name,
                employer_company_name=o.employer.company_name if o.employer else None,
                job_title=o.job.title if o.job else None,
                placement_date=o.placement_date,
                employment_type=o.employment_type,
                retention_status=o.retention_status,
                starting_salary_annual=o.starting_salary_annual,
                employer_satisfaction_rating=o.employer_satisfaction_rating,
                has_training_attribution=len(o.training_attributions) > 0,
                created_at=o.created_at,
            )
        )
    return summaries


async def calculate_provider_snapshot(
    db: AsyncSession,
    provider_id: uuid.UUID,
    period_start: date | None = None,
    period_end: date | None = None,
) -> ProviderPerformanceResponse:
    """Computes performance metrics and deterministic PPI score for a provider."""
    # 1. Fetch provider
    provider = await db.scalar(
        select(TrainingProviderProfile).where(TrainingProviderProfile.id == provider_id)
    )
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training provider '{provider_id}' not found",
        )

    # 2. Query enrollments across provider's courses
    enr_stats = await db.execute(
        select(
            func.count(Enrollment.id).label("total_enrolled"),
            func.count(func.nullif(Enrollment.status != EnrollmentStatus.COMPLETED, True)).label(
                "total_completed"
            ),
        )
        .join(Course, Enrollment.course_id == Course.id)
        .where(Course.provider_id == provider_id)
    )
    enr_row = enr_stats.first()
    total_enrolled = enr_row.total_enrolled if enr_row else 0
    total_completed = enr_row.total_completed if enr_row else 0

    completion_rate = (
        round((total_completed / total_enrolled) * 100.0, 2) if total_enrolled > 0 else 0.0
    )

    # 3. Query placements attributed to this provider
    attr_query = (
        select(PlacementOutcome)
        .join(
            PlacementTrainingAttribution,
            PlacementOutcome.id == PlacementTrainingAttribution.placement_id,
        )
        .where(PlacementTrainingAttribution.provider_id == provider_id)
        .distinct()
    )
    attr_res = await db.execute(attr_query)
    attributed_placements = attr_res.scalars().all()

    total_placed = len(attributed_placements)
    placement_rate = (
        round(min(100.0, (total_placed / total_completed) * 100.0), 2)
        if total_completed > 0
        else 0.0
    )

    # 4. Retention (90-day milestone)
    retained_90d_count = sum(
        1
        for p in attributed_placements
        if p.retention_status in (RetentionStatus.RETAINED_90D, RetentionStatus.RETAINED_180D)
    )
    retention_rate_90d = (
        round((retained_90d_count / total_placed) * 100.0, 2) if total_placed > 0 else 0.0
    )

    # 5. Starting salary & Employer rating
    salaries = [
        p.starting_salary_annual
        for p in attributed_placements
        if p.starting_salary_annual is not None
    ]
    avg_salary = round(sum(salaries) / len(salaries), 2) if salaries else None

    ratings = [
        p.employer_satisfaction_rating
        for p in attributed_placements
        if p.employer_satisfaction_rating is not None
    ]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    # 6. PPI Calculation
    ppi_score, ppi_tier, breakdown = calculate_provider_performance_index(
        completion_rate=completion_rate,
        placement_rate=placement_rate,
        retention_rate_90d=retention_rate_90d,
        average_employer_rating=avg_rating,
    )

    # 7. Persist snapshot if period is defined
    if period_start and period_end:
        existing_snap = await db.scalar(
            select(ProviderPerformanceSnapshot).where(
                ProviderPerformanceSnapshot.provider_id == provider_id,
                ProviderPerformanceSnapshot.period_start == period_start,
                ProviderPerformanceSnapshot.period_end == period_end,
            )
        )
        if existing_snap:
            existing_snap.total_enrolled = total_enrolled
            existing_snap.total_completed = total_completed
            existing_snap.total_placed = total_placed
            existing_snap.completion_rate = completion_rate
            existing_snap.placement_rate = placement_rate
            existing_snap.retention_rate_90d = retention_rate_90d
            existing_snap.average_starting_salary = avg_salary
            existing_snap.average_employer_rating = avg_rating
            existing_snap.ppi_score = ppi_score
            existing_snap.ppi_tier = ppi_tier
        else:
            snap = ProviderPerformanceSnapshot(
                id=uuid.uuid4(),
                provider_id=provider_id,
                period_start=period_start,
                period_end=period_end,
                total_enrolled=total_enrolled,
                total_completed=total_completed,
                total_placed=total_placed,
                completion_rate=completion_rate,
                placement_rate=placement_rate,
                retention_rate_90d=retention_rate_90d,
                average_starting_salary=avg_salary,
                average_employer_rating=avg_rating,
                ppi_score=ppi_score,
                ppi_tier=ppi_tier,
            )
            db.add(snap)
        await db.commit()

    return ProviderPerformanceResponse(
        provider_id=provider_id,
        provider_name=provider.institution_name,
        period_start=period_start,
        period_end=period_end,
        total_enrolled=total_enrolled,
        total_completed=total_completed,
        total_placed=total_placed,
        completion_rate=completion_rate,
        placement_rate=placement_rate,
        retention_rate_90d=retention_rate_90d,
        average_starting_salary=avg_salary,
        average_employer_rating=avg_rating,
        ppi_score=ppi_score,
        ppi_tier=ppi_tier,
        calculation_breakdown=breakdown,
    )


async def get_provider_performance(
    db: AsyncSession, provider_id: uuid.UUID
) -> ProviderPerformanceResponse:
    """Gets real-time performance metrics and PPI score for a provider."""
    return await calculate_provider_snapshot(db, provider_id)


async def get_provider_leaderboard(
    db: AsyncSession, limit: int = 50
) -> list[ProviderLeaderboardItem]:
    """Returns deterministically ranked training provider leaderboard."""
    providers = (await db.scalars(select(TrainingProviderProfile))).all()

    items: list[ProviderLeaderboardItem] = []
    for prov in providers:
        perf = await calculate_provider_snapshot(db, prov.id)
        items.append(
            ProviderLeaderboardItem(
                rank=0,  # Will assign after sort
                provider_id=prov.id,
                provider_name=prov.institution_name,
                ppi_score=perf.ppi_score,
                ppi_tier=perf.ppi_tier,
                completion_rate=perf.completion_rate,
                placement_rate=perf.placement_rate,
                retention_rate_90d=perf.retention_rate_90d,
                average_starting_salary=perf.average_starting_salary,
                average_employer_rating=perf.average_employer_rating,
                total_graduates=perf.total_completed,
                total_placed=perf.total_placed,
            )
        )

    # Sort: ppi_score DESC, placement_rate DESC, retention_rate_90d DESC, provider_id ASC
    items.sort(
        key=lambda x: (
            -x.ppi_score,
            -x.placement_rate,
            -x.retention_rate_90d,
            str(x.provider_id),
        )
    )

    for idx, item in enumerate(items[:limit]):
        item.rank = idx + 1

    return items[:limit]


async def get_macro_outcome_analytics(
    db: AsyncSession,
) -> OutcomeAnalyticsOverview:
    """Returns aggregated ecosystem outcome metrics with zero PII exposure."""
    # 1. Total placements
    total_placements = (await db.scalar(select(func.count(PlacementOutcome.id)))) or 0

    # 2. Total tracked candidates
    total_candidates = (await db.scalar(select(func.count(CandidateProfile.id)))) or 0

    # 3. Overall placement rate
    placed_candidates_cnt = (
        await db.scalar(select(func.count(distinct(PlacementOutcome.candidate_id))))
    ) or 0
    placement_rate = (
        round((placed_candidates_cnt / total_candidates) * 100.0, 2)
        if total_candidates > 0
        else 0.0
    )

    # 4. Starting salary & Satisfaction averages
    salary_res = await db.scalar(
        select(func.avg(PlacementOutcome.starting_salary_annual)).where(
            PlacementOutcome.starting_salary_annual.is_not(None)
        )
    )
    avg_salary = round(float(salary_res), 2) if salary_res is not None else None

    sat_res = await db.scalar(
        select(func.avg(PlacementOutcome.employer_satisfaction_rating)).where(
            PlacementOutcome.employer_satisfaction_rating.is_not(None)
        )
    )
    avg_sat = round(float(sat_res), 2) if sat_res is not None else None

    # 5. Retention breakdown
    ret_rows = await db.execute(
        select(
            PlacementOutcome.retention_status,
            func.count(PlacementOutcome.id),
        ).group_by(PlacementOutcome.retention_status)
    )
    ret_dist = {r[0].value: r[1] for r in ret_rows.all()}

    retained_90_180 = (ret_dist.get(RetentionStatus.RETAINED_90D.value, 0)) + (
        ret_dist.get(RetentionStatus.RETAINED_180D.value, 0)
    )
    avg_retention_90d = (
        round((retained_90_180 / total_placements) * 100.0, 2) if total_placements > 0 else 0.0
    )

    # 6. Employment type distribution
    emp_type_rows = await db.execute(
        select(
            PlacementOutcome.employment_type,
            func.count(PlacementOutcome.id),
        ).group_by(PlacementOutcome.employment_type)
    )
    emp_dist = {r[0].value: r[1] for r in emp_type_rows.all()}

    # 7. District benchmarks
    dist_rows = await db.execute(
        select(
            Job.location_city,
            Job.location_state,
            func.count(PlacementOutcome.id).label("placements"),
            func.avg(PlacementOutcome.starting_salary_annual).label("avg_salary"),
        )
        .join(PlacementOutcome, Job.id == PlacementOutcome.job_id)
        .where(Job.location_city.is_not(None))
        .group_by(Job.location_city, Job.location_state)
        .order_by(func.count(PlacementOutcome.id).desc())
        .limit(10)
    )
    districts = []
    for d in dist_rows.all():
        city = d[0] or "Unknown District"
        st = d[1]
        cnt = d[2]
        sal = round(float(d[3]), 2) if d[3] is not None else None
        districts.append(
            DistrictOutcomeKPIs(
                district=city,
                state=st,
                total_placements=cnt,
                average_salary=sal,
                retention_rate_90d=avg_retention_90d,
            )
        )

    return OutcomeAnalyticsOverview(
        total_placements=total_placements,
        placement_rate=placement_rate,
        average_retention_90d=avg_retention_90d,
        average_starting_salary=avg_salary,
        average_employer_satisfaction=avg_sat,
        total_tracked_candidates=total_candidates,
        placement_by_employment_type=emp_dist,
        retention_distribution=ret_dist,
        district_benchmarks=districts,
    )


async def get_skill_outcome_analytics(
    db: AsyncSession, limit: int = 50
) -> list[SkillPlacementRateInsight]:
    """Calculates placement and wage conversion metrics for canonical skills."""
    # Placements associated with skills through Job requirements or Course skills
    # Group by canonical Skill
    skills = (await db.scalars(select(Skill).limit(limit))).all()

    insights = []
    for s in skills:
        # Check placements for jobs requiring this skill
        placements_q = (
            select(PlacementOutcome)
            .join(Job, PlacementOutcome.job_id == Job.id)
            .where(Job.skills.any(skill_id=s.id))
        )
        p_res = await db.execute(placements_q)
        placements = p_res.scalars().all()
        count = len(placements)

        salaries = [
            p.starting_salary_annual for p in placements if p.starting_salary_annual is not None
        ]
        avg_sal = round(sum(salaries) / len(salaries), 2) if salaries else None

        retained = sum(
            1
            for p in placements
            if p.retention_status in (RetentionStatus.RETAINED_90D, RetentionStatus.RETAINED_180D)
        )
        ret_rate = round((retained / count) * 100.0, 2) if count > 0 else 0.0

        insights.append(
            SkillPlacementRateInsight(
                skill_id=s.id,
                skill_name=s.name,
                category=s.category,
                placement_count=count,
                placement_rate=round(min(100.0, count * 15.0), 2) if count > 0 else 0.0,
                average_salary=avg_sal,
                retention_rate_90d=ret_rate,
            )
        )

    insights.sort(key=lambda x: -x.placement_count)
    return insights

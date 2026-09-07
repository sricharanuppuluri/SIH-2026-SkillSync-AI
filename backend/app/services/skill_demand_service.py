"""Skill Demand Digital Twin service: deterministic demand and supply intelligence.

IMPORTANT: This module represents demand and supply observed within the SkillSync_AI
platform data. It is NOT an authoritative real-world labor-market dataset.

Demand source: Job records with status=PUBLISHED and is_active=True.
Draft, CLOSED, and inactive jobs are excluded from demand calculations.

Shortage classification (deterministic, documented thresholds):
    ratio = demand_count / max(verified_supply_count, 1)
    HIGH_SHORTAGE     : ratio >= 3.0  OR  (demand >= 3 AND verified_supply == 0)
    MODERATE_SHORTAGE : 1.5 <= ratio < 3.0
    BALANCED          : 0.7 <= ratio < 1.5
    SURPLUS           : ratio < 0.7   OR  (demand == 0 AND verified_supply > 0)
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_skill import CandidateSkill
from app.models.course import Course, CourseSkill, CourseStatus
from app.models.job import Job, JobSkill, JobStatus
from app.models.profiles import EmployerProfile, TrainingProviderProfile
from app.models.skill import Skill, SkillRelationship
from app.models.verified_skill import VerificationStatus, VerifiedSkill
from app.schemas.demand import (
    DemandOverviewKPIs,
    DemandOverviewResponse,
    SkillDemandDetailResponse,
    SkillDemandIndustryItem,
    SkillDemandLocationItem,
    SkillDemandSummaryItem,
    SkillDemandTrainingItem,
    SkillDemandTrendItem,
    SkillShortageStatus,
    SkillSupplyBreakdown,
)


def classify_shortage(
    demand_count: int, verified_supply_count: int
) -> tuple[float, SkillShortageStatus]:
    """Calculate deterministic Demand/Supply ratio and shortage classification.

    See module docstring for exact threshold documentation.
    """
    if demand_count == 0:
        status_val = (
            SkillShortageStatus.SURPLUS
            if verified_supply_count > 0
            else SkillShortageStatus.BALANCED
        )
        return 0.0, status_val

    ratio = round(demand_count / max(verified_supply_count, 1), 2)

    if verified_supply_count == 0 and demand_count >= 3:
        status_val = SkillShortageStatus.HIGH_SHORTAGE
    elif ratio >= 3.0:
        status_val = SkillShortageStatus.HIGH_SHORTAGE
    elif ratio >= 1.5:
        status_val = SkillShortageStatus.MODERATE_SHORTAGE
    elif ratio >= 0.7:
        status_val = SkillShortageStatus.BALANCED
    else:
        status_val = SkillShortageStatus.SURPLUS

    return ratio, status_val


async def _count_active_jobs(
    db: AsyncSession,
    industry: str | None = None,
    location: str | None = None,
) -> int:
    """Count total PUBLISHED+is_active jobs matching optional filters."""
    query = select(func.count(Job.id)).where(
        Job.status == JobStatus.PUBLISHED,
        Job.is_active == True,  # noqa: E712
    )
    if industry:
        query = query.join(EmployerProfile, Job.employer_id == EmployerProfile.id).where(
            EmployerProfile.industry.ilike(f"%{industry.strip()}%")
        )
    if location:
        loc_term = f"%{location.strip()}%"
        query = query.where(
            (Job.location_city.ilike(loc_term)) | (Job.location_state.ilike(loc_term))
        )
    return (await db.scalar(query)) or 0


async def list_skill_demand(
    db: AsyncSession,
    search: str | None = None,
    skill_type: str | None = None,
    industry: str | None = None,
    location: str | None = None,
    shortage_status: SkillShortageStatus | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[SkillDemandSummaryItem], int]:
    """Aggregate demand, verified supply, and training supply across canonical skills.

    SQL-first aggregation; no N+1 loops.
    Returns (paginated_items, total_matched_count).
    """
    total_active_jobs = await _count_active_jobs(db, industry=industry, location=location)

    # -- Demand per skill (distinct active published jobs) --
    demand_stmt = (
        select(
            JobSkill.skill_id.label("skill_id"),
            func.count(distinct(Job.id)).label("demand_count"),
        )
        .join(Job, JobSkill.job_id == Job.id)
        .where(
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )
    if industry:
        demand_stmt = demand_stmt.join(
            EmployerProfile, Job.employer_id == EmployerProfile.id
        ).where(EmployerProfile.industry.ilike(f"%{industry.strip()}%"))
    if location:
        loc_term = f"%{location.strip()}%"
        demand_stmt = demand_stmt.where(
            (Job.location_city.ilike(loc_term)) | (Job.location_state.ilike(loc_term))
        )
    demand_stmt = demand_stmt.group_by(JobSkill.skill_id)
    demand_subq = demand_stmt.subquery()

    # -- Verified supply per skill (distinct candidates VERIFIED) --
    verified_subq = (
        select(
            VerifiedSkill.skill_id.label("skill_id"),
            func.count(distinct(VerifiedSkill.candidate_id)).label("verified_count"),
        )
        .where(VerifiedSkill.verification_status == VerificationStatus.VERIFIED)
        .group_by(VerifiedSkill.skill_id)
        .subquery()
    )

    # -- Published training courses per skill --
    course_subq = (
        select(
            CourseSkill.skill_id.label("skill_id"),
            func.count(distinct(Course.id)).label("courses_count"),
        )
        .join(Course, CourseSkill.course_id == Course.id)
        .where(
            Course.status == CourseStatus.PUBLISHED,
            Course.is_active == True,  # noqa: E712
        )
        .group_by(CourseSkill.skill_id)
        .subquery()
    )

    # -- Join with canonical Skill --
    main_query = (
        select(
            Skill.id,
            Skill.name,
            Skill.category,
            Skill.skill_type,
            func.coalesce(demand_subq.c.demand_count, 0).label("demand_count"),
            func.coalesce(verified_subq.c.verified_count, 0).label("verified_supply_count"),
            func.coalesce(course_subq.c.courses_count, 0).label("training_courses_count"),
        )
        .outerjoin(demand_subq, Skill.id == demand_subq.c.skill_id)
        .outerjoin(verified_subq, Skill.id == verified_subq.c.skill_id)
        .outerjoin(course_subq, Skill.id == course_subq.c.skill_id)
    )

    if search:
        main_query = main_query.where(Skill.name.ilike(f"%{search.strip()}%"))
    if skill_type:
        main_query = main_query.where(Skill.skill_type.ilike(f"%{skill_type.strip()}%"))

    main_query = main_query.order_by(
        func.coalesce(demand_subq.c.demand_count, 0).desc(),
        Skill.name.asc(),
    )

    results = (await db.execute(main_query)).all()

    all_items: list[SkillDemandSummaryItem] = []
    current_rank = 1
    for row in results:
        demand = int(row.demand_count)
        verified = int(row.verified_supply_count)
        courses = int(row.training_courses_count)
        demand_share = (
            round((demand / total_active_jobs) * 100, 1) if total_active_jobs > 0 else 0.0
        )
        ratio, s_status = classify_shortage(demand, verified)

        if shortage_status and s_status != shortage_status:
            current_rank += 1
            continue

        item = SkillDemandSummaryItem(
            skill_id=row.id,
            skill_name=row.name,
            category=row.category,
            skill_type=row.skill_type,
            demand_count=demand,
            demand_share_percentage=demand_share,
            rank=current_rank,
            verified_supply_count=verified,
            demand_supply_ratio=ratio,
            shortage_status=s_status,
            training_courses_count=courses,
        )
        all_items.append(item)
        current_rank += 1

    total_count = len(all_items)
    paginated_items = all_items[skip : skip + limit]
    return paginated_items, total_count


async def get_demand_overview(
    db: AsyncSession,
    industry: str | None = None,
    location: str | None = None,
) -> DemandOverviewResponse:
    """Generate the Digital Twin dashboard overview KPIs and leaderboard summaries."""
    total_active_jobs = await _count_active_jobs(db, industry=industry, location=location)

    # Unique demanded skill ids in active jobs
    unique_skills_q = (
        select(func.count(distinct(JobSkill.skill_id)))
        .join(Job, JobSkill.job_id == Job.id)
        .where(
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )
    if industry:
        unique_skills_q = unique_skills_q.join(
            EmployerProfile, Job.employer_id == EmployerProfile.id
        ).where(EmployerProfile.industry.ilike(f"%{industry.strip()}%"))
    if location:
        loc_term = f"%{location.strip()}%"
        unique_skills_q = unique_skills_q.where(
            (Job.location_city.ilike(loc_term)) | (Job.location_state.ilike(loc_term))
        )
    unique_skills_in_demand = (await db.scalar(unique_skills_q)) or 0

    # Distinct verified candidates (platform-wide)
    verified_cands_q = select(func.count(distinct(VerifiedSkill.candidate_id))).where(
        VerifiedSkill.verification_status == VerificationStatus.VERIFIED
    )
    verified_candidates = (await db.scalar(verified_cands_q)) or 0

    # Published courses
    published_courses_q = select(func.count(Course.id)).where(
        Course.status == CourseStatus.PUBLISHED,
        Course.is_active == True,  # noqa: E712
    )
    published_courses = (await db.scalar(published_courses_q)) or 0

    # All skills for shortage calculations and leaderboard
    all_skills, _ = await list_skill_demand(
        db, industry=industry, location=location, skip=0, limit=2000
    )

    shortage_count = sum(
        1
        for s in all_skills
        if s.shortage_status
        in (SkillShortageStatus.HIGH_SHORTAGE, SkillShortageStatus.MODERATE_SHORTAGE)
    )

    top_demanded = [s for s in all_skills if s.demand_count > 0][:5]

    highest_shortage = sorted(
        [
            s
            for s in all_skills
            if s.shortage_status
            in (SkillShortageStatus.HIGH_SHORTAGE, SkillShortageStatus.MODERATE_SHORTAGE)
        ],
        key=lambda x: (x.demand_supply_ratio, x.demand_count),
        reverse=True,
    )[:5]

    kpis = DemandOverviewKPIs(
        total_active_jobs=total_active_jobs,
        unique_skills_in_demand=unique_skills_in_demand,
        verified_candidate_supply=verified_candidates,
        published_training_courses=published_courses,
        skills_in_shortage=shortage_count,
    )

    return DemandOverviewResponse(
        kpis=kpis,
        top_demanded_skills=top_demanded,
        highest_shortage_skills=highest_shortage,
    )


async def _require_skill(db: AsyncSession, skill_id: uuid.UUID) -> Skill:
    """Fetch a canonical skill or raise 404."""
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canonical skill with id '{skill_id}' was not found.",
        )
    return skill


async def get_skill_demand_detail(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> SkillDemandDetailResponse:
    """Retrieve comprehensive Digital Twin data for a single canonical skill."""
    skill = await _require_skill(db, skill_id)
    total_active_jobs = await _count_active_jobs(db)

    # -- Demand count --
    demand_q = (
        select(func.count(distinct(Job.id)))
        .join(JobSkill, JobSkill.job_id == Job.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )
    demand_count = (await db.scalar(demand_q)) or 0
    demand_share = (
        round((demand_count / total_active_jobs) * 100, 1) if total_active_jobs > 0 else 0.0
    )

    # Rank = number of skills with HIGHER demand + 1
    rank_q = (
        select(
            JobSkill.skill_id,
            func.count(distinct(Job.id)).label("cnt"),
        )
        .join(Job, JobSkill.job_id == Job.id)
        .where(
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
        .group_by(JobSkill.skill_id)
        .having(func.count(distinct(Job.id)) > demand_count)
    )
    higher_count = len((await db.execute(rank_q)).all())
    rank = higher_count + 1

    # -- Supply --
    supply = await get_skill_demand_supply(db, skill_id)

    # -- Gap --
    ratio, shortage_status = classify_shortage(demand_count, supply.verified_candidates)

    # -- Training --
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
    published_courses = int(course_res[0]) if course_res else 0
    training_providers = int(course_res[1]) if course_res else 0

    industries = await get_skill_demand_industries(db, skill_id)
    locations = await get_skill_demand_locations(db, skill_id)
    trends = await get_skill_demand_trends(db, skill_id)

    # Related skills via SkillRelationship
    rel_q = (
        select(Skill.name)
        .join(
            SkillRelationship,
            (
                (SkillRelationship.target_skill_id == Skill.id)
                & (SkillRelationship.source_skill_id == skill_id)
            )
            | (
                (SkillRelationship.source_skill_id == Skill.id)
                & (SkillRelationship.target_skill_id == skill_id)
            ),
        )
        .distinct()
        .limit(8)
    )
    related_skills = list((await db.scalars(rel_q)).all())

    return SkillDemandDetailResponse(
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        skill_type=skill.skill_type,
        description=skill.description,
        demand_count=demand_count,
        demand_share_percentage=demand_share,
        rank=rank,
        supply=supply,
        demand_supply_ratio=ratio,
        shortage_status=shortage_status,
        published_courses_count=published_courses,
        training_providers_count=training_providers,
        top_industries=industries[:5],
        top_locations=locations[:5],
        historical_trends=trends,
        related_skills=related_skills,
    )


async def get_skill_demand_trends(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> list[SkillDemandTrendItem]:
    """Monthly historical demand counts for a skill from published active jobs.

    Phase 13 shows actual past data only. Forecasting is Phase 14.
    """
    await _require_skill(db, skill_id)

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

    return [
        SkillDemandTrendItem(
            period=month_labels[k],
            period_date=f"{k}-01",
            demand_count=cnt,
        )
        for k, cnt in sorted(month_counts.items())
    ]


async def get_skill_demand_locations(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> list[SkillDemandLocationItem]:
    """Geographic demand distribution for a canonical skill (platform data only)."""
    await _require_skill(db, skill_id)

    total_skill_jobs_q = (
        select(func.count(distinct(Job.id)))
        .join(JobSkill, JobSkill.job_id == Job.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )
    total_skill_jobs = (await db.scalar(total_skill_jobs_q)) or 0

    loc_q = (
        select(
            Job.location_city,
            Job.location_state,
            Job.is_remote,
            func.count(distinct(Job.id)).label("loc_demand"),
        )
        .join(JobSkill, JobSkill.job_id == Job.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
        .group_by(Job.location_city, Job.location_state, Job.is_remote)
        .order_by(func.count(distinct(Job.id)).desc())
    )
    rows = (await db.execute(loc_q)).all()

    items: list[SkillDemandLocationItem] = []
    for row in rows:
        cnt = int(row.loc_demand)
        share = round((cnt / total_skill_jobs) * 100, 1) if total_skill_jobs > 0 else 0.0
        city = row.location_city or ("Remote" if row.is_remote else "Unspecified")
        items.append(
            SkillDemandLocationItem(
                city=city,
                state=row.location_state,
                is_remote=row.is_remote,
                demand_count=cnt,
                demand_share_percentage=share,
            )
        )
    return items


async def get_skill_demand_industries(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> list[SkillDemandIndustryItem]:
    """Industry demand distribution for a canonical skill (from employer.industry field)."""
    await _require_skill(db, skill_id)

    total_skill_jobs_q = (
        select(func.count(distinct(Job.id)))
        .join(JobSkill, JobSkill.job_id == Job.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
    )
    total_skill_jobs = (await db.scalar(total_skill_jobs_q)) or 0

    ind_q = (
        select(
            EmployerProfile.industry,
            func.count(distinct(Job.id)).label("ind_demand"),
        )
        .join(JobSkill, JobSkill.job_id == Job.id)
        .join(EmployerProfile, Job.employer_id == EmployerProfile.id)
        .where(
            JobSkill.skill_id == skill_id,
            Job.status == JobStatus.PUBLISHED,
            Job.is_active == True,  # noqa: E712
        )
        .group_by(EmployerProfile.industry)
        .order_by(func.count(distinct(Job.id)).desc())
    )
    rows = (await db.execute(ind_q)).all()

    items: list[SkillDemandIndustryItem] = []
    for row in rows:
        cnt = int(row.ind_demand)
        share = round((cnt / total_skill_jobs) * 100, 1) if total_skill_jobs > 0 else 0.0
        industry_name = row.industry or "General / Other"
        items.append(
            SkillDemandIndustryItem(
                industry=industry_name,
                demand_count=cnt,
                demand_share_percentage=share,
            )
        )
    return items


async def get_skill_demand_supply(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> SkillSupplyBreakdown:
    """Verified vs unverified supply counts for a canonical skill.

    NOTE: Aggregate counts only — no personal candidate data exposed.
    """
    await _require_skill(db, skill_id)

    verified_q = select(func.count(distinct(VerifiedSkill.candidate_id))).where(
        VerifiedSkill.skill_id == skill_id,
        VerifiedSkill.verification_status == VerificationStatus.VERIFIED,
    )
    verified_count = (await db.scalar(verified_q)) or 0

    declared_q = select(func.count(distinct(CandidateSkill.candidate_id))).where(
        CandidateSkill.skill_id == skill_id
    )
    declared_count = (await db.scalar(declared_q)) or 0

    unverified_count = max(declared_count - verified_count, 0)
    total_candidates = max(declared_count, verified_count)

    method_q = (
        select(
            VerifiedSkill.verification_method,
            func.count(VerifiedSkill.id),
        )
        .where(
            VerifiedSkill.skill_id == skill_id,
            VerifiedSkill.verification_status == VerificationStatus.VERIFIED,
        )
        .group_by(VerifiedSkill.verification_method)
    )
    method_rows = (await db.execute(method_q)).all()
    by_method = {str(row[0]): int(row[1]) for row in method_rows}

    return SkillSupplyBreakdown(
        verified_candidates=verified_count,
        unverified_candidates=unverified_count,
        total_candidates=total_candidates,
        by_verification_method=by_method,
    )


async def get_skill_demand_training(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> list[SkillDemandTrainingItem]:
    """List published active courses teaching this canonical skill."""
    await _require_skill(db, skill_id)

    query = (
        select(
            Course.id,
            Course.title,
            Course.difficulty,
            Course.mode,
            Course.duration_hours,
            Course.capacity,
            TrainingProviderProfile.institution_name,
        )
        .join(CourseSkill, CourseSkill.course_id == Course.id)
        .join(
            TrainingProviderProfile,
            Course.provider_id == TrainingProviderProfile.id,
        )
        .where(
            CourseSkill.skill_id == skill_id,
            Course.status == CourseStatus.PUBLISHED,
            Course.is_active == True,  # noqa: E712
        )
        .order_by(Course.title.asc())
    )
    rows = (await db.execute(query)).all()

    return [
        SkillDemandTrainingItem(
            course_id=row.id,
            course_title=row.title,
            difficulty_level=str(row.difficulty.value)
            if hasattr(row.difficulty, "value")
            else str(row.difficulty),
            delivery_mode=str(row.mode.value) if hasattr(row.mode, "value") else str(row.mode),
            duration_hours=row.duration_hours,
            capacity=row.capacity,
            institution_name=row.institution_name,
        )
        for row in rows
    ]

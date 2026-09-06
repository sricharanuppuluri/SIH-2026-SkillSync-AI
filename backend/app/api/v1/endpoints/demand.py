"""API Endpoints for Phase 13 — Skill Demand Digital Twin.

IMPORTANT:
  - All data is derived exclusively from the SkillSync_AI platform database.
  - No real-world external labor-market datasets are used.
  - Aggregate counts only — no individual candidate or employer data exposed.
  - Authentication is required for list and detail endpoints (any authenticated user).
  - Overview is public for transparency (government/employers/candidates/providers).
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.demand import (
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
from app.services import skill_demand_service

router = APIRouter()

_ANY_AUTHENTICATED = require_roles(
    UserRole.CANDIDATE,
    UserRole.EMPLOYER,
    UserRole.TRAINING_PROVIDER,
    UserRole.GOVERNMENT,
    UserRole.ADMIN,
)

# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------


@router.get(
    "/overview",
    response_model=DemandOverviewResponse,
    summary="Skill Demand Digital Twin — Platform Overview",
    description=(
        "Returns KPIs and leaderboards computed from active PUBLISHED jobs. "
        "No authentication required — public transparency endpoint."
    ),
)
async def get_demand_overview(
    db: AsyncSession = Depends(get_db),
    industry: str | None = Query(
        default=None, description="Filter KPIs to a specific employer industry"
    ),
    location: str | None = Query(
        default=None,
        description="Filter KPIs to a city/state substring (e.g. 'Hyderabad')",
    ),
) -> DemandOverviewResponse:
    """Platform-wide Digital Twin overview with KPIs and leaderboards."""
    return await skill_demand_service.get_demand_overview(db, industry=industry, location=location)


# ---------------------------------------------------------------------------
# Skill Demand List
# ---------------------------------------------------------------------------


@router.get(
    "/skills",
    response_model=list[SkillDemandSummaryItem],
    summary="List Skill Demand — Paginated Leaderboard",
)
async def list_skill_demand(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
    search: str | None = Query(default=None, description="Search by skill name"),
    skill_type: str | None = Query(
        default=None, description="Filter by skill type (TECHNICAL, SOFT, TOOL, etc.)"
    ),
    industry: str | None = Query(
        default=None, description="Filter by employer industry"
    ),
    location: str | None = Query(
        default=None, description="Filter by job location city/state"
    ),
    shortage_status: SkillShortageStatus | None = Query(
        default=None,
        description="Filter by shortage classification (HIGH_SHORTAGE, MODERATE_SHORTAGE, BALANCED, SURPLUS)",
    ),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=200, description="Page size"),
) -> list[SkillDemandSummaryItem]:
    """Paginated demand leaderboard across all canonical skills."""
    items, _ = await skill_demand_service.list_skill_demand(
        db,
        search=search,
        skill_type=skill_type,
        industry=industry,
        location=location,
        shortage_status=shortage_status,
        skip=skip,
        limit=limit,
    )
    return items


# ---------------------------------------------------------------------------
# Skill Detail
# ---------------------------------------------------------------------------


@router.get(
    "/skills/{skill_id}",
    response_model=SkillDemandDetailResponse,
    summary="Skill Demand Digital Twin — Full 360° Skill Detail",
)
async def get_skill_demand_detail(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> SkillDemandDetailResponse:
    """Retrieve full platform demand/supply intelligence for a single canonical skill."""
    return await skill_demand_service.get_skill_demand_detail(db, skill_id=skill_id)


# ---------------------------------------------------------------------------
# Skill Sub-resources
# ---------------------------------------------------------------------------


@router.get(
    "/skills/{skill_id}/trends",
    response_model=list[SkillDemandTrendItem],
    summary="Historical monthly demand trend for a skill",
)
async def get_skill_demand_trends(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> list[SkillDemandTrendItem]:
    """Historical monthly demand counts from active published job data. No forecasting."""
    return await skill_demand_service.get_skill_demand_trends(db, skill_id=skill_id)


@router.get(
    "/skills/{skill_id}/locations",
    response_model=list[SkillDemandLocationItem],
    summary="Geographic demand breakdown for a skill",
)
async def get_skill_demand_locations(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> list[SkillDemandLocationItem]:
    """Geographic distribution of demand for this skill from platform job data."""
    return await skill_demand_service.get_skill_demand_locations(db, skill_id=skill_id)


@router.get(
    "/skills/{skill_id}/industries",
    response_model=list[SkillDemandIndustryItem],
    summary="Industry demand breakdown for a skill",
)
async def get_skill_demand_industries(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> list[SkillDemandIndustryItem]:
    """Industry-wise demand distribution for this skill derived from employer profiles."""
    return await skill_demand_service.get_skill_demand_industries(db, skill_id=skill_id)


@router.get(
    "/skills/{skill_id}/supply",
    response_model=SkillSupplyBreakdown,
    summary="Candidate supply statistics for a skill",
)
async def get_skill_demand_supply(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> SkillSupplyBreakdown:
    """Aggregate candidate supply breakdown (verified vs unverified). No PII exposed."""
    return await skill_demand_service.get_skill_demand_supply(db, skill_id=skill_id)


@router.get(
    "/skills/{skill_id}/training",
    response_model=list[SkillDemandTrainingItem],
    summary="Published training courses available for a skill",
)
async def get_skill_demand_training(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> list[SkillDemandTrainingItem]:
    """List published active courses addressing this skill's training gap."""
    return await skill_demand_service.get_skill_demand_training(db, skill_id=skill_id)

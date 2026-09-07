"""Employment Outcome Intelligence & Provider Performance Index API endpoints (Phase 17)."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.outcome import (
    OutcomeAnalyticsOverview,
    PlacementOutcomeCreate,
    PlacementOutcomeResponse,
    PlacementOutcomeSummary,
    ProviderLeaderboardItem,
    ProviderPerformanceResponse,
    RetentionUpdatePayload,
    SkillPlacementRateInsight,
)
from app.services import outcome_service

router = APIRouter()


@router.post(
    "/placements",
    response_model=PlacementOutcomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record verified employment placement",
)
async def record_placement(
    payload: PlacementOutcomeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> PlacementOutcomeResponse:
    """Record a verified placement outcome for a hired job application."""
    return await outcome_service.record_placement(db, payload, current_user)


@router.get(
    "/placements",
    response_model=list[PlacementOutcomeSummary],
    summary="List authorized placement outcomes",
)
async def list_placements(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PlacementOutcomeSummary]:
    """Retrieve placement records scoped to the caller's role."""
    return await outcome_service.list_placements(db, user=current_user, limit=limit, offset=offset)


@router.get(
    "/placements/{placement_id}",
    response_model=PlacementOutcomeResponse,
    summary="Get single placement outcome details",
)
async def get_placement(
    placement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlacementOutcomeResponse:
    """Retrieve detailed placement record with training attribution and feedback."""
    return await outcome_service.get_placement_by_id(
        db, placement_id=placement_id, user=current_user
    )


@router.put(
    "/placements/{placement_id}/retention",
    response_model=PlacementOutcomeResponse,
    summary="Update retention milestone and employer feedback",
)
async def update_retention(
    placement_id: uuid.UUID,
    payload: RetentionUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> PlacementOutcomeResponse:
    """Update post-hire employment retention status and satisfaction rating."""
    return await outcome_service.update_retention_and_feedback(
        db, placement_id=placement_id, payload=payload, user=current_user
    )


@router.get(
    "/providers/{provider_id}/performance",
    response_model=ProviderPerformanceResponse,
    summary="Get training provider performance index (PPI)",
)
async def get_provider_performance(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProviderPerformanceResponse:
    """Calculate and return deterministic PPI score and quality tier."""
    return await outcome_service.get_provider_performance(db, provider_id=provider_id)


@router.get(
    "/providers/leaderboard",
    response_model=list[ProviderLeaderboardItem],
    summary="Get training provider performance leaderboard",
)
async def get_provider_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProviderLeaderboardItem]:
    """Retrieve deterministically ranked training provider leaderboard."""
    return await outcome_service.get_provider_leaderboard(db, limit=limit)


@router.get(
    "/analytics/overview",
    response_model=OutcomeAnalyticsOverview,
    summary="Get macro employment outcome analytics",
)
async def get_outcome_analytics_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OutcomeAnalyticsOverview:
    """Aggregate macro outcome intelligence and benchmarks (Zero PII)."""
    return await outcome_service.get_macro_outcome_analytics(db)


@router.get(
    "/analytics/skills",
    response_model=list[SkillPlacementRateInsight],
    summary="Get canonical skill placement & wage conversion insights",
)
async def get_skill_outcome_analytics(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SkillPlacementRateInsight]:
    """Retrieve labor market skill conversion rates and retention benchmarks."""
    return await outcome_service.get_skill_outcome_analytics(db, limit=limit)

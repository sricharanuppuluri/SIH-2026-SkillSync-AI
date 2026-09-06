"""API Endpoints for Verified Skill Passport and Skill Evidence Management."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.passport import (
    CandidatePassportResponse,
    PassportShareResponse,
    PassportShareToggleRequest,
    PublicPassportResponse,
    SkillEvidenceCreate,
    SkillEvidenceRead,
)
from app.services import candidate_service, verified_skill_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Candidate Verified Skill Passport Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/candidate/passport",
    response_model=CandidatePassportResponse,
    summary="Get candidate's Verified Skill Passport",
)
async def get_candidate_passport(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidatePassportResponse:
    """Retrieve full explainable competency passport for the authenticated candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    # Recalculate to ensure newly completed courses or declared skills are reflected
    return await verified_skill_service.recalculate_candidate_passport(db, profile.id)


@router.post(
    "/candidate/passport/recalculate",
    response_model=CandidatePassportResponse,
    summary="Explicitly recalculate candidate Verified Skill Passport",
)
async def recalculate_passport(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidatePassportResponse:
    """Idempotently evaluate deterministic verification rules across all available evidence."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await verified_skill_service.recalculate_candidate_passport(db, profile.id)


# ---------------------------------------------------------------------------
# Skill Evidence Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/candidate/passport/evidence",
    response_model=list[SkillEvidenceRead],
    summary="List all skill evidence items for authenticated candidate",
)
async def list_evidence(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[SkillEvidenceRead]:
    """Retrieve all evidence records (courses, declarations, certs) owned by candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await verified_skill_service.get_candidate_evidence_list(db, profile.id)


@router.post(
    "/candidate/passport/evidence",
    response_model=SkillEvidenceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add verifiable skill evidence item (e.g., certification)",
)
async def create_evidence(
    payload: SkillEvidenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> SkillEvidenceRead:
    """Candidate submits evidence record (e.g. external certification)
    and re-evaluates verification.
    """
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await verified_skill_service.create_candidate_evidence(db, profile.id, payload)


@router.delete(
    "/candidate/passport/evidence/{evidence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete candidate skill evidence item",
)
async def delete_evidence(
    evidence_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> None:
    """Candidate removes an owned evidence item and re-evaluates verification."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    await verified_skill_service.delete_candidate_evidence(db, profile.id, evidence_id)


# ---------------------------------------------------------------------------
# Passport Sharing Configuration Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/candidate/passport/share",
    response_model=PassportShareResponse,
    summary="Get candidate passport sharing link configuration",
)
async def get_share_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> PassportShareResponse:
    """Retrieve or generate candidate's secure share token and sharing status."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    share = await verified_skill_service.get_or_create_passport_share(db, profile.id)
    share_url = f"/passport/share/{share.share_token}" if share.is_enabled else None
    return PassportShareResponse(
        share_token=share.share_token,
        is_enabled=share.is_enabled,
        share_url=share_url,
    )


@router.post(
    "/candidate/passport/share",
    response_model=PassportShareResponse,
    summary="Toggle candidate passport public sharing",
)
async def toggle_share_status(
    payload: PassportShareToggleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> PassportShareResponse:
    """Enable or disable public share link for candidate passport."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await verified_skill_service.toggle_passport_share(db, profile.id, payload.is_enabled)


# ---------------------------------------------------------------------------
# Public Shareable Passport View (No Authentication Required)
# ---------------------------------------------------------------------------
@router.get(
    "/passport/share/{share_token}",
    response_model=PublicPassportResponse,
    summary="View public verified skill passport via secure token",
)
async def get_public_passport(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicPassportResponse:
    """Public read-only view of a verified skill passport using an unguessable share token."""
    return await verified_skill_service.get_public_passport_by_token(db, share_token)

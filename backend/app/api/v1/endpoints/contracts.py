"""Employer Skill Contract Exchange API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.skill_contract import ContractStatus
from app.models.user import User, UserRole
from app.schemas.skill_contract import (
    ContractInsightsResponse,
    ContractQualityResponse,
    SkillContractCreate,
    SkillContractResponse,
    SkillContractSummary,
    SkillContractUpdate,
)
from app.services import profile_service, skill_contract_service

router = APIRouter()


@router.get(
    "",
    response_model=list[SkillContractSummary],
    summary="List employer's skill contracts",
)
async def list_contracts(
    job_id: uuid.UUID | None = Query(None, description="Filter by job ID"),
    contract_status: ContractStatus | None = Query(
        None, alias="status", description="Filter by contract status"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> list[SkillContractSummary]:
    """Retrieve skill contracts for jobs owned by the authenticated employer."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.list_employer_contracts(
        db,
        employer_profile_id=employer_profile.id,
        job_id=job_id,
        status_filter=contract_status,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=SkillContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new draft Skill Contract",
)
async def create_contract(
    req: SkillContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> SkillContractResponse:
    """Create a new versioned DRAFT Skill Contract attached to an owned job requisition."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.create_contract(
        db, employer_profile_id=employer_profile.id, data=req
    )


@router.get(
    "/{contract_id}",
    response_model=SkillContractResponse,
    summary="Get single Skill Contract details",
)
async def get_contract(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SkillContractResponse:
    """Retrieve contract details with canonical skill requirements and quality metrics."""
    return await skill_contract_service.get_contract_by_id_secured(
        db, current_user=current_user, contract_id=contract_id
    )


@router.put(
    "/{contract_id}",
    response_model=SkillContractResponse,
    summary="Update a DRAFT Skill Contract",
)
async def update_contract(
    contract_id: uuid.UUID,
    req: SkillContractUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> SkillContractResponse:
    """Update title, description, or requirements of a DRAFT contract."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.update_contract(
        db,
        employer_profile_id=employer_profile.id,
        contract_id=contract_id,
        data=req,
    )


@router.post(
    "/{contract_id}/activate",
    response_model=SkillContractResponse,
    summary="Activate a DRAFT Skill Contract",
)
async def activate_contract(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> SkillContractResponse:
    """Activate draft contract, archiving previous active contract for the job."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.activate_contract(
        db, employer_profile_id=employer_profile.id, contract_id=contract_id
    )


@router.post(
    "/{contract_id}/archive",
    response_model=SkillContractResponse,
    summary="Archive an ACTIVE Skill Contract",
)
async def archive_contract(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> SkillContractResponse:
    """Archive an active Skill Contract."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.archive_contract(
        db, employer_profile_id=employer_profile.id, contract_id=contract_id
    )


@router.post(
    "/{contract_id}/new-version",
    response_model=SkillContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new DRAFT version cloned from a contract",
)
async def create_new_version(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> SkillContractResponse:
    """Clone an active or archived contract into a new DRAFT version for iterative editing."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await skill_contract_service.create_draft_from_contract(
        db, employer_profile_id=employer_profile.id, source_contract_id=contract_id
    )


@router.get(
    "/{contract_id}/quality",
    response_model=ContractQualityResponse,
    summary="Get deterministic contract quality assessment",
)
async def get_contract_quality(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractQualityResponse:
    """Calculate deterministic quality/completeness score and feedback."""
    contract = await skill_contract_service.get_contract_by_id_secured(
        db, current_user=current_user, contract_id=contract_id
    )
    # Re-fetch requirements models for scoring
    return skill_contract_service.calculate_contract_quality_score(
        contract.id,
        [
            # Construct a lightweight representation or use direct response data
            r
            for r in getattr(contract, "requirements", [])
        ],  # type: ignore[arg-type]
    )


@router.get(
    "/{contract_id}/insights",
    response_model=ContractInsightsResponse,
    summary="Get contract skill demand, forecast, and supply insights",
)
async def get_contract_insights(
    contract_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractInsightsResponse:
    """Retrieve market demand, supply shortage, and forecast context for contract skills."""
    return await skill_contract_service.get_contract_insights(
        db, current_user=current_user, contract_id=contract_id
    )

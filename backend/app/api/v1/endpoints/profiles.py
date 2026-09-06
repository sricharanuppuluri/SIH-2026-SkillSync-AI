"""User profile endpoints for role-specific profile management."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_authenticated_user
from app.models.user import User, UserRole
from app.schemas.profiles import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    EmployerProfileResponse,
    EmployerProfileUpdate,
    GovernmentProfileResponse,
    GovernmentProfileUpdate,
    TrainingProviderProfileResponse,
    TrainingProviderProfileUpdate,
)
from app.services import profile_service

router = APIRouter()


@router.get(
    "/me",
    summary="Get current user's role profile",
)
async def get_my_profile(
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve profile associated with the authenticated user's assigned role."""
    if current_user.role == UserRole.CANDIDATE:
        profile = await profile_service.get_or_create_candidate_profile(db, current_user.id)
        return {
            "role": current_user.role.value,
            "profile": CandidateProfileResponse.model_validate(profile).model_dump(),
        }
    elif current_user.role == UserRole.EMPLOYER:
        profile = await profile_service.get_or_create_employer_profile(db, current_user)
        return {
            "role": current_user.role.value,
            "profile": EmployerProfileResponse.model_validate(profile).model_dump(),
        }
    elif current_user.role == UserRole.TRAINING_PROVIDER:
        profile = await profile_service.get_or_create_training_provider_profile(db, current_user)
        return {
            "role": current_user.role.value,
            "profile": TrainingProviderProfileResponse.model_validate(profile).model_dump(),
        }
    elif current_user.role == UserRole.GOVERNMENT:
        profile = await profile_service.get_or_create_government_profile(db, current_user)
        return {
            "role": current_user.role.value,
            "profile": GovernmentProfileResponse.model_validate(profile).model_dump(),
        }
    elif current_user.role == UserRole.ADMIN:
        return {
            "role": current_user.role.value,
            "profile": None,
            "message": "Administrative accounts do not require a domain role profile",
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown user role",
        )


@router.put(
    "/me/candidate",
    response_model=CandidateProfileResponse,
    summary="Update candidate profile",
)
async def update_my_candidate_profile(
    req: CandidateProfileUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfileResponse:
    """Update profile data for candidate user."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user is not a CANDIDATE",
        )
    profile = await profile_service.get_or_create_candidate_profile(db, current_user.id)
    updated = await profile_service.update_candidate_profile(db, profile, req)
    return CandidateProfileResponse.model_validate(updated)


@router.put(
    "/me/employer",
    response_model=EmployerProfileResponse,
    summary="Update employer profile",
)
async def update_my_employer_profile(
    req: EmployerProfileUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> EmployerProfileResponse:
    """Update company profile data for employer user."""
    if current_user.role != UserRole.EMPLOYER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user is not an EMPLOYER",
        )
    profile = await profile_service.get_or_create_employer_profile(db, current_user)
    updated = await profile_service.update_employer_profile(db, profile, req)
    return EmployerProfileResponse.model_validate(updated)


@router.put(
    "/me/training-provider",
    response_model=TrainingProviderProfileResponse,
    summary="Update training provider profile",
)
async def update_my_training_provider_profile(
    req: TrainingProviderProfileUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> TrainingProviderProfileResponse:
    """Update institute profile data for training provider user."""
    if current_user.role != UserRole.TRAINING_PROVIDER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user is not a TRAINING_PROVIDER",
        )
    profile = await profile_service.get_or_create_training_provider_profile(db, current_user)
    updated = await profile_service.update_training_provider_profile(db, profile, req)
    return TrainingProviderProfileResponse.model_validate(updated)


@router.put(
    "/me/government",
    response_model=GovernmentProfileResponse,
    summary="Update government profile",
)
async def update_my_government_profile(
    req: GovernmentProfileUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> GovernmentProfileResponse:
    """Update department profile data for government user."""
    if current_user.role != UserRole.GOVERNMENT and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current user is not a GOVERNMENT user",
        )
    profile = await profile_service.get_or_create_government_profile(db, current_user)
    updated = await profile_service.update_government_profile(db, profile, req)
    return GovernmentProfileResponse.model_validate(updated)

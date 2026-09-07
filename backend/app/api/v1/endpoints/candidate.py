"""Candidate module API endpoints: profile, skills, education, experience, resume, dashboard."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.candidate import (
    CandidateDashboardResponse,
    CandidateEducationCreate,
    CandidateEducationResponse,
    CandidateEducationUpdate,
    CandidateExperienceCreate,
    CandidateExperienceResponse,
    CandidateExperienceUpdate,
    CandidateProfileRead,
    CandidateProfileUpdate,
    CandidateResumeResponse,
    CandidateResumeUploadRequest,
    CandidateSkillCreate,
    CandidateSkillResponse,
    CandidateSkillUpdate,
    ProfileCompletenessResponse,
)
from app.schemas.skill_gap import SkillGapReport
from app.services import candidate_service, skill_gap_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Skill Gap Analysis
# ---------------------------------------------------------------------------
@router.get(
    "/jobs/{job_id}/skill-gap",
    response_model=SkillGapReport,
    summary="Get deterministic skill gap analysis for a specific job",
)
async def get_job_skill_gap(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> SkillGapReport:
    """Evaluate candidate competencies against target job requirements deterministically."""
    return await skill_gap_service.calculate_job_skill_gap(db, current_user, job_id)


# ---------------------------------------------------------------------------
# Dashboard & Profile Completeness
# ---------------------------------------------------------------------------
@router.get(
    "/dashboard",
    response_model=CandidateDashboardResponse,
    summary="Get candidate dashboard metrics and summaries",
)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateDashboardResponse:
    """Retrieve aggregated profile completeness, skill counts, and highlights for candidate."""
    return await candidate_service.get_candidate_dashboard(db, current_user)


@router.get(
    "/profile/completeness",
    response_model=ProfileCompletenessResponse,
    summary="Get deterministic profile completeness calculation",
)
async def get_profile_completeness(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> ProfileCompletenessResponse:
    """Calculate deterministic percentage and missing sections based on stored data."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.calculate_profile_completeness(db, current_user, profile)


# ---------------------------------------------------------------------------
# Profile Management
# ---------------------------------------------------------------------------
@router.get(
    "/profile",
    response_model=CandidateProfileRead,
    summary="Get candidate's own profile",
)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateProfileRead:
    """Retrieve the candidate profile associated with the authenticated user."""
    return await candidate_service.get_candidate_profile_dto(db, current_user)


@router.put(
    "/profile",
    response_model=CandidateProfileRead,
    summary="Update candidate's own profile",
)
async def update_profile(
    data: CandidateProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateProfileRead:
    """Update profile and user identity attributes."""
    return await candidate_service.update_candidate_profile(db, current_user, data)


# ---------------------------------------------------------------------------
# Skills Management
# ---------------------------------------------------------------------------
@router.get(
    "/skills",
    response_model=list[CandidateSkillResponse],
    summary="List candidate's canonical skills",
)
async def list_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[CandidateSkillResponse]:
    """List all canonical skills attached to candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.list_candidate_skills(db, profile.id)


@router.post(
    "/skills",
    response_model=CandidateSkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach a canonical skill to candidate profile",
)
async def add_skill(
    data: CandidateSkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateSkillResponse:
    """Attach a skill from the canonical catalog to candidate competencies."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.add_candidate_skill(db, profile.id, data)


@router.put(
    "/skills/{skill_id}",
    response_model=CandidateSkillResponse,
    summary="Update candidate skill proficiency or experience",
)
async def update_skill(
    skill_id: uuid.UUID,
    data: CandidateSkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateSkillResponse:
    """Update proficiency or experience of an attached skill."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.update_candidate_skill(db, profile.id, skill_id, data)


@router.delete(
    "/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove skill from candidate competencies",
)
async def delete_skill(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> None:
    """Detach skill from candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    await candidate_service.delete_candidate_skill(db, profile.id, skill_id)


# ---------------------------------------------------------------------------
# Education Management
# ---------------------------------------------------------------------------
@router.get(
    "/education",
    response_model=list[CandidateEducationResponse],
    summary="List candidate education records",
)
async def list_education(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[CandidateEducationResponse]:
    """Retrieve all education history entries for authenticated candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.list_candidate_education(db, profile.id)


@router.post(
    "/education",
    response_model=CandidateEducationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add education record",
)
async def add_education(
    data: CandidateEducationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateEducationResponse:
    """Add a new education entry to candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.add_candidate_education(db, profile.id, data)


@router.put(
    "/education/{education_id}",
    response_model=CandidateEducationResponse,
    summary="Update education record",
)
async def update_education(
    education_id: uuid.UUID,
    data: CandidateEducationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateEducationResponse:
    """Update an existing education entry owned by current candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.update_candidate_education(db, profile.id, education_id, data)


@router.delete(
    "/education/{education_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete education record",
)
async def delete_education(
    education_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> None:
    """Delete an education entry owned by current candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    await candidate_service.delete_candidate_education(db, profile.id, education_id)


# ---------------------------------------------------------------------------
# Experience Management
# ---------------------------------------------------------------------------
@router.get(
    "/experience",
    response_model=list[CandidateExperienceResponse],
    summary="List candidate professional experience records",
)
async def list_experience(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[CandidateExperienceResponse]:
    """Retrieve all work experience entries for authenticated candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.list_candidate_experience(db, profile.id)


@router.post(
    "/experience",
    response_model=CandidateExperienceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add professional experience record",
)
async def add_experience(
    data: CandidateExperienceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateExperienceResponse:
    """Add a work experience entry to candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.add_candidate_experience(db, profile.id, data)


@router.put(
    "/experience/{experience_id}",
    response_model=CandidateExperienceResponse,
    summary="Update professional experience record",
)
async def update_experience(
    experience_id: uuid.UUID,
    data: CandidateExperienceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateExperienceResponse:
    """Update an existing work experience record owned by current candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.update_candidate_experience(db, profile.id, experience_id, data)


@router.delete(
    "/experience/{experience_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete professional experience record",
)
async def delete_experience(
    experience_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> None:
    """Delete a work experience record owned by current candidate."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    await candidate_service.delete_candidate_experience(db, profile.id, experience_id)


# ---------------------------------------------------------------------------
# Resume Management
# ---------------------------------------------------------------------------
@router.post(
    "/resume",
    response_model=CandidateResumeResponse,
    summary="Upload resume metadata and content",
)
async def upload_resume(
    data: CandidateResumeUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateResumeResponse:
    """Store resume file metadata and extracted/plain text on candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.upload_candidate_resume(db, profile.id, data)


@router.delete(
    "/resume",
    response_model=CandidateResumeResponse,
    summary="Remove attached resume",
)
async def delete_resume(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CandidateResumeResponse:
    """Clear resume metadata and text from candidate profile."""
    profile = await candidate_service.get_or_create_candidate_profile(db, current_user)
    return await candidate_service.delete_candidate_resume(db, profile.id)

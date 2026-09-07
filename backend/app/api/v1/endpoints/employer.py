"""Employer module API endpoints for dashboard, job requisitions, and applicant tracking."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.application import ApplicationStatus
from app.models.job import JobStatus
from app.models.user import User, UserRole
from app.schemas.employer import (
    EmployerApplicationResponse,
    EmployerApplicationStatusUpdate,
    EmployerDashboardResponse,
)
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.schemas.passport import CandidatePassportResponse
from app.services import employer_service, profile_service, verified_skill_service

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=EmployerDashboardResponse,
    summary="Get employer portal metrics and recent activity",
)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> EmployerDashboardResponse:
    """Retrieve real-time metrics calculated from employer postings and candidate applications."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.get_employer_dashboard(db, employer_profile.id)


@router.get(
    "/jobs",
    response_model=list[JobResponse],
    summary="List employer's own job requisitions",
)
async def list_employer_jobs(
    job_status: JobStatus | None = Query(None, alias="status", description="Filter by status"),
    search: str | None = Query(None, description="Search by job title"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> list[JobResponse]:
    """Retrieve job requisitions owned by the authenticated employer."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.get_employer_jobs(
        db,
        employer_profile_id=employer_profile.id,
        job_status=job_status,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/jobs",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employer job requisition",
)
async def create_employer_job(
    req: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Create a draft or published job posting with required skill specifications."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.create_employer_job(db, employer_profile.id, req)


@router.get(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get single employer job requisition",
)
async def get_employer_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Retrieve single job ensuring the caller owns the requisition."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.get_employer_job_by_id(db, employer_profile.id, job_id)


@router.put(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Update employer job requisition",
)
async def update_employer_job(
    job_id: uuid.UUID,
    req: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Update job posting details and associated skill competencies."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.update_employer_job(db, employer_profile.id, job_id, req)


@router.put(
    "/jobs/{job_id}/publish",
    response_model=JobResponse,
    summary="Publish draft job requisition",
)
async def publish_employer_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Transition job to PUBLISHED status, making it active for applications."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.publish_job(db, employer_profile.id, job_id)


@router.put(
    "/jobs/{job_id}/close",
    response_model=JobResponse,
    summary="Close active job requisition",
)
async def close_employer_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Transition job to CLOSED status, disallowing new applications."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.close_job(db, employer_profile.id, job_id)


@router.delete(
    "/jobs/{job_id}",
    summary="Delete employer job requisition",
)
async def delete_employer_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> dict:
    """Delete a job requisition belonging to the authenticated employer."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.delete_employer_job(db, employer_profile.id, job_id)


@router.get(
    "/applications",
    response_model=list[EmployerApplicationResponse],
    summary="List applications across employer jobs",
)
async def list_employer_applications(
    job_id: uuid.UUID | None = Query(None, description="Filter by specific job"),
    app_status: ApplicationStatus | None = Query(
        None, alias="status", description="Filter by status"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> list[EmployerApplicationResponse]:
    """Retrieve candidates who have applied to the employer's job postings."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.get_employer_applications(
        db,
        employer_profile_id=employer_profile.id,
        job_id=job_id,
        status_filter=app_status,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/jobs/{job_id}/applications",
    response_model=list[EmployerApplicationResponse],
    summary="List applications for a specific employer job",
)
async def list_specific_job_applications(
    job_id: uuid.UUID,
    app_status: ApplicationStatus | None = Query(
        None, alias="status", description="Filter by status"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> list[EmployerApplicationResponse]:
    """Retrieve candidates for a specific job owned by the authenticated employer."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    # Ensure job ownership
    await employer_service.get_employer_job_by_id(db, employer_profile.id, job_id)
    return await employer_service.get_employer_applications(
        db,
        employer_profile_id=employer_profile.id,
        job_id=job_id,
        status_filter=app_status,
        skip=skip,
        limit=limit,
    )


@router.put(
    "/applications/{application_id}/status",
    response_model=EmployerApplicationResponse,
    summary="Update candidate application progression status",
)
async def update_application_status(
    application_id: uuid.UUID,
    req: EmployerApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> EmployerApplicationResponse:
    """Update applicant status (e.g. APPLIED -> SHORTLISTED -> INTERVIEW -> HIRED/REJECTED)."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await employer_service.update_application_status(
        db,
        employer_profile_id=employer_profile.id,
        application_id=application_id,
        new_status=req.status,
    )


@router.get(
    "/candidates/{candidate_id}/passport",
    response_model=CandidatePassportResponse,
    summary="View applicant Verified Skill Passport",
)
async def get_applicant_passport(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> CandidatePassportResponse:
    """View applicant's Verified Skill Passport strictly guarded by job application relationship."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    return await verified_skill_service.get_employer_candidate_passport(
        db, employer_profile.id, candidate_id
    )

"""Job requisition endpoints for viewing and employer postings."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.job import JobCreate, JobResponse
from app.services import job_service, profile_service

router = APIRouter()


@router.get(
    "",
    response_model=list[JobResponse],
    summary="List job requisitions",
)
async def list_jobs(
    employer_id: uuid.UUID | None = Query(None, description="Filter by employer profile ID"),
    is_active: bool | None = Query(None, description="Filter active/inactive postings"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[JobResponse]:
    """Retrieve list of job postings with required skill specifications."""
    jobs = await job_service.get_jobs(
        db, employer_id=employer_id, is_active=is_active, skip=skip, limit=limit
    )
    return [JobResponse.model_validate(j) for j in jobs]


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job by ID",
)
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    """Retrieve single job posting with skill requirements by UUID."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )
    return JobResponse.model_validate(job)


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting",
)
async def create_job(
    req: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobResponse:
    """Post a new job requisition. Requires Employer or Admin role."""
    employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
    job = await job_service.create_job(db, employer_profile.id, req)
    return JobResponse.model_validate(job)

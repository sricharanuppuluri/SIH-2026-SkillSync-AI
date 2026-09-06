"""Employer domain business service for jobs, dashboard, and applicant management."""

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application, ApplicationStatus
from app.models.job import Job, JobSkill, JobStatus
from app.models.profiles import CandidateProfile
from app.models.user import User
from app.schemas.employer import (
    EmployerApplicationCandidateInfo,
    EmployerApplicationResponse,
    EmployerDashboardMetrics,
    EmployerDashboardResponse,
    EmployerRecentApplicationItem,
    EmployerRecentJobItem,
)
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services import job_service


async def get_employer_dashboard(
    db: AsyncSession, employer_profile_id: uuid.UUID
) -> EmployerDashboardResponse:
    """Calculate live aggregated metrics and retrieve recent activity directly from database."""
    # 1. Total and status counts for employer jobs
    jobs_query = select(Job).where(Job.employer_id == employer_profile_id)
    jobs_res = await db.execute(jobs_query)
    all_employer_jobs = jobs_res.scalars().all()

    total_jobs = len(all_employer_jobs)
    published_jobs = sum(1 for j in all_employer_jobs if j.status == JobStatus.PUBLISHED)
    draft_jobs = sum(1 for j in all_employer_jobs if j.status == JobStatus.DRAFT)
    closed_jobs = sum(1 for j in all_employer_jobs if j.status == JobStatus.CLOSED)

    employer_job_ids = [j.id for j in all_employer_jobs]

    # 2. Total applications across employer jobs and status distribution
    total_applications = 0
    apps_by_status: dict[str, int] = {s.value: 0 for s in ApplicationStatus}

    if employer_job_ids:
        # Status breakdown
        stat_stmt = (
            select(Application.status, func.count(Application.id))
            .where(Application.job_id.in_(employer_job_ids))
            .group_by(Application.status)
        )
        stat_res = await db.execute(stat_stmt)
        for row in stat_res.all():
            status_val = row[0].value if hasattr(row[0], "value") else str(row[0])
            apps_by_status[status_val] = row[1]
            total_applications += row[1]

    metrics = EmployerDashboardMetrics(
        total_jobs=total_jobs,
        published_jobs=published_jobs,
        draft_jobs=draft_jobs,
        closed_jobs=closed_jobs,
        total_applications=total_applications,
        applications_by_status=apps_by_status,
    )

    # 3. Recent 5 jobs with applications count
    recent_jobs: list[EmployerRecentJobItem] = []
    recent_jobs_query = (
        select(Job)
        .options(selectinload(Job.skills))
        .where(Job.employer_id == employer_profile_id)
        .order_by(Job.created_at.desc())
        .limit(5)
    )
    rj_res = await db.execute(recent_jobs_query)
    for j in rj_res.scalars().all():
        app_cnt_query = select(func.count(Application.id)).where(Application.job_id == j.id)
        app_cnt = (await db.execute(app_cnt_query)).scalar() or 0
        recent_jobs.append(
            EmployerRecentJobItem(
                id=j.id,
                title=j.title,
                status=j.status,
                location_city=j.location_city,
                applications_count=app_cnt,
                skills_count=len(j.skills),
                created_at=j.created_at,
            )
        )

    # 4. Recent 5 applications with candidate & job info
    recent_applications: list[EmployerRecentApplicationItem] = []
    if employer_job_ids:
        recent_apps_query = (
            select(Application, Job.title, User.full_name, CandidateProfile.headline)
            .join(Job, Application.job_id == Job.id)
            .join(CandidateProfile, Application.candidate_id == CandidateProfile.id)
            .join(User, CandidateProfile.user_id == User.id)
            .where(Job.employer_id == employer_profile_id)
            .order_by(Application.applied_at.desc())
            .limit(5)
        )
        ra_res = await db.execute(recent_apps_query)
        for app, job_title, cand_name, cand_headline in ra_res.all():
            recent_applications.append(
                EmployerRecentApplicationItem(
                    id=app.id,
                    candidate_id=app.candidate_id,
                    candidate_name=cand_name,
                    candidate_headline=cand_headline,
                    job_id=app.job_id,
                    job_title=job_title,
                    status=app.status,
                    applied_at=app.applied_at,
                )
            )

    return EmployerDashboardResponse(
        metrics=metrics,
        recent_jobs=recent_jobs,
        recent_applications=recent_applications,
    )


async def get_employer_jobs(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    job_status: JobStatus | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[JobResponse]:
    """Retrieve jobs strictly owned by the authenticated employer profile."""
    query = (
        select(Job)
        .options(selectinload(Job.skills).selectinload(JobSkill.skill))
        .where(Job.employer_id == employer_profile_id)
        .order_by(Job.created_at.desc())
    )
    if job_status is not None:
        query = query.where(Job.status == job_status)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(func.lower(Job.title).like(pattern))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()

    response_list: list[JobResponse] = []
    for j in jobs:
        cnt_stmt = select(func.count(Application.id)).where(Application.job_id == j.id)
        apps_count = (await db.execute(cnt_stmt)).scalar() or 0
        response_list.append(job_service.serialize_job_response(j, applications_count=apps_count))

    return response_list


async def get_employer_job_by_id(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> JobResponse:
    """Retrieve single job ensuring employer ownership."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )
    cnt_stmt = select(func.count(Application.id)).where(Application.job_id == job.id)
    apps_count = (await db.execute(cnt_stmt)).scalar() or 0
    return job_service.serialize_job_response(job, applications_count=apps_count)


async def create_employer_job(
    db: AsyncSession, employer_profile_id: uuid.UUID, schema: JobCreate
) -> JobResponse:
    """Create a new job for the authenticated employer."""
    job = await job_service.create_job(db, employer_profile_id, schema)
    return job_service.serialize_job_response(job, applications_count=0)


async def update_employer_job(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID, schema: JobUpdate
) -> JobResponse:
    """Update job posting ensuring ownership."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )

    updated_job = await job_service.update_job(db, job, schema)
    cnt_stmt = select(func.count(Application.id)).where(Application.job_id == job.id)
    apps_count = (await db.execute(cnt_stmt)).scalar() or 0
    return job_service.serialize_job_response(updated_job, applications_count=apps_count)


async def publish_job(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> JobResponse:
    """Transition job to PUBLISHED status and active state."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )

    job.status = JobStatus.PUBLISHED
    job.is_active = True
    await db.commit()
    await db.refresh(job)

    cnt_stmt = select(func.count(Application.id)).where(Application.job_id == job.id)
    apps_count = (await db.execute(cnt_stmt)).scalar() or 0
    return job_service.serialize_job_response(job, applications_count=apps_count)


async def close_job(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> JobResponse:
    """Transition job to CLOSED status and deactivate from listings."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )

    job.status = JobStatus.CLOSED
    job.is_active = False
    await db.commit()
    await db.refresh(job)

    cnt_stmt = select(func.count(Application.id)).where(Application.job_id == job.id)
    apps_count = (await db.execute(cnt_stmt)).scalar() or 0
    return job_service.serialize_job_response(job, applications_count=apps_count)


async def delete_employer_job(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> dict[str, Any]:
    """Delete job requisition ensuring ownership."""
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )

    await db.delete(job)
    await db.commit()
    return {"message": f"Job {job_id} successfully deleted", "id": str(job_id)}


async def get_employer_applications(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    job_id: uuid.UUID | None = None,
    status_filter: ApplicationStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[EmployerApplicationResponse]:
    """Retrieve applications strictly belonging to jobs owned by the employer."""
    query = (
        select(Application, Job.title, CandidateProfile, User)
        .join(Job, Application.job_id == Job.id)
        .join(CandidateProfile, Application.candidate_id == CandidateProfile.id)
        .join(User, CandidateProfile.user_id == User.id)
        .where(Job.employer_id == employer_profile_id)
        .order_by(Application.applied_at.desc())
    )
    if job_id:
        query = query.where(Application.job_id == job_id)
    if status_filter:
        query = query.where(Application.status == status_filter)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)

    response_list: list[EmployerApplicationResponse] = []
    for app, job_title, cand_prof, user in result.all():
        candidate_info = EmployerApplicationCandidateInfo(
            id=cand_prof.id,
            full_name=user.full_name,
            email=user.email,
            headline=cand_prof.headline,
            bio=cand_prof.bio,
            experience_years=cand_prof.experience_years,
            education_level=cand_prof.education_level,
            location_city=cand_prof.location_city,
            location_state=cand_prof.location_state,
        )
        response_list.append(
            EmployerApplicationResponse(
                id=app.id,
                candidate_id=app.candidate_id,
                job_id=app.job_id,
                job_title=job_title,
                status=app.status,
                cover_note=app.cover_note,
                applied_at=app.applied_at,
                candidate=candidate_info,
            )
        )

    return response_list


async def update_application_status(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    application_id: uuid.UUID,
    new_status: ApplicationStatus,
) -> EmployerApplicationResponse:
    """Update application progression state ensuring the application's job belongs to employer."""
    query = (
        select(Application, Job.title, CandidateProfile, User)
        .join(Job, Application.job_id == Job.id)
        .join(CandidateProfile, Application.candidate_id == CandidateProfile.id)
        .join(User, CandidateProfile.user_id == User.id)
        .where(Application.id == application_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found",
        )

    app, job_title, cand_prof, user = row
    # Ownership isolation check
    job = await db.get(Job, app.job_id)
    if not job or job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found",
        )

    app.status = new_status
    await db.commit()
    await db.refresh(app)

    candidate_info = EmployerApplicationCandidateInfo(
        id=cand_prof.id,
        full_name=user.full_name,
        email=user.email,
        headline=cand_prof.headline,
        bio=cand_prof.bio,
        experience_years=cand_prof.experience_years,
        education_level=cand_prof.education_level,
        location_city=cand_prof.location_city,
        location_state=cand_prof.location_state,
    )
    return EmployerApplicationResponse(
        id=app.id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        job_title=job_title,
        status=app.status,
        cover_note=app.cover_note,
        applied_at=app.applied_at,
        candidate=candidate_info,
    )

"""Employer Skill Contract domain service.

Manages creation, versioning, quality assessment, lifecycle transitions,
and ecosystem intelligence integration for job competency contracts.
"""

import logging
import uuid
from collections import Counter
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_skill import ProficiencyLevel
from app.models.job import Job
from app.models.skill import Skill, SkillStatus
from app.models.skill_contract import (
    ContractEvidenceType,
    ContractRequirementImportance,
    ContractRequirementType,
    ContractStatus,
    SkillContract,
    SkillContractRequirement,
)
from app.models.user import User, UserRole
from app.schemas.skill_contract import (
    ContractInsightsResponse,
    ContractQualityResponse,
    ContractSkillInsight,
    SkillContractCreate,
    SkillContractRequirementCreate,
    SkillContractRequirementResponse,
    SkillContractResponse,
    SkillContractSummary,
    SkillContractUpdate,
)
from app.services import (
    demand_forecast_service,
    profile_service,
    skill_demand_service,
)

logger = logging.getLogger(__name__)


async def verify_employer_job_ownership(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> Job:
    """Ensure the given job exists and is owned by the specified employer."""
    stmt = select(Job).options(selectinload(Job.employer)).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    if job.employer_id != employer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage contracts for this job requisition",
        )

    return job


async def _validate_canonical_skills(
    db: AsyncSession, requirements: list[SkillContractRequirementCreate]
) -> dict[uuid.UUID, Skill]:
    """Validate that all skill IDs are distinct, exist, and are canonical active skills."""
    if not requirements:
        return {}

    skill_ids = [r.skill_id for r in requirements]
    if len(skill_ids) != len(set(skill_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate skills are not permitted in a Skill Contract",
        )

    stmt = select(Skill).where(Skill.id.in_(skill_ids))
    result = await db.execute(stmt)
    skills = result.scalars().all()
    skill_map = {s.id: s for s in skills}

    missing_ids = [str(sid) for sid in skill_ids if sid not in skill_map]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "One or more skill IDs do not exist in the canonical taxonomy: "
                f"{', '.join(missing_ids)}"
            ),
        )

    inactive_skills = [s.name for s in skills if s.status != SkillStatus.ACTIVE]
    if inactive_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"One or more skills are not active canonical skills: {', '.join(inactive_skills)}"
            ),
        )

    return skill_map


def calculate_contract_quality_score(
    contract_id: uuid.UUID,
    requirements: list[SkillContractRequirement],
) -> ContractQualityResponse:
    """Deterministically compute quality completeness score and feedback for a contract."""
    breakdown: dict[str, int] = {}
    explanations: list[str] = []

    total_reqs = len(requirements)
    if total_reqs == 0:
        return ContractQualityResponse(
            contract_id=contract_id,
            score=0,
            rating="NEEDS_IMPROVEMENT",
            breakdown={"skill_presence": 0, "distribution": 0, "evidence": 0, "experience": 0},
            explanations=[
                "Contract has no skill requirements. Add canonical skills to build a contract."
            ],
        )

    # 1. Skill Presence & Volume (Max 25 pts)
    if total_reqs >= 4:
        presence_score = 25
        explanations.append("Robust competency scope with 4 or more defined skills.")
    elif total_reqs >= 2:
        presence_score = 18
        explanations.append("Adequate competency scope with at least 2 defined skills.")
    else:
        presence_score = 10
        explanations.append(
            "Minimal competency scope (only 1 skill). Consider adding complementary skills."
        )
    breakdown["skill_presence"] = presence_score

    # 2. Requirement Type Balance (Max 20 pts)
    required_count = sum(
        1 for r in requirements if r.requirement_type == ContractRequirementType.REQUIRED
    )
    preferred_count = sum(
        1 for r in requirements if r.requirement_type == ContractRequirementType.PREFERRED
    )

    if required_count > 0 and preferred_count > 0:
        dist_score = 20
        explanations.append(
            f"Balanced: {required_count} REQUIRED and {preferred_count} PREFERRED skills."
        )
    elif required_count > 0:
        dist_score = 15
        explanations.append(
            f"Baseline with {required_count} REQUIRED skills. Consider adding PREFERRED skills."
        )
    else:
        dist_score = 5
        explanations.append(
            "Contract contains only PREFERRED skills with no mandatory requirements."
        )
    breakdown["requirement_balance"] = dist_score

    # 3. Importance & Priority Clarity (Max 20 pts)
    critical_count = sum(
        1 for r in requirements if r.importance == ContractRequirementImportance.CRITICAL
    )
    high_count = sum(1 for r in requirements if r.importance == ContractRequirementImportance.HIGH)

    if critical_count > 0 and (high_count > 0 or total_reqs >= 3):
        importance_score = 20
        explanations.append(
            f"High-priority competencies specified ({critical_count} CRITICAL, {high_count} HIGH)."
        )
    elif critical_count > 0 or high_count > 0:
        importance_score = 15
        explanations.append(
            f"Priority competencies specified ({critical_count + high_count} priority skills)."
        )
    else:
        importance_score = 8
        explanations.append(
            "All skills marked MEDIUM/LOW. Consider marking core capabilities as HIGH or CRITICAL."
        )
    breakdown["priority_clarity"] = importance_score

    # 4. Evidence Verification Standards (Max 20 pts)
    verified_reqs = sum(1 for r in requirements if r.evidence_type != ContractEvidenceType.NONE)
    critical_with_evidence = sum(
        1
        for r in requirements
        if r.importance
        in (ContractRequirementImportance.CRITICAL, ContractRequirementImportance.HIGH)
        and r.evidence_type != ContractEvidenceType.NONE
    )

    if critical_with_evidence > 0 and verified_reqs >= 2:
        evidence_score = 20
        explanations.append(
            f"Strong verification criteria: {verified_reqs} skills require verifiable evidence."
        )
    elif verified_reqs > 0:
        evidence_score = 15
        explanations.append(
            f"Partial verification criteria: {verified_reqs} skills require verifiable evidence."
        )
    else:
        evidence_score = 5
        explanations.append(
            "No verification required. Specifying VERIFIED_SKILL improves candidate vetting."
        )
    breakdown["evidence_standards"] = evidence_score

    # 5. Experience Specifications (Max 15 pts)
    exp_specified = sum(1 for r in requirements if r.minimum_experience_months > 0)
    if exp_specified >= 2:
        exp_score = 15
        explanations.append(f"Practical experience expectations defined on {exp_specified} skills.")
    elif exp_specified == 1:
        exp_score = 10
        explanations.append(f"Experience expectation defined on {exp_specified} skill.")
    else:
        exp_score = 5
        explanations.append("No minimum experience months specified on skills.")
    breakdown["experience_clarity"] = exp_score

    total_score = min(
        100, presence_score + dist_score + importance_score + evidence_score + exp_score
    )

    if total_score >= 85:
        rating = "EXCELLENT"
    elif total_score >= 70:
        rating = "GOOD"
    elif total_score >= 50:
        rating = "MODERATE"
    else:
        rating = "NEEDS_IMPROVEMENT"

    return ContractQualityResponse(
        contract_id=contract_id,
        score=total_score,
        rating=rating,
        breakdown=breakdown,
        explanations=explanations,
    )


def _format_contract_response(contract: SkillContract) -> SkillContractResponse:
    """Format SQLAlchemy SkillContract into SkillContractResponse."""
    req_responses: list[SkillContractRequirementResponse] = []
    for r in contract.requirements:
        skill = r.skill
        req_responses.append(
            SkillContractRequirementResponse(
                id=r.id,
                contract_id=r.contract_id,
                skill_id=r.skill_id,
                skill_name=skill.name if skill else "Unknown Skill",
                skill_slug=skill.slug if skill else "unknown",
                skill_category=skill.category if skill else None,
                skill_type=skill.skill_type if skill else "TECHNICAL",
                required_proficiency=r.required_proficiency,
                requirement_type=r.requirement_type,
                importance=r.importance,
                minimum_experience_months=r.minimum_experience_months,
                evidence_type=r.evidence_type,
                notes=r.notes,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )

    quality = calculate_contract_quality_score(contract.id, contract.requirements)

    job_title = contract.job.title if contract.job else "Job Requisition"
    employer_id = contract.job.employer_id if contract.job else uuid.UUID(int=0)
    employer_name = (
        contract.job.employer.company_name if contract.job and contract.job.employer else None
    )

    return SkillContractResponse(
        id=contract.id,
        job_id=contract.job_id,
        job_title=job_title,
        employer_id=employer_id,
        employer_name=employer_name,
        version=contract.version,
        status=contract.status,
        title=contract.title,
        description=contract.description,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
        effective_at=contract.effective_at,
        archived_at=contract.archived_at,
        requirements=req_responses,
        requirements_count=len(req_responses),
        quality_score=quality.score,
    )


async def create_contract(
    db: AsyncSession, employer_profile_id: uuid.UUID, data: SkillContractCreate
) -> SkillContractResponse:
    """Create a new DRAFT Skill Contract for an employer's job requisition."""
    job = await verify_employer_job_ownership(db, employer_profile_id, data.job_id)

    # Validate skills
    await _validate_canonical_skills(db, data.requirements)

    # Calculate next version for this job
    v_stmt = select(func.coalesce(func.max(SkillContract.version), 0)).where(
        SkillContract.job_id == data.job_id
    )
    current_max_v = (await db.execute(v_stmt)).scalar() or 0
    next_version = current_max_v + 1

    contract = SkillContract(
        job_id=data.job_id,
        version=next_version,
        status=ContractStatus.DRAFT,
        title=data.title or f"{job.title} Competency Contract (v{next_version})",
        description=data.description,
    )
    db.add(contract)
    await db.flush()

    for req_in in data.requirements:
        req = SkillContractRequirement(
            contract_id=contract.id,
            skill_id=req_in.skill_id,
            required_proficiency=req_in.required_proficiency,
            requirement_type=req_in.requirement_type,
            importance=req_in.importance,
            minimum_experience_months=req_in.minimum_experience_months,
            evidence_type=req_in.evidence_type,
            notes=req_in.notes,
        )
        db.add(req)

    await db.commit()

    # Re-fetch fully loaded
    return await get_contract_by_id_direct(db, contract.id)


async def update_contract(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    contract_id: uuid.UUID,
    data: SkillContractUpdate,
) -> SkillContractResponse:
    """Update title, description, or requirements of a DRAFT contract."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )

    await verify_employer_job_ownership(db, employer_profile_id, contract.job_id)

    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot edit a contract in '{contract.status.value}' status. "
                "Only DRAFT contracts can be modified."
            ),
        )

    if data.title is not None:
        contract.title = data.title
    if data.description is not None:
        contract.description = data.description

    if data.requirements is not None:
        await _validate_canonical_skills(db, data.requirements)

        # Remove existing requirements from contract collection
        contract.requirements.clear()
        await db.flush()

        # Add new requirements
        for req_in in data.requirements:
            req = SkillContractRequirement(
                contract_id=contract.id,
                skill_id=req_in.skill_id,
                required_proficiency=req_in.required_proficiency,
                requirement_type=req_in.requirement_type,
                importance=req_in.importance,
                minimum_experience_months=req_in.minimum_experience_months,
                evidence_type=req_in.evidence_type,
                notes=req_in.notes,
            )
            contract.requirements.append(req)

    target_id = contract.id
    await db.commit()
    return await get_contract_by_id_direct(db, target_id)


async def activate_contract(
    db: AsyncSession, employer_profile_id: uuid.UUID, contract_id: uuid.UUID
) -> SkillContractResponse:
    """Transactionally activate a DRAFT contract, archiving any previously active contract."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )

    await verify_employer_job_ownership(db, employer_profile_id, contract.job_id)

    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only DRAFT contracts can be activated. Current status: '{contract.status.value}'"
            ),
        )

    if len(contract.requirements) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate a Skill Contract with no skill requirements.",
        )

    now = datetime.now(UTC)

    # 1. Archive any previously active contract for this job
    from sqlalchemy import update

    archive_stmt = (
        update(SkillContract)
        .where(
            SkillContract.job_id == contract.job_id,
            SkillContract.status == ContractStatus.ACTIVE,
            SkillContract.id != contract.id,
        )
        .values(status=ContractStatus.ARCHIVED, archived_at=now)
    )
    await db.execute(archive_stmt)
    await db.flush()

    # 2. Activate this contract
    contract.status = ContractStatus.ACTIVE
    contract.effective_at = now

    target_id = contract.id
    await db.commit()
    return await get_contract_by_id_direct(db, target_id)


async def archive_contract(
    db: AsyncSession, employer_profile_id: uuid.UUID, contract_id: uuid.UUID
) -> SkillContractResponse:
    """Archive an active Skill Contract."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )

    await verify_employer_job_ownership(db, employer_profile_id, contract.job_id)

    if contract.status != ContractStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only ACTIVE contracts can be archived. Current status: '{contract.status.value}'"
            ),
        )

    contract.status = ContractStatus.ARCHIVED
    contract.archived_at = datetime.now(UTC)

    await db.commit()
    return await get_contract_by_id_direct(db, contract.id)


async def create_draft_from_contract(
    db: AsyncSession, employer_profile_id: uuid.UUID, source_contract_id: uuid.UUID
) -> SkillContractResponse:
    """Clone an active or archived contract into a new DRAFT version for iteration."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == source_contract_id)
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source contract with ID '{source_contract_id}' not found",
        )

    job = await verify_employer_job_ownership(db, employer_profile_id, source.job_id)

    v_stmt = select(func.coalesce(func.max(SkillContract.version), 0)).where(
        SkillContract.job_id == source.job_id
    )
    current_max_v = (await db.execute(v_stmt)).scalar() or 0
    next_version = current_max_v + 1

    new_contract = SkillContract(
        job_id=source.job_id,
        version=next_version,
        status=ContractStatus.DRAFT,
        title=f"{job.title} Competency Contract (v{next_version})",
        description=source.description,
    )
    db.add(new_contract)
    await db.flush()

    for r in source.requirements:
        new_req = SkillContractRequirement(
            contract_id=new_contract.id,
            skill_id=r.skill_id,
            required_proficiency=r.required_proficiency,
            requirement_type=r.requirement_type,
            importance=r.importance,
            minimum_experience_months=r.minimum_experience_months,
            evidence_type=r.evidence_type,
            notes=r.notes,
        )
        db.add(new_req)

    await db.commit()
    return await get_contract_by_id_direct(db, new_contract.id)


async def get_contract_by_id_direct(
    db: AsyncSession, contract_id: uuid.UUID
) -> SkillContractResponse:
    """Helper to fetch a fully loaded SkillContract and return its response schema."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )
    return _format_contract_response(contract)


async def get_contract_by_id_secured(
    db: AsyncSession, current_user: User, contract_id: uuid.UUID
) -> SkillContractResponse:
    """Retrieve contract details enforcing caller authentication and role constraints."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )

    if current_user.role == UserRole.EMPLOYER:
        employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
        if contract.job.employer_id != employer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view contracts for this job",
            )
    elif current_user.role in (UserRole.CANDIDATE, UserRole.TRAINING_PROVIDER, UserRole.GOVERNMENT):
        # Only allow viewing active contracts on published jobs for external roles
        if contract.status != ContractStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only active contracts can be viewed by external stakeholders",
            )

    return _format_contract_response(contract)


async def list_employer_contracts(
    db: AsyncSession,
    employer_profile_id: uuid.UUID,
    job_id: uuid.UUID | None = None,
    status_filter: ContractStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[SkillContractSummary]:
    """List contracts belonging to jobs owned by the authenticated employer."""
    query = (
        select(SkillContract)
        .join(Job, SkillContract.job_id == Job.id)
        .options(
            selectinload(SkillContract.job),
            selectinload(SkillContract.requirements),
        )
        .where(Job.employer_id == employer_profile_id)
    )

    if job_id:
        query = query.where(SkillContract.job_id == job_id)
    if status_filter:
        query = query.where(SkillContract.status == status_filter)

    query = query.order_by(SkillContract.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    contracts = result.scalars().all()

    summaries: list[SkillContractSummary] = []
    for c in contracts:
        req_count = len(c.requirements)
        req_reqs = sum(
            1 for r in c.requirements if r.requirement_type == ContractRequirementType.REQUIRED
        )
        pref_reqs = sum(
            1 for r in c.requirements if r.requirement_type == ContractRequirementType.PREFERRED
        )
        quality = calculate_contract_quality_score(c.id, c.requirements)

        summaries.append(
            SkillContractSummary(
                id=c.id,
                job_id=c.job_id,
                job_title=c.job.title if c.job else "Job Requisition",
                version=c.version,
                status=c.status,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                effective_at=c.effective_at,
                archived_at=c.archived_at,
                requirements_count=req_count,
                required_count=req_reqs,
                preferred_count=pref_reqs,
                quality_score=quality.score,
            )
        )

    return summaries


async def get_job_active_contract(
    db: AsyncSession, job_id: uuid.UUID
) -> SkillContractResponse | None:
    """Retrieve the currently ACTIVE contract for a job if one exists."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(
            SkillContract.job_id == job_id,
            SkillContract.status == ContractStatus.ACTIVE,
        )
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract:
        return None
    return _format_contract_response(contract)


async def get_job_contract_history(
    db: AsyncSession, employer_profile_id: uuid.UUID, job_id: uuid.UUID
) -> list[SkillContractResponse]:
    """Retrieve all historical versions of contracts for a specific owned job."""
    await verify_employer_job_ownership(db, employer_profile_id, job_id)

    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.job_id == job_id)
        .order_by(SkillContract.version.desc())
    )
    result = await db.execute(stmt)
    contracts = result.scalars().all()

    return [_format_contract_response(c) for c in contracts]


async def get_contract_insights(
    db: AsyncSession, current_user: User, contract_id: uuid.UUID
) -> ContractInsightsResponse:
    """Aggregate deterministic demand twin and forecast intelligence for contract skills."""
    stmt = (
        select(SkillContract)
        .options(
            selectinload(SkillContract.job).selectinload(Job.employer),
            selectinload(SkillContract.requirements).selectinload(SkillContractRequirement.skill),
        )
        .where(SkillContract.id == contract_id)
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill contract with ID '{contract_id}' not found",
        )

    # Ownership check for employers
    if current_user.role == UserRole.EMPLOYER:
        employer_profile = await profile_service.get_or_create_employer_profile(db, current_user)
        if contract.job.employer_id != employer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view insights for this contract",
            )

    reqs = contract.requirements
    total_skills = len(reqs)
    required_count = sum(1 for r in reqs if r.requirement_type == ContractRequirementType.REQUIRED)
    preferred_count = sum(
        1 for r in reqs if r.requirement_type == ContractRequirementType.PREFERRED
    )
    critical_count = sum(1 for r in reqs if r.importance == ContractRequirementImportance.CRITICAL)
    high_count = sum(1 for r in reqs if r.importance == ContractRequirementImportance.HIGH)
    verified_count = sum(1 for r in reqs if r.evidence_type != ContractEvidenceType.NONE)

    categories: Counter[str] = Counter()
    skill_types: Counter[str] = Counter()
    proficiencies: list[int] = []

    prof_map = {
        ProficiencyLevel.BEGINNER: 1,
        ProficiencyLevel.INTERMEDIATE: 2,
        ProficiencyLevel.ADVANCED: 3,
        ProficiencyLevel.EXPERT: 4,
    }
    inv_prof_map = {1: "BEGINNER", 2: "INTERMEDIATE", 3: "ADVANCED", 4: "EXPERT"}

    skill_insights: list[ContractSkillInsight] = []

    for r in reqs:
        skill = r.skill
        cat_name = skill.category if skill and skill.category else "General"
        type_name = str(skill.skill_type) if skill else "TECHNICAL"
        categories[cat_name] += 1
        skill_types[type_name] += 1
        proficiencies.append(prof_map.get(r.required_proficiency, 2))

        # Query Phase 13 Digital Twin data safely
        curr_demand = 0
        ver_supply = 0
        shortage_cat = "BALANCED"
        train_supply = 0
        try:
            demand_detail = await skill_demand_service.get_skill_demand_detail(db, r.skill_id)
            curr_demand = demand_detail.current_demand
            ver_supply = demand_detail.verified_supply
            shortage_cat = str(demand_detail.shortage_status)
            train_supply = demand_detail.training_supply
        except Exception:
            pass

        # Query Phase 14 Forecast data safely
        forecast_3m = None
        forecast_shortage_3m = None
        try:
            fc_data = await demand_forecast_service.get_skill_forecast(
                db, r.skill_id, horizon_months=3
            )
            forecast_3m = fc_data.projected_demand
            forecast_shortage_3m = str(fc_data.forecasted_shortage)
        except Exception:
            pass

        skill_insights.append(
            ContractSkillInsight(
                skill_id=r.skill_id,
                skill_name=skill.name if skill else "Unknown Skill",
                category=cat_name,
                skill_type=cast(Any, type_name),
                requirement_type=r.requirement_type,
                required_proficiency=r.required_proficiency,
                importance=r.importance,
                evidence_type=r.evidence_type,
                minimum_experience_months=r.minimum_experience_months,
                current_demand=curr_demand,
                verified_supply=ver_supply,
                shortage_category=shortage_cat,
                training_supply=train_supply,
                forecast_demand_3m=forecast_3m,
                forecast_shortage_3m=forecast_shortage_3m,
            )
        )

    avg_prof_val = round(sum(proficiencies) / len(proficiencies)) if proficiencies else 2
    avg_prof_str = inv_prof_map.get(avg_prof_val, "INTERMEDIATE")

    job_title = contract.job.title if contract.job else "Job Requisition"

    return ContractInsightsResponse(
        contract_id=contract.id,
        job_id=contract.job_id,
        job_title=job_title,
        version=contract.version,
        status=contract.status,
        total_skills=total_skills,
        required_skills_count=required_count,
        preferred_skills_count=preferred_count,
        critical_skills_count=critical_count,
        high_priority_count=high_count,
        verified_evidence_count=verified_count,
        average_proficiency=avg_prof_str,
        category_distribution=dict(categories),
        skill_type_distribution=dict(skill_types),
        skill_insights=skill_insights,
    )

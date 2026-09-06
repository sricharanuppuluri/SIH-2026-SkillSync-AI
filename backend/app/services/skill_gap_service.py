"""Skill Gap Service: Deterministic rule-based gap analysis."""

import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.job import Job, JobSkill
from app.models.profiles import CandidateProfile
from app.models.skill import Skill
from app.models.user import User
from app.schemas.skill_gap import (
    GapSeverity,
    SkillGapItem,
    SkillGapReport,
    SkillGapStatus,
    SkillGapSummary,
)
from app.services import candidate_service

# Deterministic proficiency ordinal rankings
PROFICIENCY_RANK: dict[str, int] = {
    ProficiencyLevel.BEGINNER.value: 1,
    ProficiencyLevel.INTERMEDIATE.value: 2,
    ProficiencyLevel.ADVANCED.value: 3,
    ProficiencyLevel.EXPERT.value: 4,
}


def get_proficiency_rank(proficiency_value: str | ProficiencyLevel | None) -> int:
    """Resolve ordinal ranking for proficiency level strings or enums."""
    if not proficiency_value:
        return 2  # Default to INTERMEDIATE
    val = (
        proficiency_value.value
        if isinstance(proficiency_value, ProficiencyLevel)
        else str(proficiency_value)
    ).upper()
    return PROFICIENCY_RANK.get(val, 2)


def to_proficiency_enum(val: str | ProficiencyLevel | None) -> ProficiencyLevel:
    """Safely cast string to ProficiencyLevel Enum."""
    if isinstance(val, ProficiencyLevel):
        return val
    if not val:
        return ProficiencyLevel.INTERMEDIATE
    try:
        return ProficiencyLevel(val.upper())
    except ValueError:
        return ProficiencyLevel.INTERMEDIATE


async def calculate_job_skill_gap(
    db: AsyncSession,
    current_user: User,
    job_id: uuid.UUID,
) -> SkillGapReport:
    """Evaluate candidate competencies against target job requirements deterministically."""
    # 1. Authoritative Candidate Profile derivation from JWT
    candidate_profile: CandidateProfile = await candidate_service.get_or_create_candidate_profile(
        db, current_user
    )

    # 2. Fetch target Job with skills and employer profile
    job_query = (
        select(Job)
        .options(
            selectinload(Job.skills).selectinload(JobSkill.skill),
            selectinload(Job.employer),
        )
        .where(Job.id == job_id)
    )
    job_result = await db.execute(job_query)
    job: Job | None = job_result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    # 3. Fetch candidate's attached canonical skills
    cand_skills_query = (
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_id == candidate_profile.id)
    )
    cand_skills_result = await db.execute(cand_skills_query)
    candidate_skills: Sequence[CandidateSkill] = cand_skills_result.scalars().all()

    # Map candidate skills by canonical skill_id
    cand_skill_map: dict[uuid.UUID, CandidateSkill] = {cs.skill_id: cs for cs in candidate_skills}

    # 4. Deduplicate and iterate through job skill requirements
    job_skills_map: dict[uuid.UUID, JobSkill] = {}
    for js in job.skills:
        if js.skill_id not in job_skills_map:
            job_skills_map[js.skill_id] = js
        else:
            # If duplicate exists in legacy data, keep the one with higher required proficiency
            current_req_rank = get_proficiency_rank(job_skills_map[js.skill_id].minimum_proficiency)
            new_req_rank = get_proficiency_rank(js.minimum_proficiency)
            if new_req_rank > current_req_rank:
                job_skills_map[js.skill_id] = js

    gaps: list[SkillGapItem] = []
    matched_count = 0
    partial_count = 0
    missing_count = 0

    for skill_id, js in job_skills_map.items():
        canonical_skill: Skill = js.skill
        skill_name = canonical_skill.name if canonical_skill else "Unknown Skill"
        skill_type = canonical_skill.skill_type
        category = canonical_skill.category

        req_prof_enum = to_proficiency_enum(js.minimum_proficiency)
        req_rank = get_proficiency_rank(req_prof_enum)

        if skill_id in cand_skill_map:
            cand_skill = cand_skill_map[skill_id]
            cand_prof_enum = to_proficiency_enum(cand_skill.proficiency)
            cand_rank = get_proficiency_rank(cand_prof_enum)
            cand_exp_years = cand_skill.years_experience

            if cand_rank >= req_rank:
                # Fully Matched
                status_val = SkillGapStatus.MATCHED
                severity_val = None
                delta = 0
                explanation = (
                    f"Candidate has {skill_name} at {cand_prof_enum.value}, "
                    f"meeting the required {req_prof_enum.value} proficiency."
                )
                matched_count += 1
            else:
                # Partial Gap
                status_val = SkillGapStatus.PARTIAL
                delta = req_rank - cand_rank
                severity_val = GapSeverity.HIGH if delta >= 2 else GapSeverity.MEDIUM
                explanation = (
                    f"Candidate has {skill_name} at {cand_prof_enum.value} "
                    f"while the job requires {req_prof_enum.value}."
                )
                partial_count += 1

            gaps.append(
                SkillGapItem(
                    skill_id=skill_id,
                    skill_name=skill_name,
                    skill_type=skill_type,
                    category=category,
                    status=status_val,
                    required_proficiency=req_prof_enum,
                    candidate_proficiency=cand_prof_enum,
                    candidate_years_experience=cand_exp_years,
                    is_required=js.is_required,
                    weight=js.weight,
                    severity=severity_val,
                    proficiency_delta=delta,
                    explanation=explanation,
                )
            )
        else:
            # Missing Skill
            status_val = SkillGapStatus.MISSING
            severity_val = GapSeverity.HIGH
            delta = req_rank
            explanation = f"Candidate does not currently list {skill_name} as a skill."
            missing_count += 1

            gaps.append(
                SkillGapItem(
                    skill_id=skill_id,
                    skill_name=skill_name,
                    skill_type=skill_type,
                    category=category,
                    status=status_val,
                    required_proficiency=req_prof_enum,
                    candidate_proficiency=None,
                    candidate_years_experience=None,
                    is_required=js.is_required,
                    weight=js.weight,
                    severity=severity_val,
                    proficiency_delta=delta,
                    explanation=explanation,
                )
            )

    # 5. Deterministic Alignment Score Calculation
    total_skills = len(gaps)
    if total_skills == 0:
        skill_alignment_score = 100.0
    else:
        raw_score = ((matched_count * 1.0 + partial_count * 0.5) / total_skills) * 100.0
        skill_alignment_score = round(raw_score, 1)

    employer_name = None
    if job.employer:
        employer_name = job.employer.company_name

    return SkillGapReport(
        job_id=job.id,
        job_title=job.title,
        employer_name=employer_name,
        candidate_id=candidate_profile.id,
        skill_alignment_score=skill_alignment_score,
        summary=SkillGapSummary(
            total_required_skills=total_skills,
            matched_skills=matched_count,
            partial_skills=partial_count,
            missing_skills=missing_count,
        ),
        gaps=gaps,
    )

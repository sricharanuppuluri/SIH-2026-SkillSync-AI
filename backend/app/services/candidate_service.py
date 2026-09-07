"""Candidate domain service handling profile, skills, education, experience, and dashboard."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_education import CandidateEducation
from app.models.candidate_experience import CandidateExperience
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.profiles import CandidateProfile
from app.models.skill import Skill
from app.models.user import User
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


# ---------------------------------------------------------------------------
# Profile Management
# ---------------------------------------------------------------------------
async def get_or_create_candidate_profile(
    db: AsyncSession,
    user: User,
) -> CandidateProfile:
    """Retrieve or initialize the 1-to-1 CandidateProfile for the authenticated user."""
    stmt = (
        select(CandidateProfile)
        .where(CandidateProfile.user_id == user.id)
        .options(
            selectinload(CandidateProfile.skills).joinedload(CandidateSkill.skill),
            selectinload(CandidateProfile.educations),
            selectinload(CandidateProfile.experiences),
        )
    )
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        profile = CandidateProfile(
            user_id=user.id,
            headline=None,
            bio=None,
            current_role=None,
            experience_years=0.0,
            education_level=None,
            location_city=None,
            location_state=None,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


async def get_candidate_profile_dto(
    db: AsyncSession,
    user: User,
) -> CandidateProfileRead:
    """Return strongly typed CandidateProfileRead DTO for current user."""
    profile = await get_or_create_candidate_profile(db, user)
    return CandidateProfileRead(
        id=profile.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        headline=profile.headline,
        bio=profile.bio,
        current_role=profile.current_role,
        experience_years=profile.experience_years,
        education_level=profile.education_level,
        location_city=profile.location_city,
        location_state=profile.location_state,
        resume_filename=profile.resume_filename,
        resume_file_size=profile.resume_file_size,
        resume_uploaded_at=profile.resume_uploaded_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


async def update_candidate_profile(
    db: AsyncSession,
    user: User,
    data: CandidateProfileUpdate,
) -> CandidateProfileRead:
    """Update profile and user identity attributes."""
    profile = await get_or_create_candidate_profile(db, user)

    # 1. Update user full_name if provided
    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()
        db.add(user)

    # 2. Update candidate profile fields
    if data.headline is not None:
        profile.headline = data.headline.strip() if data.headline.strip() else None
    if data.bio is not None:
        profile.bio = data.bio.strip() if data.bio.strip() else None
    if data.current_role is not None:
        profile.current_role = data.current_role.strip() if data.current_role.strip() else None
    if data.experience_years is not None:
        profile.experience_years = max(0.0, data.experience_years)
    if data.education_level is not None:
        profile.education_level = (
            data.education_level.strip() if data.education_level.strip() else None
        )
    if data.location_city is not None:
        profile.location_city = data.location_city.strip() if data.location_city.strip() else None
    if data.location_state is not None:
        profile.location_state = (
            data.location_state.strip() if data.location_state.strip() else None
        )

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    await db.refresh(user)

    return await get_candidate_profile_dto(db, user)


# ---------------------------------------------------------------------------
# Skills Management
# ---------------------------------------------------------------------------
async def list_candidate_skills(
    db: AsyncSession,
    candidate_id: uuid.UUID,
) -> list[CandidateSkillResponse]:
    """List all canonical skills attached to the candidate profile."""
    stmt = (
        select(CandidateSkill)
        .where(CandidateSkill.candidate_id == candidate_id)
        .options(selectinload(CandidateSkill.skill))
        .order_by(CandidateSkill.created_at.desc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()

    response: list[CandidateSkillResponse] = []
    for r in records:
        response.append(
            CandidateSkillResponse(
                id=r.id,
                candidate_id=r.candidate_id,
                skill_id=r.skill_id,
                skill_name=r.skill.name if r.skill else "Unknown Skill",
                category=r.skill.category if r.skill else "General",
                skill_type=r.skill.skill_type.value
                if (r.skill and r.skill.skill_type)
                else "TECHNICAL",
                proficiency=r.proficiency,
                years_experience=r.years_experience,
                is_verified=r.is_verified,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return response


async def add_candidate_skill(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    data: CandidateSkillCreate,
) -> CandidateSkillResponse:
    """Attach a canonical skill from catalog to the candidate's competencies."""
    # 1. Verify canonical skill exists
    skill_stmt = select(Skill).where(Skill.id == data.skill_id)
    skill_res = await db.execute(skill_stmt)
    skill = skill_res.scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canonical skill with id '{data.skill_id}' not found.",
        )

    # 2. Prevent duplicate skill attachment
    dup_stmt = select(CandidateSkill).where(
        CandidateSkill.candidate_id == candidate_id,
        CandidateSkill.skill_id == data.skill_id,
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill is already attached to candidate profile.",
        )

    cand_skill = CandidateSkill(
        candidate_id=candidate_id,
        skill_id=data.skill_id,
        proficiency=data.proficiency,
        years_experience=max(0.0, data.years_experience),
        is_verified=False,
    )
    db.add(cand_skill)
    await db.commit()
    await db.refresh(cand_skill)

    return CandidateSkillResponse(
        id=cand_skill.id,
        candidate_id=cand_skill.candidate_id,
        skill_id=cand_skill.skill_id,
        skill_name=skill.name,
        category=skill.category,
        skill_type=skill.skill_type.value if skill.skill_type else "TECHNICAL",
        proficiency=cand_skill.proficiency,
        years_experience=cand_skill.years_experience,
        is_verified=cand_skill.is_verified,
        created_at=cand_skill.created_at,
        updated_at=cand_skill.updated_at,
    )


async def update_candidate_skill(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    skill_identifier: uuid.UUID,
    data: CandidateSkillUpdate,
) -> CandidateSkillResponse:
    """Update proficiency or experience of an attached skill (by candidate_skill.id or skill.id)."""
    stmt = (
        select(CandidateSkill)
        .where(
            CandidateSkill.candidate_id == candidate_id,
            (CandidateSkill.id == skill_identifier) | (CandidateSkill.skill_id == skill_identifier),
        )
        .options(selectinload(CandidateSkill.skill))
    )
    res = await db.execute(stmt)
    cand_skill = res.scalar_one_or_none()
    if not cand_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in candidate profile.",
        )

    if data.proficiency is not None:
        cand_skill.proficiency = data.proficiency
    if data.years_experience is not None:
        cand_skill.years_experience = max(0.0, data.years_experience)

    db.add(cand_skill)
    await db.commit()
    await db.refresh(cand_skill)

    skill = cand_skill.skill
    return CandidateSkillResponse(
        id=cand_skill.id,
        candidate_id=cand_skill.candidate_id,
        skill_id=cand_skill.skill_id,
        skill_name=skill.name if skill else "Skill",
        category=skill.category if skill else "General",
        skill_type=skill.skill_type.value if (skill and skill.skill_type) else "TECHNICAL",
        proficiency=cand_skill.proficiency,
        years_experience=cand_skill.years_experience,
        is_verified=cand_skill.is_verified,
        created_at=cand_skill.created_at,
        updated_at=cand_skill.updated_at,
    )


async def delete_candidate_skill(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    skill_identifier: uuid.UUID,
) -> None:
    """Remove a skill from candidate competencies (by candidate_skill.id or skill.id)."""
    stmt = select(CandidateSkill).where(
        CandidateSkill.candidate_id == candidate_id,
        (CandidateSkill.id == skill_identifier) | (CandidateSkill.skill_id == skill_identifier),
    )
    res = await db.execute(stmt)
    cand_skill = res.scalar_one_or_none()
    if not cand_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in candidate profile.",
        )

    await db.delete(cand_skill)
    await db.commit()


# ---------------------------------------------------------------------------
# Education Management
# ---------------------------------------------------------------------------
async def list_candidate_education(
    db: AsyncSession,
    candidate_id: uuid.UUID,
) -> list[CandidateEducationResponse]:
    """Retrieve all education entries for a candidate."""
    stmt = (
        select(CandidateEducation)
        .where(CandidateEducation.candidate_id == candidate_id)
        .order_by(
            CandidateEducation.start_year.desc().nullslast(), CandidateEducation.created_at.desc()
        )
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [CandidateEducationResponse.model_validate(r) for r in records]


async def add_candidate_education(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    data: CandidateEducationCreate,
) -> CandidateEducationResponse:
    """Add a new education record."""
    if data.start_year and data.end_year and not data.is_current:
        if data.end_year < data.start_year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End year cannot be earlier than start year.",
            )

    edu = CandidateEducation(
        candidate_id=candidate_id,
        institution=data.institution.strip(),
        degree=data.degree.strip(),
        field_of_study=data.field_of_study.strip() if data.field_of_study else None,
        start_year=data.start_year,
        end_year=None if data.is_current else data.end_year,
        is_current=data.is_current,
        grade=data.grade.strip() if data.grade else None,
        description=data.description.strip() if data.description else None,
    )
    db.add(edu)
    await db.commit()
    await db.refresh(edu)
    return CandidateEducationResponse.model_validate(edu)


async def update_candidate_education(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    education_id: uuid.UUID,
    data: CandidateEducationUpdate,
) -> CandidateEducationResponse:
    """Update an existing education record with ownership check."""
    stmt = select(CandidateEducation).where(
        CandidateEducation.id == education_id,
        CandidateEducation.candidate_id == candidate_id,
    )
    res = await db.execute(stmt)
    edu = res.scalar_one_or_none()
    if not edu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education record not found.",
        )

    if data.institution is not None:
        edu.institution = data.institution.strip()
    if data.degree is not None:
        edu.degree = data.degree.strip()
    if data.field_of_study is not None:
        edu.field_of_study = data.field_of_study.strip() if data.field_of_study else None
    if data.start_year is not None:
        edu.start_year = data.start_year
    if data.is_current is not None:
        edu.is_current = data.is_current
    if data.end_year is not None:
        edu.end_year = None if edu.is_current else data.end_year
    if data.grade is not None:
        edu.grade = data.grade.strip() if data.grade else None
    if data.description is not None:
        edu.description = data.description.strip() if data.description else None

    # Date sanity check
    if edu.start_year and edu.end_year and not edu.is_current:
        if edu.end_year < edu.start_year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End year cannot be earlier than start year.",
            )

    db.add(edu)
    await db.commit()
    await db.refresh(edu)
    return CandidateEducationResponse.model_validate(edu)


async def delete_candidate_education(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    education_id: uuid.UUID,
) -> None:
    """Delete an education record with ownership check."""
    stmt = select(CandidateEducation).where(
        CandidateEducation.id == education_id,
        CandidateEducation.candidate_id == candidate_id,
    )
    res = await db.execute(stmt)
    edu = res.scalar_one_or_none()
    if not edu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education record not found.",
        )

    await db.delete(edu)
    await db.commit()


# ---------------------------------------------------------------------------
# Experience Management
# ---------------------------------------------------------------------------
async def list_candidate_experience(
    db: AsyncSession,
    candidate_id: uuid.UUID,
) -> list[CandidateExperienceResponse]:
    """Retrieve all work experience entries for a candidate."""
    stmt = (
        select(CandidateExperience)
        .where(CandidateExperience.candidate_id == candidate_id)
        .order_by(CandidateExperience.created_at.desc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [CandidateExperienceResponse.model_validate(r) for r in records]


async def add_candidate_experience(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    data: CandidateExperienceCreate,
) -> CandidateExperienceResponse:
    """Add a new professional experience record."""
    exp = CandidateExperience(
        candidate_id=candidate_id,
        company=data.company.strip(),
        title=data.title.strip(),
        employment_type=data.employment_type.strip() if data.employment_type else None,
        location=data.location.strip() if data.location else None,
        start_date=data.start_date.strip() if data.start_date else None,
        end_date=None if data.is_current else (data.end_date.strip() if data.end_date else None),
        is_current=data.is_current,
        description=data.description.strip() if data.description else None,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return CandidateExperienceResponse.model_validate(exp)


async def update_candidate_experience(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    experience_id: uuid.UUID,
    data: CandidateExperienceUpdate,
) -> CandidateExperienceResponse:
    """Update an experience record with ownership check."""
    stmt = select(CandidateExperience).where(
        CandidateExperience.id == experience_id,
        CandidateExperience.candidate_id == candidate_id,
    )
    res = await db.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience record not found.",
        )

    if data.company is not None:
        exp.company = data.company.strip()
    if data.title is not None:
        exp.title = data.title.strip()
    if data.employment_type is not None:
        exp.employment_type = data.employment_type.strip() if data.employment_type else None
    if data.location is not None:
        exp.location = data.location.strip() if data.location else None
    if data.start_date is not None:
        exp.start_date = data.start_date.strip() if data.start_date else None
    if data.is_current is not None:
        exp.is_current = data.is_current
    if data.end_date is not None:
        exp.end_date = (
            None if exp.is_current else (data.end_date.strip() if data.end_date else None)
        )
    if data.description is not None:
        exp.description = data.description.strip() if data.description else None

    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return CandidateExperienceResponse.model_validate(exp)


async def delete_candidate_experience(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    experience_id: uuid.UUID,
) -> None:
    """Delete an experience record with ownership check."""
    stmt = select(CandidateExperience).where(
        CandidateExperience.id == experience_id,
        CandidateExperience.candidate_id == candidate_id,
    )
    res = await db.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience record not found.",
        )

    await db.delete(exp)
    await db.commit()


# ---------------------------------------------------------------------------
# Resume Management
# ---------------------------------------------------------------------------
async def upload_candidate_resume(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    data: CandidateResumeUploadRequest,
) -> CandidateResumeResponse:
    """Save resume metadata and content on candidate profile."""
    stmt = select(CandidateProfile).where(CandidateProfile.id == candidate_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    profile.resume_filename = data.filename.strip()
    profile.resume_file_size = data.file_size
    profile.resume_uploaded_at = datetime.now(UTC)
    if data.resume_text:
        profile.resume_text = data.resume_text.strip()

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return CandidateResumeResponse(
        filename=profile.resume_filename,
        file_size=profile.resume_file_size,
        uploaded_at=profile.resume_uploaded_at,
        has_resume=True,
    )


async def delete_candidate_resume(
    db: AsyncSession,
    candidate_id: uuid.UUID,
) -> CandidateResumeResponse:
    """Remove attached resume metadata and content from candidate profile."""
    stmt = select(CandidateProfile).where(CandidateProfile.id == candidate_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    profile.resume_filename = None
    profile.resume_file_size = None
    profile.resume_uploaded_at = None
    profile.resume_text = None

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return CandidateResumeResponse(
        filename=None,
        file_size=None,
        uploaded_at=None,
        has_resume=False,
    )


# ---------------------------------------------------------------------------
# Deterministic Profile Completeness Calculation
# ---------------------------------------------------------------------------
async def calculate_profile_completeness(
    db: AsyncSession,
    user: User,
    profile: CandidateProfile,
) -> ProfileCompletenessResponse:
    """Compute deterministic profile completeness percentage across 6 structured areas.

    Formula breakdown:
    - Basic Information: 20% (Full name and headline/role/location)
    - Professional Summary: 10% (Bio >= 20 characters)
    - Experience: 20% (At least 1 experience item or experience_years > 0)
    - Education: 15% (At least 1 education item or education_level specified)
    - Skills: 25% (At least 1 canonical skill attached)
    - Resume: 10% (Resume metadata or text uploaded)
    Total = 100%
    """
    section_scores: dict[str, int] = {}
    completed_sections: list[str] = []
    missing_sections: list[str] = []

    # 1. Basic Information (20%)
    has_basic = bool(
        user.full_name and (profile.headline or profile.current_role or profile.location_city)
    )
    if has_basic:
        section_scores["Basic Information"] = 20
        completed_sections.append("Basic Information")
    else:
        section_scores["Basic Information"] = 0
        missing_sections.append("Basic Information")

    # 2. Professional Summary (10%)
    has_summary = bool(profile.bio and len(profile.bio.strip()) >= 20)
    if has_summary:
        section_scores["Professional Summary"] = 10
        completed_sections.append("Professional Summary")
    else:
        section_scores["Professional Summary"] = 0
        missing_sections.append("Professional Summary")

    # 3. Experience (20%)
    exp_count_stmt = select(func.count(CandidateExperience.id)).where(
        CandidateExperience.candidate_id == profile.id
    )
    exp_res = await db.execute(exp_count_stmt)
    exp_count = exp_res.scalar() or 0
    has_exp = exp_count > 0 or profile.experience_years > 0
    if has_exp:
        section_scores["Experience"] = 20
        completed_sections.append("Experience")
    else:
        section_scores["Experience"] = 0
        missing_sections.append("Experience")

    # 4. Education (15%)
    edu_count_stmt = select(func.count(CandidateEducation.id)).where(
        CandidateEducation.candidate_id == profile.id
    )
    edu_res = await db.execute(edu_count_stmt)
    edu_count = edu_res.scalar() or 0
    has_edu = edu_count > 0 or bool(profile.education_level)
    if has_edu:
        section_scores["Education"] = 15
        completed_sections.append("Education")
    else:
        section_scores["Education"] = 0
        missing_sections.append("Education")

    # 5. Skills (25%)
    skills_count_stmt = select(func.count(CandidateSkill.id)).where(
        CandidateSkill.candidate_id == profile.id
    )
    skills_res = await db.execute(skills_count_stmt)
    skills_count = skills_res.scalar() or 0
    has_skills = skills_count > 0
    if has_skills:
        section_scores["Skills"] = 25
        completed_sections.append("Skills")
    else:
        section_scores["Skills"] = 0
        missing_sections.append("Skills")

    # 6. Resume (10%)
    has_resume = bool(profile.resume_filename or profile.resume_text)
    if has_resume:
        section_scores["Resume"] = 10
        completed_sections.append("Resume")
    else:
        section_scores["Resume"] = 0
        missing_sections.append("Resume")

    total_percentage = sum(section_scores.values())

    return ProfileCompletenessResponse(
        percentage=total_percentage,
        completed_sections=completed_sections,
        missing_sections=missing_sections,
        section_scores=section_scores,
    )


# ---------------------------------------------------------------------------
# Candidate Dashboard Aggregation
# ---------------------------------------------------------------------------
async def get_candidate_dashboard(
    db: AsyncSession,
    user: User,
) -> CandidateDashboardResponse:
    """Aggregate live candidate profile metrics and highlights."""
    profile_dto = await get_candidate_profile_dto(db, user)
    profile = await get_or_create_candidate_profile(db, user)

    # 1. Profile completeness
    completeness = await calculate_profile_completeness(db, user, profile)

    # 2. Skills metrics & proficiency distribution
    skills_stmt = select(CandidateSkill).where(CandidateSkill.candidate_id == profile.id)
    skills_res = await db.execute(skills_stmt)
    skills = skills_res.scalars().all()
    skills_count = len(skills)

    skills_by_prof: dict[str, int] = {
        ProficiencyLevel.BEGINNER.value: 0,
        ProficiencyLevel.INTERMEDIATE.value: 0,
        ProficiencyLevel.ADVANCED.value: 0,
        ProficiencyLevel.EXPERT.value: 0,
    }
    for s in skills:
        lvl = s.proficiency.value if hasattr(s.proficiency, "value") else str(s.proficiency)
        skills_by_prof[lvl] = skills_by_prof.get(lvl, 0) + 1

    # 3. Experience metrics & recent list
    experiences = await list_candidate_experience(db, profile.id)
    experience_count = len(experiences)
    recent_experiences = experiences[:3]

    # 4. Education metrics & highest/latest
    educations = await list_candidate_education(db, profile.id)
    education_count = len(educations)
    highest_education = educations[0] if educations else None

    return CandidateDashboardResponse(
        profile=profile_dto,
        completeness=completeness,
        skills_count=skills_count,
        skills_by_proficiency=skills_by_prof,
        experience_count=experience_count,
        education_count=education_count,
        recent_experiences=recent_experiences,
        highest_education=highest_education,
    )

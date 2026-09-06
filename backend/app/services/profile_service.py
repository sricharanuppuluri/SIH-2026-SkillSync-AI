"""Role profile domain business service."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.user import User
from app.schemas.profiles import (
    CandidateProfileUpdate,
    EmployerProfileUpdate,
    GovernmentProfileUpdate,
    TrainingProviderProfileUpdate,
)


async def get_or_create_candidate_profile(db: AsyncSession, user_id: uuid.UUID) -> CandidateProfile:
    """Fetch candidate profile or create empty profile if missing."""
    query = select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    result = await db.execute(query)
    profile = result.scalars().first()
    if not profile:
        profile = CandidateProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_candidate_profile(
    db: AsyncSession, profile: CandidateProfile, schema: CandidateProfileUpdate
) -> CandidateProfile:
    """Update candidate profile attributes."""
    if schema.headline is not None:
        profile.headline = schema.headline.strip() if schema.headline else None
    if schema.bio is not None:
        profile.bio = schema.bio
    if schema.experience_years is not None:
        profile.experience_years = schema.experience_years
    if schema.education_level is not None:
        profile.education_level = schema.education_level.strip() if schema.education_level else None
    if schema.location_city is not None:
        profile.location_city = schema.location_city.strip() if schema.location_city else None
    if schema.location_state is not None:
        profile.location_state = schema.location_state.strip() if schema.location_state else None

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_or_create_employer_profile(db: AsyncSession, user: User) -> EmployerProfile:
    """Fetch employer profile or create default profile based on user identity."""
    query = select(EmployerProfile).where(EmployerProfile.user_id == user.id)
    result = await db.execute(query)
    profile = result.scalars().first()
    if not profile:
        profile = EmployerProfile(
            user_id=user.id,
            company_name=f"{user.full_name}'s Enterprise",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_employer_profile(
    db: AsyncSession, profile: EmployerProfile, schema: EmployerProfileUpdate
) -> EmployerProfile:
    """Update employer profile attributes."""
    if schema.company_name is not None:
        profile.company_name = schema.company_name.strip()
    if schema.company_description is not None:
        profile.company_description = schema.company_description
    if schema.industry is not None:
        profile.industry = schema.industry.strip() if schema.industry else None
    if schema.location_city is not None:
        profile.location_city = schema.location_city.strip() if schema.location_city else None
    if schema.location_state is not None:
        profile.location_state = schema.location_state.strip() if schema.location_state else None
    if schema.website_url is not None:
        profile.website_url = schema.website_url.strip() if schema.website_url else None

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_or_create_training_provider_profile(
    db: AsyncSession, user: User
) -> TrainingProviderProfile:
    """Fetch provider profile or create default profile based on user identity."""
    query = select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == user.id)
    result = await db.execute(query)
    profile = result.scalars().first()
    if not profile:
        profile = TrainingProviderProfile(
            user_id=user.id,
            institution_name=f"{user.full_name}'s Academy",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_training_provider_profile(
    db: AsyncSession, profile: TrainingProviderProfile, schema: TrainingProviderProfileUpdate
) -> TrainingProviderProfile:
    """Update training provider profile attributes."""
    if schema.institution_name is not None:
        profile.institution_name = schema.institution_name.strip()
    if schema.provider_type is not None:
        profile.provider_type = schema.provider_type.strip() if schema.provider_type else None
    if schema.location_city is not None:
        profile.location_city = schema.location_city.strip() if schema.location_city else None
    if schema.location_state is not None:
        profile.location_state = schema.location_state.strip() if schema.location_state else None
    if schema.website_url is not None:
        profile.website_url = schema.website_url.strip() if schema.website_url else None
    if schema.contact_email is not None:
        profile.contact_email = schema.contact_email.strip() if schema.contact_email else None

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_or_create_government_profile(db: AsyncSession, user: User) -> GovernmentProfile:
    """Fetch government profile or create default profile based on user identity."""
    query = select(GovernmentProfile).where(GovernmentProfile.user_id == user.id)
    result = await db.execute(query)
    profile = result.scalars().first()
    if not profile:
        profile = GovernmentProfile(
            user_id=user.id,
            department_name="Department of Skill Development & Employment",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_government_profile(
    db: AsyncSession, profile: GovernmentProfile, schema: GovernmentProfileUpdate
) -> GovernmentProfile:
    """Update government profile attributes."""
    if schema.department_name is not None:
        profile.department_name = schema.department_name.strip()
    if schema.jurisdiction is not None:
        profile.jurisdiction = schema.jurisdiction.strip() if schema.jurisdiction else None
    if schema.designation is not None:
        profile.designation = schema.designation.strip() if schema.designation else None

    await db.commit()
    await db.refresh(profile)
    return profile

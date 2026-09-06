"""Skill taxonomy domain business service."""

import re
import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate


def normalize_skill_name(name: str) -> str:
    """Normalize skill name: trim, lowercase, collapse whitespace."""
    stripped = name.strip().lower()
    return re.sub(r"\s+", " ", stripped)


async def get_skills(
    db: AsyncSession,
    category: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Skill]:
    """Retrieve skills with optional category or keyword filtering."""
    query = select(Skill).offset(skip).limit(limit).order_by(Skill.name)
    if category:
        query = query.where(Skill.category == category)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(Skill.name).like(pattern) | func.lower(Skill.normalized_name).like(pattern)
        )
    result = await db.execute(query)
    return result.scalars().all()


async def get_skill_by_id(db: AsyncSession, skill_id: uuid.UUID) -> Skill | None:
    """Fetch a skill by its primary key UUID."""
    return await db.get(Skill, skill_id)


async def get_skill_by_normalized_name(db: AsyncSession, normalized_name: str) -> Skill | None:
    """Fetch a skill by its unique canonical normalized name."""
    query = select(Skill).where(Skill.normalized_name == normalized_name)
    result = await db.execute(query)
    return result.scalars().first()


async def create_skill(db: AsyncSession, schema: SkillCreate) -> Skill:
    """Create a new skill or raise 409 Conflict if already exists."""
    norm_name = normalize_skill_name(schema.name)
    existing = await get_skill_by_normalized_name(db, norm_name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill '{schema.name}' already exists as '{existing.name}'",
        )

    skill = Skill(
        name=schema.name.strip(),
        normalized_name=norm_name,
        category=schema.category.strip() if schema.category else "General",
        description=schema.description,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


async def update_skill(db: AsyncSession, skill: Skill, schema: SkillUpdate) -> Skill:
    """Update skill properties."""
    if schema.name is not None:
        norm_name = normalize_skill_name(schema.name)
        if norm_name != skill.normalized_name:
            existing = await get_skill_by_normalized_name(db, norm_name)
            if existing and existing.id != skill.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Skill with name '{schema.name}' already exists",
                )
            skill.name = schema.name.strip()
            skill.normalized_name = norm_name

    if schema.category is not None:
        skill.category = schema.category.strip()
    if schema.description is not None:
        skill.description = schema.description

    await db.commit()
    await db.refresh(skill)
    return skill

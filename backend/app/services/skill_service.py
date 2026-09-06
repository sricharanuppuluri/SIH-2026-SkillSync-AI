"""Skill taxonomy domain business service."""

import re
import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.skill import (
    Skill,
    SkillAlias,
    SkillRelationship,
    SkillStatus,
    SkillType,
)
from app.schemas.skill import (
    SkillAliasCreate,
    SkillCreate,
    SkillRelationshipCreate,
    SkillUpdate,
)


def normalize_skill_name(name: str) -> str:
    """Normalize skill name: trim, lowercase, collapse whitespace."""
    stripped = name.strip().lower()
    return re.sub(r"\s+", " ", stripped)


def normalize_alias_text(text: str) -> str:
    """Normalize alias text for deterministic lookup."""
    stripped = text.strip().lower()
    return re.sub(r"\s+", " ", stripped)


def generate_slug(name: str) -> str:
    """Generate a deterministic URL-safe canonical slug from a skill name."""
    s = name.strip().lower()
    # Handle known tech abbreviations
    s = s.replace("c++", "cpp")
    s = s.replace("c#", "csharp")
    s = s.replace(".net", "dotnet")
    s = s.replace("next.js", "next-js")
    s = s.replace("node.js", "node-js")
    s = s.replace("vue.js", "vue-js")
    s = s.replace("/", "-")
    # Replace non-alphanumeric with hyphens
    s = re.sub(r"[^a-z0-9]+", "-", s)
    # Strip leading and trailing hyphens
    s = s.strip("-")
    return s or "skill"


async def check_hierarchy_cycle(
    db: AsyncSession, skill_id: uuid.UUID, prospective_parent_id: uuid.UUID
) -> None:
    """Ensure setting parent does not create a cycle in skill hierarchy."""
    if skill_id == prospective_parent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A skill cannot be its own parent",
        )

    current_id: uuid.UUID | None = prospective_parent_id
    visited = {skill_id}

    while current_id is not None:
        if current_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Circular skill hierarchy detected",
            )
        visited.add(current_id)
        parent_skill = await db.get(Skill, current_id)
        if not parent_skill:
            break
        current_id = parent_skill.parent_skill_id


async def get_skills(
    db: AsyncSession,
    category: str | None = None,
    skill_type: SkillType | None = None,
    skill_status: SkillStatus | None = None,
    search: str | None = None,
    parent_skill_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Skill]:
    """Retrieve skills with filtering for category, type, status, hierarchy, or search keyword."""
    query = (
        select(Skill)
        .options(
            selectinload(Skill.parent),
            selectinload(Skill.aliases),
        )
        .offset(skip)
        .limit(limit)
        .order_by(Skill.name.asc())
    )

    if category:
        query = query.where(Skill.category == category)
    if skill_type:
        query = query.where(Skill.skill_type == skill_type)
    if skill_status:
        query = query.where(Skill.status == skill_status)
    if parent_skill_id:
        query = query.where(Skill.parent_skill_id == parent_skill_id)

    if search:
        search_term = search.strip().lower()
        pattern = f"%{search_term}%"

        # Search against name, normalized_name, slug, description, or aliases
        alias_subq = (
            select(SkillAlias.skill_id)
            .where(
                or_(
                    func.lower(SkillAlias.alias).like(pattern),
                    SkillAlias.normalized_alias.like(pattern),
                )
            )
            .scalar_subquery()
        )

        query = query.where(
            or_(
                func.lower(Skill.name).like(pattern),
                Skill.normalized_name.like(pattern),
                Skill.slug.like(pattern),
                Skill.description.ilike(pattern),
                Skill.id.in_(alias_subq),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


async def get_skill_catalog(
    db: AsyncSession,
    search: str | None = None,
    category: str | None = None,
    skill_type: SkillType | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Skill]:
    """Retrieve lightweight active canonical skills optimized for selector components."""
    query = (
        select(Skill)
        .where(Skill.status == SkillStatus.ACTIVE)
        .offset(skip)
        .limit(limit)
        .order_by(Skill.name.asc())
    )

    if category:
        query = query.where(Skill.category == category)
    if skill_type:
        query = query.where(Skill.skill_type == skill_type)

    if search:
        search_term = search.strip().lower()
        pattern = f"%{search_term}%"

        alias_subq = (
            select(SkillAlias.skill_id)
            .where(
                or_(
                    func.lower(SkillAlias.alias).like(pattern),
                    SkillAlias.normalized_alias.like(pattern),
                )
            )
            .scalar_subquery()
        )

        query = query.where(
            or_(
                func.lower(Skill.name).like(pattern),
                Skill.normalized_name.like(pattern),
                Skill.slug.like(pattern),
                Skill.id.in_(alias_subq),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


async def get_skill_by_id(db: AsyncSession, skill_id: uuid.UUID) -> Skill | None:
    """Fetch a skill by its primary key UUID."""
    query = (
        select(Skill)
        .where(Skill.id == skill_id)
        .options(
            selectinload(Skill.parent),
            selectinload(Skill.children),
            selectinload(Skill.aliases),
            selectinload(Skill.outbound_relationships).selectinload(SkillRelationship.target_skill),
            selectinload(Skill.inbound_relationships).selectinload(SkillRelationship.source_skill),
        )
    )
    result = await db.execute(query)
    return result.scalars().first()


async def get_skill_by_slug(db: AsyncSession, slug: str) -> Skill | None:
    """Fetch a skill by its canonical URL slug."""
    query = select(Skill).where(Skill.slug == slug.strip().lower())
    result = await db.execute(query)
    return result.scalars().first()


async def get_skill_by_normalized_name(db: AsyncSession, normalized_name: str) -> Skill | None:
    """Fetch a skill by its unique canonical normalized name."""
    query = select(Skill).where(Skill.normalized_name == normalized_name)
    result = await db.execute(query)
    return result.scalars().first()


async def resolve_skill_by_text(db: AsyncSession, text: str) -> Skill | None:
    """Deterministically resolve a user string (name, slug, or alias) to a canonical Skill."""
    cleaned = text.strip()
    if not cleaned:
        return None

    norm = normalize_skill_name(cleaned)
    slug = generate_slug(cleaned)

    # 1. Exact match on normalized_name
    skill = await get_skill_by_normalized_name(db, norm)
    if skill:
        return skill

    # 2. Match on slug
    skill = await get_skill_by_slug(db, slug)
    if skill:
        return skill

    # 3. Match on normalized_alias in skill_aliases
    alias_query = (
        select(Skill)
        .join(SkillAlias, SkillAlias.skill_id == Skill.id)
        .where(
            or_(
                SkillAlias.normalized_alias == norm,
                SkillAlias.normalized_alias == slug,
                func.lower(SkillAlias.alias) == cleaned.lower(),
            )
        )
    )
    result = await db.execute(alias_query)
    return result.scalars().first()


async def create_skill(db: AsyncSession, schema: SkillCreate) -> Skill:
    """Create a new canonical skill or raise 409 Conflict if slug or normalized_name exists."""
    norm_name = normalize_skill_name(schema.name)
    existing_name = await get_skill_by_normalized_name(db, norm_name)
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill '{schema.name}' already exists as '{existing_name.name}'",
        )

    slug = schema.slug.strip().lower() if schema.slug else generate_slug(schema.name)
    existing_slug = await get_skill_by_slug(db, slug)
    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill slug '{slug}' is already in use by '{existing_slug.name}'",
        )

    if schema.parent_skill_id:
        parent = await db.get(Skill, schema.parent_skill_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent skill ID {schema.parent_skill_id} does not exist",
            )

    skill = Skill(
        name=schema.name.strip(),
        slug=slug,
        normalized_name=norm_name,
        category=schema.category.strip() if schema.category else "General",
        subcategory=schema.subcategory.strip() if schema.subcategory else None,
        description=schema.description,
        skill_type=schema.skill_type,
        status=schema.status,
        parent_skill_id=schema.parent_skill_id,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


async def update_skill(db: AsyncSession, skill: Skill, schema: SkillUpdate) -> Skill:
    """Update canonical skill properties."""
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

    if schema.slug is not None:
        slug = schema.slug.strip().lower()
        if slug != skill.slug:
            existing = await get_skill_by_slug(db, slug)
            if existing and existing.id != skill.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Skill slug '{slug}' is already in use",
                )
            skill.slug = slug

    if schema.category is not None:
        skill.category = schema.category.strip()
    if schema.subcategory is not None:
        skill.subcategory = schema.subcategory.strip() if schema.subcategory else None
    if schema.description is not None:
        skill.description = schema.description
    if schema.skill_type is not None:
        skill.skill_type = schema.skill_type
    if schema.status is not None:
        skill.status = schema.status

    if schema.parent_skill_id is not None:
        if schema.parent_skill_id:
            await check_hierarchy_cycle(db, skill.id, schema.parent_skill_id)
            parent = await db.get(Skill, schema.parent_skill_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent skill {schema.parent_skill_id} not found",
                )
            skill.parent_skill_id = schema.parent_skill_id
    elif "parent_skill_id" in schema.model_fields_set and schema.parent_skill_id is None:
        skill.parent_skill_id = None

    await db.commit()
    await db.refresh(skill)
    return skill


async def delete_skill(db: AsyncSession, skill: Skill) -> None:
    """Delete a skill or deactivate it if foreign references exist."""
    await db.delete(skill)
    await db.commit()


# --- Skill Alias Operations ---


async def get_skill_aliases(db: AsyncSession, skill_id: uuid.UUID) -> Sequence[SkillAlias]:
    """List all aliases registered for a skill."""
    query = (
        select(SkillAlias).where(SkillAlias.skill_id == skill_id).order_by(SkillAlias.alias.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def add_skill_alias(
    db: AsyncSession, skill_id: uuid.UUID, schema: SkillAliasCreate
) -> SkillAlias:
    """Add a synonym alias for a skill."""
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill {skill_id} not found",
        )

    norm_alias = normalize_alias_text(schema.alias)

    # Check if this alias already exists
    existing = await db.execute(select(SkillAlias).where(SkillAlias.normalized_alias == norm_alias))
    existing_alias = existing.scalars().first()
    if existing_alias:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Alias '{schema.alias}' already registered for a skill",
        )

    alias = SkillAlias(
        skill_id=skill_id,
        alias=schema.alias.strip(),
        normalized_alias=norm_alias,
    )
    db.add(alias)
    await db.commit()
    await db.refresh(alias)
    return alias


async def delete_skill_alias(db: AsyncSession, skill_id: uuid.UUID, alias_id: uuid.UUID) -> None:
    """Remove an alias from a skill."""
    alias = await db.get(SkillAlias, alias_id)
    if not alias or alias.skill_id != skill_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alias {alias_id} not found for skill {skill_id}",
        )
    await db.delete(alias)
    await db.commit()


# --- Skill Relationship Operations ---


async def get_skill_relationships(
    db: AsyncSession, skill_id: uuid.UUID
) -> Sequence[SkillRelationship]:
    """Retrieve all relationships where this skill is source or target."""
    query = (
        select(SkillRelationship)
        .where(
            or_(
                SkillRelationship.source_skill_id == skill_id,
                SkillRelationship.target_skill_id == skill_id,
            )
        )
        .options(
            selectinload(SkillRelationship.source_skill),
            selectinload(SkillRelationship.target_skill),
        )
        .order_by(SkillRelationship.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def add_skill_relationship(
    db: AsyncSession, source_skill_id: uuid.UUID, schema: SkillRelationshipCreate
) -> SkillRelationship:
    """Add a directed, weighted relationship between skills."""
    if source_skill_id == schema.target_skill_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a relationship from a skill to itself",
        )

    source = await db.get(Skill, source_skill_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source skill {source_skill_id} not found",
        )

    target = await db.get(Skill, schema.target_skill_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target skill {schema.target_skill_id} not found",
        )

    # Check duplicate relationship
    existing = await db.execute(
        select(SkillRelationship).where(
            SkillRelationship.source_skill_id == source_skill_id,
            SkillRelationship.target_skill_id == schema.target_skill_id,
            SkillRelationship.relationship_type == schema.relationship_type,
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Relationship '{schema.relationship_type.value}' "
                "already exists between these skills"
            ),
        )

    rel = SkillRelationship(
        source_skill_id=source_skill_id,
        target_skill_id=schema.target_skill_id,
        relationship_type=schema.relationship_type,
        weight=schema.weight,
    )
    db.add(rel)
    await db.commit()
    await db.refresh(rel)
    return rel


async def delete_skill_relationship(
    db: AsyncSession, skill_id: uuid.UUID, relationship_id: uuid.UUID
) -> None:
    """Delete a relationship belonging to a skill."""
    rel = await db.get(SkillRelationship, relationship_id)
    if not rel or (rel.source_skill_id != skill_id and rel.target_skill_id != skill_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relationship {relationship_id} not found for skill {skill_id}",
        )
    await db.delete(rel)
    await db.commit()

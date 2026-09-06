"""Skill taxonomy and canonical intelligence endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_optional_current_user, require_roles
from app.models.skill import SkillStatus, SkillType
from app.models.user import User, UserRole
from app.schemas.skill import (
    SkillAliasCreate,
    SkillAliasResponse,
    SkillCatalogItem,
    SkillCreate,
    SkillDetailResponse,
    SkillRelationshipCreate,
    SkillRelationshipResponse,
    SkillResponse,
    SkillUpdate,
)
from app.services import skill_service

router = APIRouter()


def _to_skill_response(skill) -> SkillResponse:
    """Helper to convert Skill model to SkillResponse with computed metadata."""
    resp = SkillResponse.model_validate(skill)
    insp = inspect(skill)
    if "parent" not in insp.unloaded and skill.parent:
        resp.parent_name = skill.parent.name
    if "aliases" not in insp.unloaded and skill.aliases is not None:
        resp.aliases_count = len(skill.aliases)
    return resp


@router.get(
    "/catalog",
    response_model=list[SkillCatalogItem],
    summary="Get active canonical skills catalog",
)
async def get_catalog(
    search: str | None = Query(None, description="Search keyword for skill name, slug, or alias"),
    category: str | None = Query(None, description="Filter by category"),
    skill_type: SkillType | None = Query(None, description="Filter by skill type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[SkillCatalogItem]:
    """Retrieve lightweight active canonical skills catalog for UI selectors."""
    skills = await skill_service.get_skill_catalog(
        db,
        search=search,
        category=category,
        skill_type=skill_type,
        skip=skip,
        limit=limit,
    )
    return [SkillCatalogItem.model_validate(s) for s in skills]


@router.get(
    "/resolve",
    response_model=SkillResponse | None,
    summary="Deterministically resolve text to canonical skill",
)
async def resolve_skill(
    query: str = Query(..., min_length=1, description="Raw skill text to resolve"),
    db: AsyncSession = Depends(get_db),
) -> SkillResponse | None:
    """Resolve skill text, acronym, or alias to its canonical representation."""
    skill = await skill_service.resolve_skill_by_text(db, query)
    if not skill:
        return None
    return _to_skill_response(skill)


@router.get(
    "",
    response_model=list[SkillResponse],
    summary="List canonical skills taxonomy",
)
async def list_skills(
    category: str | None = Query(None, description="Filter by category"),
    skill_type: SkillType | None = Query(None, description="Filter by skill type"),
    skill_status: SkillStatus | None = Query(None, description="Filter by lifecycle status"),
    search: str | None = Query(None, description="Search keyword"),
    parent_skill_id: uuid.UUID | None = Query(None, description="Filter by parent skill ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SkillResponse]:
    """Retrieve skills taxonomy. Non-admins can only see active skills."""
    # Non-admin users are restricted to ACTIVE skills
    effective_status = skill_status
    if not current_user or current_user.role != UserRole.ADMIN:
        effective_status = SkillStatus.ACTIVE

    skills = await skill_service.get_skills(
        db,
        category=category,
        skill_type=skill_type,
        skill_status=effective_status,
        search=search,
        parent_skill_id=parent_skill_id,
        skip=skip,
        limit=limit,
    )
    return [_to_skill_response(s) for s in skills]


@router.get(
    "/{skill_id}",
    response_model=SkillDetailResponse,
    summary="Get skill detail by ID",
)
async def get_skill(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SkillDetailResponse:
    """Retrieve detailed canonical skill by UUID including hierarchy, aliases, and relationships."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )

    parent_resp = _to_skill_response(skill.parent) if skill.parent else None
    children_resps = [_to_skill_response(c) for c in (skill.children or [])]
    aliases_resps = [SkillAliasResponse.model_validate(a) for a in (skill.aliases or [])]

    outbound_resps = [
        SkillRelationshipResponse(
            id=r.id,
            source_skill_id=r.source_skill_id,
            target_skill_id=r.target_skill_id,
            relationship_type=r.relationship_type,
            weight=r.weight,
            created_at=r.created_at,
            source_skill_name=skill.name,
            target_skill_name=r.target_skill.name if r.target_skill else None,
        )
        for r in (skill.outbound_relationships or [])
    ]

    inbound_resps = [
        SkillRelationshipResponse(
            id=r.id,
            source_skill_id=r.source_skill_id,
            target_skill_id=r.target_skill_id,
            relationship_type=r.relationship_type,
            weight=r.weight,
            created_at=r.created_at,
            source_skill_name=r.source_skill.name if r.source_skill else None,
            target_skill_name=skill.name,
        )
        for r in (skill.inbound_relationships or [])
    ]

    base_resp = _to_skill_response(skill)
    return SkillDetailResponse(
        **base_resp.model_dump(),
        parent=parent_resp,
        children=children_resps,
        aliases=aliases_resps,
        outbound_relationships=outbound_resps,
        inbound_relationships=inbound_resps,
    )


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new canonical skill (Admin only)",
)
async def create_skill(
    req: SkillCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> SkillResponse:
    """Register a new canonical skill. Restricted strictly to ADMIN role."""
    skill = await skill_service.create_skill(db, req)
    return _to_skill_response(skill)


@router.patch(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Update canonical skill (Admin only)",
)
async def update_skill(
    skill_id: uuid.UUID,
    req: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> SkillResponse:
    """Update canonical skill properties or hierarchy. Restricted strictly to ADMIN role."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )
    updated = await skill_service.update_skill(db, skill, req)
    return _to_skill_response(updated)


@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete canonical skill (Admin only)",
)
async def delete_skill(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Delete a canonical skill. Restricted strictly to ADMIN role."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )
    await skill_service.delete_skill(db, skill)


# --- Aliases Endpoints ---


@router.get(
    "/{skill_id}/aliases",
    response_model=list[SkillAliasResponse],
    summary="List aliases for a skill",
)
async def list_skill_aliases(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[SkillAliasResponse]:
    """Retrieve all synonyms/aliases associated with a canonical skill."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )
    aliases = await skill_service.get_skill_aliases(db, skill_id)
    return [SkillAliasResponse.model_validate(a) for a in aliases]


@router.post(
    "/{skill_id}/aliases",
    response_model=SkillAliasResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add alias for a skill (Admin only)",
)
async def create_skill_alias(
    skill_id: uuid.UUID,
    req: SkillAliasCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> SkillAliasResponse:
    """Register a new alias/synonym for a canonical skill. Restricted to ADMIN."""
    alias = await skill_service.add_skill_alias(db, skill_id, req)
    return SkillAliasResponse.model_validate(alias)


@router.delete(
    "/{skill_id}/aliases/{alias_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete alias (Admin only)",
)
async def delete_skill_alias(
    skill_id: uuid.UUID,
    alias_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Remove an alias from a skill. Restricted to ADMIN."""
    await skill_service.delete_skill_alias(db, skill_id, alias_id)


# --- Relationships Endpoints ---


@router.get(
    "/{skill_id}/relationships",
    response_model=list[SkillRelationshipResponse],
    summary="List relationships for a skill",
)
async def list_skill_relationships(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[SkillRelationshipResponse]:
    """Retrieve all graph relationships (inbound and outbound) for a skill."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )
    relationships = await skill_service.get_skill_relationships(db, skill_id)
    return [
        SkillRelationshipResponse(
            id=r.id,
            source_skill_id=r.source_skill_id,
            target_skill_id=r.target_skill_id,
            relationship_type=r.relationship_type,
            weight=r.weight,
            created_at=r.created_at,
            source_skill_name=r.source_skill.name if r.source_skill else None,
            target_skill_name=r.target_skill.name if r.target_skill else None,
        )
        for r in relationships
    ]


@router.post(
    "/{skill_id}/relationships",
    response_model=SkillRelationshipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add skill relationship (Admin only)",
)
async def create_skill_relationship(
    skill_id: uuid.UUID,
    req: SkillRelationshipCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> SkillRelationshipResponse:
    """Create a directed relationship from this skill to target skill. Restricted to ADMIN."""
    rel = await skill_service.add_skill_relationship(db, skill_id, req)
    # Reload with source and target skills populated
    source = await skill_service.get_skill_by_id(db, rel.source_skill_id)
    target = await skill_service.get_skill_by_id(db, rel.target_skill_id)
    return SkillRelationshipResponse(
        id=rel.id,
        source_skill_id=rel.source_skill_id,
        target_skill_id=rel.target_skill_id,
        relationship_type=rel.relationship_type,
        weight=rel.weight,
        created_at=rel.created_at,
        source_skill_name=source.name if source else None,
        target_skill_name=target.name if target else None,
    )


@router.delete(
    "/{skill_id}/relationships/{relationship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete skill relationship (Admin only)",
)
async def delete_skill_relationship(
    skill_id: uuid.UUID,
    relationship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Delete a skill relationship. Restricted to ADMIN."""
    await skill_service.delete_skill_relationship(db, skill_id, relationship_id)

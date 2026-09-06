"""Skill taxonomy endpoints for listing and administrative/employer registration."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.skill import SkillCreate, SkillResponse
from app.services import skill_service

router = APIRouter()


@router.get(
    "",
    response_model=list[SkillResponse],
    summary="List skills taxonomy",
)
async def list_skills(
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search keyword for skill name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[SkillResponse]:
    """Retrieve catalog of skills matching criteria."""
    skills = await skill_service.get_skills(
        db, category=category, search=search, skip=skip, limit=limit
    )
    return [SkillResponse.model_validate(s) for s in skills]


@router.get(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Get skill by ID",
)
async def get_skill(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SkillResponse:
    """Retrieve a single skill by UUID."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found",
        )
    return SkillResponse.model_validate(skill)


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new skill in taxonomy",
)
async def create_skill(
    req: SkillCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.EMPLOYER,
            UserRole.TRAINING_PROVIDER,
        )
    ),
) -> SkillResponse:
    """Register a new canonical skill. Requires Employer, Training Provider, or Admin role."""
    skill = await skill_service.create_skill(db, req)
    return SkillResponse.model_validate(skill)

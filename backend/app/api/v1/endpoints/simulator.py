"""API Endpoints for Phase 15 — What-If Skill Demand Simulator.

Stateless, deterministic, non-destructive scenario modeling endpoints.
Computes projected demand, supply, training capacity, and shortage classifications
for single or multi-skill intervention scenarios against ACTUAL or FORECAST baselines.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.simulator import (
    MultiSkillScenarioRequest,
    MultiSkillScenarioResponse,
    SkillScenarioInput,
    SkillScenarioResult,
)
from app.services import what_if_simulator_service

router = APIRouter()

_ANY_AUTHENTICATED = require_roles(
    UserRole.CANDIDATE,
    UserRole.EMPLOYER,
    UserRole.TRAINING_PROVIDER,
    UserRole.GOVERNMENT,
    UserRole.ADMIN,
)


@router.post(
    "/skill",
    response_model=SkillScenarioResult,
    status_code=status.HTTP_200_OK,
    summary="Simulate What-If Scenario for a Single Canonical Skill",
    description=(
        "Calculates hypothetical changes in demand, verified supply, and training capacity "
        "against ACTUAL platform data or Phase 14 FORECAST data. Stateless and non-destructive."
    ),
)
async def simulate_single_skill(
    scenario: SkillScenarioInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> SkillScenarioResult:
    """Run simulation for a single canonical skill."""
    return await what_if_simulator_service.simulate_skill_scenario(
        db=db,
        scenario=scenario,
    )


@router.post(
    "/scenario",
    response_model=MultiSkillScenarioResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate What-If Scenario for Multiple Canonical Skills in Batch",
    description=(
        "Calculates hypothetical changes for multiple canonical skills in batch. "
        "Evaluates category transitions and aggregate improvements."
    ),
)
async def simulate_multi_skills(
    request: MultiSkillScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_ANY_AUTHENTICATED),
) -> MultiSkillScenarioResponse:
    """Run batch simulation for multiple canonical skills."""
    return await what_if_simulator_service.simulate_multi_skill_scenario(
        db=db,
        request=request,
    )

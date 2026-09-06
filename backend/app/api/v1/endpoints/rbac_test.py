"""Representative RBAC verification test endpoints for Phase 2 foundation testing."""

from fastapi import APIRouter, Depends

from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse

router = APIRouter()


@router.get(
    "/admin/test",
    response_model=dict,
    summary="RBAC verification endpoint for ADMIN role",
)
async def admin_only_test_endpoint(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict:
    """Protected test endpoint accessible ONLY by ADMIN users."""
    return {
        "message": "Admin authorization successful",
        "role": current_user.role.value,
        "user": UserResponse.model_validate(current_user),
    }


@router.get(
    "/employer/test",
    response_model=dict,
    summary="RBAC verification endpoint for EMPLOYER role",
)
async def employer_test_endpoint(
    current_user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> dict:
    """Protected test endpoint accessible by EMPLOYER and ADMIN users."""
    return {
        "message": "Employer authorization successful",
        "role": current_user.role.value,
        "user": UserResponse.model_validate(current_user),
    }


@router.get(
    "/candidate/test",
    response_model=dict,
    summary="RBAC verification endpoint for CANDIDATE role",
)
async def candidate_test_endpoint(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> dict:
    """Protected test endpoint accessible by CANDIDATE and ADMIN users."""
    return {
        "message": "Candidate authorization successful",
        "role": current_user.role.value,
        "user": UserResponse.model_validate(current_user),
    }


@router.get(
    "/training-provider/test",
    response_model=dict,
    summary="RBAC verification endpoint for TRAINING_PROVIDER role",
)
async def training_provider_test_endpoint(
    current_user: User = Depends(require_roles(UserRole.TRAINING_PROVIDER, UserRole.ADMIN)),
) -> dict:
    """Protected test endpoint accessible by TRAINING_PROVIDER and ADMIN users."""
    return {
        "message": "Training Provider authorization successful",
        "role": current_user.role.value,
        "user": UserResponse.model_validate(current_user),
    }


@router.get(
    "/government/test",
    response_model=dict,
    summary="RBAC verification endpoint for GOVERNMENT role",
)
async def government_test_endpoint(
    current_user: User = Depends(require_roles(UserRole.GOVERNMENT, UserRole.ADMIN)),
) -> dict:
    """Protected test endpoint accessible by GOVERNMENT and ADMIN users."""
    return {
        "message": "Government authorization successful",
        "role": current_user.role.value,
        "user": UserResponse.model_validate(current_user),
    }

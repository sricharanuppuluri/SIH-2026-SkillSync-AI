"""Authentication endpoints: registration, login, current user, and session termination."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_authenticated_user
from app.core.rate_limiter import rate_limit
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    dependencies=[Depends(rate_limit(requests_per_minute=20))],
)
async def register(
    req: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Public registration for candidates, employers, training providers, and government users.

    Administrative (ADMIN) accounts cannot be self-provisioned via public registration.
    """
    # Strict anti-privilege escalation check
    if req.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration for ADMIN role is strictly forbidden",
        )

    # Check for duplicate email
    stmt = select(User).where(User.email == req.email)
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    # Create and persist new user
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and obtain JWT access token",
    dependencies=[Depends(rate_limit(requests_per_minute=30))],
)
async def login(
    req: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Verify credentials and return a signed JWT bearer token."""
    # Constant-time-like generic error to avoid user enumeration
    generic_auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    stmt = select(User).where(User.email == req.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None:
        raise generic_auth_error

    if not verify_password(req.password, user.password_hash):
        raise generic_auth_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Issue signed access token
    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(require_authenticated_user),
) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout current user session",
)
async def logout(
    current_user: User = Depends(require_authenticated_user),
) -> dict[str, str]:
    """Stateless JWT logout confirmation.

    Clients must discard the stored JWT token upon receiving this response.
    """
    return {
        "message": "Successfully logged out. Please clear client-side token.",
        "user_id": str(current_user.id),
    }

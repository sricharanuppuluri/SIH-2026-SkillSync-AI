"""Comprehensive tests for Authentication, JWT Security, and RBAC authorization."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User, UserRole


# Helper to create users in the database directly for tests
async def create_test_user(
    email: str,
    password: str = "SecurePass123!",
    full_name: str = "Test User",
    role: UserRole = UserRole.CANDIDATE,
    is_active: bool = True,
) -> User:
    async with AsyncSessionLocal() as session:
        user = User(
            email=email.lower(),
            password_hash=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=is_active,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


# Helper to clean up a user after test
async def delete_test_user_by_email(email: str) -> None:
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == email.lower())
        user = (await session.execute(stmt)).scalar_one_or_none()
        if user:
            await session.delete(user)
            await session.commit()


# ============================================================================
# 1. Registration Tests
# ============================================================================


@pytest.mark.asyncio
async def test_register_valid_user(async_client: AsyncClient):
    email = f"candidate_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "StrongPassword123!",
        "full_name": "Test Candidate",
        "role": "CANDIDATE",
    }
    try:
        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == email.lower()
        assert data["full_name"] == "Test Candidate"
        assert data["role"] == "CANDIDATE"
        assert data["is_active"] is True
        assert "id" in data
        # CRITICAL SECURITY CHECK: password or hash must NEVER be returned
        assert "password" not in data
        assert "password_hash" not in data
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(async_client: AsyncClient):
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    await create_test_user(email=email)
    try:
        payload = {
            "email": email,
            "password": "AnotherPassword123!",
            "full_name": "Duplicate Candidate",
            "role": "CANDIDATE",
        }
        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_register_invalid_email_format_rejected(async_client: AsyncClient):
    payload = {
        "email": "not-a-valid-email",
        "password": "ValidPassword123!",
        "full_name": "Invalid Email",
        "role": "CANDIDATE",
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password_rejected(async_client: AsyncClient):
    payload = {
        "email": "shortpass@example.com",
        "password": "short",  # Less than 8 characters
        "full_name": "Short Password",
        "role": "CANDIDATE",
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_admin_role_forbidden(async_client: AsyncClient):
    """Anti-privilege escalation: Anonymous user cannot register as ADMIN."""
    email = f"rogue_admin_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "AdminPassword123!",
        "full_name": "Rogue Admin",
        "role": "ADMIN",
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 403
    assert "ADMIN role is strictly forbidden" in response.json()["detail"]


@pytest.mark.asyncio
async def test_password_hashing_security():
    """Verify passwords are never stored plaintext and hashing is salt-randomized."""
    raw = "MySecretPassword123!"
    hash1 = get_password_hash(raw)
    hash2 = get_password_hash(raw)

    assert hash1 != raw
    assert hash2 != raw
    # Different salts produce different hashes
    assert hash1 != hash2
    assert verify_password(raw, hash1) is True
    assert verify_password(raw, hash2) is True
    assert verify_password("WrongPassword123!", hash1) is False


# ============================================================================
# 2. Login Tests
# ============================================================================


@pytest.mark.asyncio
async def test_login_valid_credentials(async_client: AsyncClient):
    email = f"login_valid_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword123!"
    await create_test_user(email=email, password=password, role=UserRole.CANDIDATE)
    try:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email.lower()
        assert "password_hash" not in data["user"]
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_login_wrong_password_rejected(async_client: AsyncClient):
    email = f"wrong_pw_{uuid.uuid4().hex[:8]}@example.com"
    await create_test_user(email=email, password="CorrectPassword123!")
    try:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "IncorrectPassword999!"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_login_unknown_email_rejected(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_user_9999@example.com", "password": "SomePassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_inactive_user_rejected(async_client: AsyncClient):
    email = f"inactive_{uuid.uuid4().hex[:8]}@example.com"
    await create_test_user(email=email, password="ValidPassword123!", is_active=False)
    try:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "ValidPassword123!"},
        )
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()
    finally:
        await delete_test_user_by_email(email)


# ============================================================================
# 3. JWT and Authentication Tests
# ============================================================================


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(async_client: AsyncClient):
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_authenticated_get_me_success(async_client: AsyncClient):
    email = f"me_test_{uuid.uuid4().hex[:8]}@example.com"
    user = await create_test_user(email=email, role=UserRole.CANDIDATE)
    try:
        token = create_access_token(subject=user.id, role=user.role.value)
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email.lower()
        assert data["id"] == str(user.id)
        assert "password_hash" not in data
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_invalid_jwt_rejected(async_client: AsyncClient):
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token.string"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_expired_jwt_rejected(async_client: AsyncClient):
    email = f"expired_{uuid.uuid4().hex[:8]}@example.com"
    user = await create_test_user(email=email)
    try:
        expired_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            expires_delta=timedelta(seconds=-60),  # Expired 1 min ago
        )
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401
    finally:
        await delete_test_user_by_email(email)


@pytest.mark.asyncio
async def test_jwt_wrong_secret_signature_rejected(async_client: AsyncClient):
    email = f"forged_{uuid.uuid4().hex[:8]}@example.com"
    user = await create_test_user(email=email)
    try:
        forged_token = jwt.encode(
            {"sub": str(user.id), "role": "ADMIN", "exp": datetime.now(UTC) + timedelta(hours=1)},
            "completely_different_forged_secret_key",
            algorithm="HS256",
        )
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {forged_token}"},
        )
        assert response.status_code == 401
    finally:
        await delete_test_user_by_email(email)


# ============================================================================
# 4. Role-Based Access Control (RBAC) Tests
# ============================================================================


@pytest.mark.asyncio
async def test_rbac_admin_endpoint(async_client: AsyncClient):
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    cand_email = f"cand_{uuid.uuid4().hex[:8]}@example.com"

    admin_user = await create_test_user(email=admin_email, role=UserRole.ADMIN)
    cand_user = await create_test_user(email=cand_email, role=UserRole.CANDIDATE)

    try:
        admin_token = create_access_token(subject=admin_user.id, role=admin_user.role.value)
        cand_token = create_access_token(subject=cand_user.id, role=cand_user.role.value)

        # ADMIN user should succeed
        res_admin = await async_client.get(
            "/api/v1/admin/test",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        assert res_admin.json()["role"] == "ADMIN"

        # CANDIDATE user should receive 403 Forbidden
        res_cand = await async_client.get(
            "/api/v1/admin/test",
            headers={"Authorization": f"Bearer {cand_token}"},
        )
        assert res_cand.status_code == 403
    finally:
        await delete_test_user_by_email(admin_email)
        await delete_test_user_by_email(cand_email)


@pytest.mark.asyncio
async def test_rbac_employer_endpoint(async_client: AsyncClient):
    emp_email = f"emp_{uuid.uuid4().hex[:8]}@example.com"
    cand_email = f"cand_{uuid.uuid4().hex[:8]}@example.com"

    emp_user = await create_test_user(email=emp_email, role=UserRole.EMPLOYER)
    cand_user = await create_test_user(email=cand_email, role=UserRole.CANDIDATE)

    try:
        emp_token = create_access_token(subject=emp_user.id, role=emp_user.role.value)
        cand_token = create_access_token(subject=cand_user.id, role=cand_user.role.value)

        # EMPLOYER allowed
        res_emp = await async_client.get(
            "/api/v1/employer/test",
            headers={"Authorization": f"Bearer {emp_token}"},
        )
        assert res_emp.status_code == 200

        # CANDIDATE forbidden
        res_cand = await async_client.get(
            "/api/v1/employer/test",
            headers={"Authorization": f"Bearer {cand_token}"},
        )
        assert res_cand.status_code == 403
    finally:
        await delete_test_user_by_email(emp_email)
        await delete_test_user_by_email(cand_email)


@pytest.mark.asyncio
async def test_rbac_candidate_endpoint(async_client: AsyncClient):
    cand_email = f"cand_{uuid.uuid4().hex[:8]}@example.com"
    cand_user = await create_test_user(email=cand_email, role=UserRole.CANDIDATE)

    try:
        cand_token = create_access_token(subject=cand_user.id, role=cand_user.role.value)

        res_cand = await async_client.get(
            "/api/v1/candidate/test",
            headers={"Authorization": f"Bearer {cand_token}"},
        )
        assert res_cand.status_code == 200
        assert res_cand.json()["role"] == "CANDIDATE"
    finally:
        await delete_test_user_by_email(cand_email)


@pytest.mark.asyncio
async def test_rbac_all_five_roles(async_client: AsyncClient):
    """Test every defined role: CANDIDATE, EMPLOYER, TRAINING_PROVIDER, GOVERNMENT, ADMIN."""
    roles = [
        UserRole.CANDIDATE,
        UserRole.EMPLOYER,
        UserRole.TRAINING_PROVIDER,
        UserRole.GOVERNMENT,
        UserRole.ADMIN,
    ]

    for role in roles:
        email = f"role_{role.value.lower()}_{uuid.uuid4().hex[:8]}@example.com"
        user = await create_test_user(email=email, role=role)
        try:
            token = create_access_token(subject=user.id, role=user.role.value)
            res = await async_client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            assert res.json()["role"] == role.value
        finally:
            await delete_test_user_by_email(email)

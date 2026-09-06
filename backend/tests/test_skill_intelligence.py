"""Comprehensive tests for Phase 5 Skill Intelligence.

Validates canonical skills, normalization, resolver, hierarchy cycles,
aliases, relationships, catalog filtering, and RBAC enforcement.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.skill import (
    SkillRelationshipType,
    SkillStatus,
    SkillType,
)
from app.models.user import User, UserRole
from app.services.skill_seed_service import seed_canonical_skills
from app.services.skill_service import (
    generate_slug,
    normalize_alias_text,
    normalize_skill_name,
    resolve_skill_by_text,
)


async def create_role_user(email: str, role: UserRole) -> tuple[User, str]:
    """Helper creating user and JWT token for given role."""
    async with AsyncSessionLocal() as session:
        user = User(
            email=email,
            password_hash=get_password_hash("TestPass123!"),
            full_name=f"{role.value} Tester",
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return user, token


def test_normalization_and_slug_generation() -> None:
    """Test deterministic string normalizer and slug generator."""
    assert normalize_skill_name("  Python  ") == "python"
    assert normalize_skill_name("PostgreSQL") == "postgresql"
    assert normalize_skill_name("Machine   Learning") == "machine learning"
    assert normalize_alias_text("  Py3  ") == "py3"

    assert generate_slug("Python") == "python"
    assert generate_slug("Machine Learning") == "machine-learning"
    assert generate_slug("Next.js") == "next-js"
    assert generate_slug("Node.js") == "node-js"
    assert generate_slug("C++") == "cpp"
    assert generate_slug("CI/CD") == "ci-cd"
    assert generate_slug("AI/ML") == "ai-ml"


@pytest.mark.asyncio
async def test_canonical_seed_and_resolver() -> None:
    """Test that canonical skills seed successfully and resolver matches accurately."""
    async with AsyncSessionLocal() as session:
        # Seed canonical skills
        res1 = await seed_canonical_skills(session)
        assert res1["skills_created"] >= 0  # Idempotent: may be 0 if already seeded

        # Re-running seed must create 0 duplicates
        res2 = await seed_canonical_skills(session)
        assert res2["skills_created"] == 0
        assert res2["aliases_created"] == 0
        assert res2["relationships_created"] == 0

        # Deterministic resolver tests
        py_skill = await resolve_skill_by_text(session, "Python")
        assert py_skill is not None
        assert py_skill.name == "Python"

        py3_skill = await resolve_skill_by_text(session, "python3")
        assert py3_skill is not None
        assert py3_skill.name == "Python"

        py_alias = await resolve_skill_by_text(session, "py")
        assert py_alias is not None
        assert py_alias.name == "Python"

        pg_skill = await resolve_skill_by_text(session, "postgres")
        assert pg_skill is not None
        assert pg_skill.name == "PostgreSQL"

        js_skill = await resolve_skill_by_text(session, "js")
        assert js_skill is not None
        assert js_skill.name == "JavaScript"

        ts_skill = await resolve_skill_by_text(session, "ts")
        assert ts_skill is not None
        assert ts_skill.name == "TypeScript"

        # Non-matching text
        none_skill = await resolve_skill_by_text(session, "NonExistentSkill123")
        assert none_skill is None


@pytest.mark.asyncio
async def test_admin_skill_crud(async_client: AsyncClient) -> None:
    """Verify ADMIN can create, view, update, and delete canonical skills."""
    suffix = uuid.uuid4().hex[:6]
    _, admin_token = await create_role_user(f"adm_crud_{suffix}@test.internal", UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create skill
    create_payload = {
        "name": f"GraphQL {suffix}",
        "category": "Web",
        "subcategory": "API",
        "skill_type": SkillType.TECHNICAL.value,
        "description": "Query language for APIs.",
        "status": SkillStatus.ACTIVE.value,
    }
    create_res = await async_client.post("/api/v1/skills", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    skill_data = create_res.json()
    assert skill_data["name"] == f"GraphQL {suffix}"
    assert skill_data["slug"] == f"graphql-{suffix}"
    skill_id = skill_data["id"]

    # 2. Get skill detail
    detail_res = await async_client.get(f"/api/v1/skills/{skill_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == skill_id
    assert detail["category"] == "Web"
    assert "aliases" in detail
    assert "outbound_relationships" in detail

    # 3. Update skill
    update_payload = {
        "description": "Declarative data fetching specification.",
        "subcategory": "Data Layer",
    }
    patch_res = await async_client.patch(
        f"/api/v1/skills/{skill_id}", json=update_payload, headers=headers
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["description"] == "Declarative data fetching specification."
    assert updated["subcategory"] == "Data Layer"

    # 4. Delete skill
    del_res = await async_client.delete(f"/api/v1/skills/{skill_id}", headers=headers)
    assert del_res.status_code == 204

    # 5. Confirm deletion
    get_res = await async_client.get(f"/api/v1/skills/{skill_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_skill_aliases_management(async_client: AsyncClient) -> None:
    """Verify alias creation, duplicate rejection, and deletion."""
    suffix = uuid.uuid4().hex[:6]
    _, admin_token = await create_role_user(f"adm_alias_{suffix}@test.internal", UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create parent skill
    res = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Kubernetes {suffix}", "category": "Cloud/DevOps"},
        headers=headers,
    )
    assert res.status_code == 201
    skill_id = res.json()["id"]

    # 1. Add alias
    alias_res = await async_client.post(
        f"/api/v1/skills/{skill_id}/aliases",
        json={"alias": f"k8s-{suffix}"},
        headers=headers,
    )
    assert alias_res.status_code == 201
    alias_data = alias_res.json()
    assert alias_data["alias"] == f"k8s-{suffix}"
    assert alias_data["normalized_alias"] == f"k8s-{suffix}"
    alias_id = alias_data["id"]

    # 2. Duplicate alias rejection (409)
    dupe_res = await async_client.post(
        f"/api/v1/skills/{skill_id}/aliases",
        json={"alias": f"  K8S-{suffix}  "},
        headers=headers,
    )
    assert dupe_res.status_code == 409

    # 3. List aliases
    list_res = await async_client.get(f"/api/v1/skills/{skill_id}/aliases")
    assert list_res.status_code == 200
    aliases = list_res.json()
    assert len(aliases) >= 1
    assert any(a["id"] == alias_id for a in aliases)

    # 4. Delete alias
    del_res = await async_client.delete(
        f"/api/v1/skills/{skill_id}/aliases/{alias_id}",
        headers=headers,
    )
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_skill_relationships_management(async_client: AsyncClient) -> None:
    """Verify graph relationship creation, self-edge rejection, and weight constraints."""
    suffix = uuid.uuid4().hex[:6]
    _, admin_token = await create_role_user(f"adm_rel_{suffix}@test.internal", UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create two skills
    res1 = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Flask {suffix}", "category": "Web"},
        headers=headers,
    )
    res2 = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Python Base {suffix}", "category": "Programming"},
        headers=headers,
    )
    flask_id = res1.json()["id"]
    python_id = res2.json()["id"]

    # 1. Self-relationship rejected (400)
    self_res = await async_client.post(
        f"/api/v1/skills/{flask_id}/relationships",
        json={"target_skill_id": flask_id, "relationship_type": "RELATED", "weight": 1.0},
        headers=headers,
    )
    assert self_res.status_code == 400

    # 2. Invalid weight rejected by validation (422)
    invalid_weight_res = await async_client.post(
        f"/api/v1/skills/{flask_id}/relationships",
        json={"target_skill_id": python_id, "relationship_type": "RELATED", "weight": 5.0},
        headers=headers,
    )
    assert invalid_weight_res.status_code == 422

    # 3. Create valid relationship
    rel_res = await async_client.post(
        f"/api/v1/skills/{flask_id}/relationships",
        json={
            "target_skill_id": python_id,
            "relationship_type": SkillRelationshipType.PREREQUISITE.value,
            "weight": 1.4,
        },
        headers=headers,
    )
    assert rel_res.status_code == 201
    rel_data = rel_res.json()
    assert rel_data["source_skill_id"] == flask_id
    assert rel_data["target_skill_id"] == python_id
    assert rel_data["relationship_type"] == SkillRelationshipType.PREREQUISITE.value
    rel_id = rel_data["id"]

    # 4. Duplicate relationship rejected (409)
    dupe_rel_res = await async_client.post(
        f"/api/v1/skills/{flask_id}/relationships",
        json={
            "target_skill_id": python_id,
            "relationship_type": SkillRelationshipType.PREREQUISITE.value,
            "weight": 1.4,
        },
        headers=headers,
    )
    assert dupe_rel_res.status_code == 409

    # 5. List relationships
    list_rel = await async_client.get(f"/api/v1/skills/{flask_id}/relationships")
    assert list_rel.status_code == 200
    relationships = list_rel.json()
    assert len(relationships) >= 1

    # 6. Delete relationship
    del_res = await async_client.delete(
        f"/api/v1/skills/{flask_id}/relationships/{rel_id}",
        headers=headers,
    )
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_hierarchy_cycle_prevention(async_client: AsyncClient) -> None:
    """Verify self-parenting and circular hierarchy are rejected with 400."""
    suffix = uuid.uuid4().hex[:6]
    _, admin_token = await create_role_user(f"adm_hier_{suffix}@test.internal", UserRole.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Skill A and Skill B
    res_a = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Skill A {suffix}", "category": "General"},
        headers=headers,
    )
    res_b = await async_client.post(
        "/api/v1/skills",
        json={"name": f"Skill B {suffix}", "category": "General"},
        headers=headers,
    )
    id_a = res_a.json()["id"]
    id_b = res_b.json()["id"]

    # 1. Self-parenting rejected
    self_parent = await async_client.patch(
        f"/api/v1/skills/{id_a}",
        json={"parent_skill_id": id_a},
        headers=headers,
    )
    assert self_parent.status_code == 400

    # 2. Set Skill A's parent to Skill B
    set_parent = await async_client.patch(
        f"/api/v1/skills/{id_a}",
        json={"parent_skill_id": id_b},
        headers=headers,
    )
    assert set_parent.status_code == 200

    # 3. Attempting to set Skill B's parent to Skill A creates cycle A -> B -> A (400)
    cycle_res = await async_client.patch(
        f"/api/v1/skills/{id_b}",
        json={"parent_skill_id": id_a},
        headers=headers,
    )
    assert cycle_res.status_code == 400
    assert "Circular skill hierarchy" in cycle_res.json()["detail"]


@pytest.mark.asyncio
async def test_rbac_and_catalog_isolation(async_client: AsyncClient) -> None:
    """Verify non-admin roles cannot mutate skills, and inactive skills are hidden from catalog."""
    suffix = uuid.uuid4().hex[:6]
    _, admin_token = await create_role_user(f"adm_rbac_{suffix}@test.internal", UserRole.ADMIN)
    _, emp_token = await create_role_user(f"emp_rbac_{suffix}@test.internal", UserRole.EMPLOYER)
    _, cand_token = await create_role_user(f"cand_rbac_{suffix}@test.internal", UserRole.CANDIDATE)
    _, tp_token = await create_role_user(
        f"tp_rbac_{suffix}@test.internal", UserRole.TRAINING_PROVIDER
    )

    # 1. Non-admin mutations rejected (403)
    for role_name, token in [
        ("Employer", emp_token),
        ("Candidate", cand_token),
        ("TrainingProvider", tp_token),
    ]:
        res = await async_client.post(
            "/api/v1/skills",
            json={"name": f"Forbidden {role_name} {suffix}", "category": "Tech"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403

    # 2. Admin creates active and inactive skills
    res_active = await async_client.post(
        "/api/v1/skills",
        json={
            "name": f"Active Skill {suffix}",
            "category": "StatusTest",
            "status": SkillStatus.ACTIVE.value,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_active.status_code == 201

    res_inactive = await async_client.post(
        "/api/v1/skills",
        json={
            "name": f"Inactive Skill {suffix}",
            "category": "StatusTest",
            "status": SkillStatus.INACTIVE.value,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_inactive.status_code == 201

    # 3. Catalog endpoint only returns ACTIVE skills
    cat_res = await async_client.get(
        f"/api/v1/skills/catalog?search={suffix}",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert cat_res.status_code == 200
    catalog_items = cat_res.json()
    item_names = [item["name"] for item in catalog_items]
    assert f"Active Skill {suffix}" in item_names
    assert f"Inactive Skill {suffix}" not in item_names

    # 4. Regular /skills query for non-admin hides inactive skills
    list_cand = await async_client.get(
        f"/api/v1/skills?category=StatusTest&search={suffix}",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert list_cand.status_code == 200
    cand_items = [s["name"] for s in list_cand.json()]
    assert f"Active Skill {suffix}" in cand_items
    assert f"Inactive Skill {suffix}" not in cand_items

    # 5. Admin can query inactive skills
    list_admin = await async_client.get(
        f"/api/v1/skills?category=StatusTest&skill_status=INACTIVE&search={suffix}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_admin.status_code == 200
    admin_items = [s["name"] for s in list_admin.json()]
    assert f"Inactive Skill {suffix}" in admin_items

"""Create users table and user_role enum

Revision ID: 0002_create_users_table
Revises: 0001_initial_pgvector
Create Date: 2026-09-06 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_create_users_table"
down_revision: str | None = "0001_initial_pgvector"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# User role enum definition for PostgreSQL
user_role_enum = postgresql.ENUM(
    "CANDIDATE",
    "EMPLOYER",
    "TRAINING_PROVIDER",
    "GOVERNMENT",
    "ADMIN",
    name="user_role",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = insp.get_table_names()

    # If legacy prototype table exists without 'id' primary key column, clean up legacy tables
    if "users" in existing_tables:
        cols = [c["name"] for c in insp.get_columns("users")]
        if "id" not in cols:
            legacy_tables = [
                "notifications",
                "training_records",
                "employment_outcomes",
                "skill_passports",
                "assessment_results",
                "assessments",
                "course_skills",
                "courses",
                "job_skills",
                "applications",
                "jobs",
                "candidate_skills",
                "skills",
                "training_providers",
                "employers",
                "candidates",
                "users",
                "schema_migrations",
            ]
            for legacy in legacy_tables:
                bind.execute(sa.text(f"DROP TABLE IF EXISTS {legacy} CASCADE;"))

    # Create enum type
    user_role_enum.create(bind, checkfirst=True)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="CANDIDATE"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    user_role_enum.drop(bind, checkfirst=True)

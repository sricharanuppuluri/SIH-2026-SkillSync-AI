"""Employer Skill Contracts and Competency Requirements schema

Revision ID: 0011_skill_contracts
Revises: 0010_verified_skill_passport
Create Date: 2026-09-07 08:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0011_skill_contracts"
down_revision: str | None = "0010_verified_skill_passport"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create Enums
    contract_status_enum = postgresql.ENUM(
        "DRAFT",
        "ACTIVE",
        "ARCHIVED",
        name="contract_status",
        create_type=False,
    )
    contract_status_enum.create(op.get_bind(), checkfirst=True)

    contract_requirement_type_enum = postgresql.ENUM(
        "REQUIRED",
        "PREFERRED",
        name="contract_requirement_type",
        create_type=False,
    )
    contract_requirement_type_enum.create(op.get_bind(), checkfirst=True)

    contract_importance_enum = postgresql.ENUM(
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
        name="contract_importance",
        create_type=False,
    )
    contract_importance_enum.create(op.get_bind(), checkfirst=True)

    contract_evidence_type_enum = postgresql.ENUM(
        "NONE",
        "VERIFIED_SKILL",
        "COURSE_COMPLETION",
        "CERTIFICATION",
        "ASSESSMENT",
        "PROJECT",
        "WORK_EXPERIENCE",
        name="contract_evidence_type",
        create_type=False,
    )
    contract_evidence_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create skill_contracts table
    op.create_table(
        "skill_contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "status",
            postgresql.ENUM(
                "DRAFT",
                "ACTIVE",
                "ARCHIVED",
                name="contract_status",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'DRAFT'"),
            index=True,
        ),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("job_id", "version", name="uq_skill_contract_job_version"),
    )

    # Partial unique index ensuring only one ACTIVE contract per job
    op.create_index(
        "ix_uq_active_contract_per_job",
        "skill_contracts",
        ["job_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    # 3. Create skill_contract_requirements table
    op.create_table(
        "skill_contract_requirements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skill_contracts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "required_proficiency",
            postgresql.ENUM(
                "BEGINNER",
                "INTERMEDIATE",
                "ADVANCED",
                "EXPERT",
                name="proficiency_level",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'INTERMEDIATE'"),
        ),
        sa.Column(
            "requirement_type",
            postgresql.ENUM(
                "REQUIRED",
                "PREFERRED",
                name="contract_requirement_type",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'REQUIRED'"),
        ),
        sa.Column(
            "importance",
            postgresql.ENUM(
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
                name="contract_importance",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'HIGH'"),
        ),
        sa.Column(
            "minimum_experience_months",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "evidence_type",
            postgresql.ENUM(
                "NONE",
                "VERIFIED_SKILL",
                "COURSE_COMPLETION",
                "CERTIFICATION",
                "ASSESSMENT",
                "PROJECT",
                "WORK_EXPERIENCE",
                name="contract_evidence_type",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'NONE'"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("contract_id", "skill_id", name="uq_skill_contract_req_skill"),
    )


def downgrade() -> None:
    # 1. Drop tables
    op.drop_table("skill_contract_requirements")
    op.drop_index(
        "ix_uq_active_contract_per_job",
        table_name="skill_contracts",
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )
    op.drop_table("skill_contracts")

    # 2. Drop enums
    op.execute("DROP TYPE IF EXISTS contract_evidence_type CASCADE")
    op.execute("DROP TYPE IF EXISTS contract_importance CASCADE")
    op.execute("DROP TYPE IF EXISTS contract_requirement_type CASCADE")
    op.execute("DROP TYPE IF EXISTS contract_status CASCADE")

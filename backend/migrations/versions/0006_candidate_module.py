"""Candidate module education, experience, and profile extension

Revision ID: 0006_candidate_module
Revises: 0005_skill_intelligence
Create Date: 2026-09-06 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006_candidate_module"
down_revision: str | None = "0005_skill_intelligence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add candidate profile extension columns
    op.add_column(
        "candidate_profiles",
        sa.Column("current_role", sa.String(100), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("resume_filename", sa.String(255), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("resume_file_size", sa.Integer(), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("resume_uploaded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("resume_text", sa.Text(), nullable=True),
    )

    # 2. Create candidate_educations table
    op.create_table(
        "candidate_educations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("institution", sa.String(255), nullable=False),
        sa.Column("degree", sa.String(100), nullable=False),
        sa.Column("field_of_study", sa.String(100), nullable=True),
        sa.Column("start_year", sa.Integer(), nullable=True),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("grade", sa.String(50), nullable=True),
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
    )
    op.create_index(
        "ix_candidate_educations_candidate_id",
        "candidate_educations",
        ["candidate_id"],
    )

    # 3. Create candidate_experiences table
    op.create_table(
        "candidate_experiences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("employment_type", sa.String(50), nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("start_date", sa.String(50), nullable=True),
        sa.Column("end_date", sa.String(50), nullable=True),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("false"), nullable=False),
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
    )
    op.create_index(
        "ix_candidate_experiences_candidate_id",
        "candidate_experiences",
        ["candidate_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_experiences_candidate_id", table_name="candidate_experiences")
    op.drop_table("candidate_experiences")

    op.drop_index("ix_candidate_educations_candidate_id", table_name="candidate_educations")
    op.drop_table("candidate_educations")

    op.drop_column("candidate_profiles", "resume_text")
    op.drop_column("candidate_profiles", "resume_uploaded_at")
    op.drop_column("candidate_profiles", "resume_file_size")
    op.drop_column("candidate_profiles", "resume_filename")
    op.drop_column("candidate_profiles", "current_role")

"""Employment Outcome Intelligence and Provider Performance Index schema

Revision ID: 0012_outcome_intelligence
Revises: 0011_skill_contracts
Create Date: 2026-09-07 10:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0012_outcome_intelligence"
down_revision: str | None = "0011_skill_contracts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create Enums
    retention_status_enum = postgresql.ENUM(
        "ACTIVE",
        "LEFT_WITHIN_30D",
        "RETAINED_90D",
        "RETAINED_180D",
        "TERMINATED",
        name="retention_status",
        create_type=False,
    )
    retention_status_enum.create(op.get_bind(), checkfirst=True)

    ppi_tier_enum = postgresql.ENUM(
        "TIER_1_EXCELLENT",
        "TIER_2_PROFICIENT",
        "TIER_3_DEVELOPING",
        "TIER_4_NEEDS_IMPROVEMENT",
        name="ppi_tier",
        create_type=False,
    )
    ppi_tier_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create placement_outcomes table
    op.create_table(
        "placement_outcomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "employer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employer_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "contract_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skill_contracts.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("placement_date", sa.Date(), nullable=False),
        sa.Column("starting_salary_annual", sa.Float(), nullable=True),
        sa.Column(
            "employment_type",
            postgresql.ENUM(
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "INTERNSHIP",
                name="employment_type",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'FULL_TIME'"),
        ),
        sa.Column(
            "retention_status",
            postgresql.ENUM(
                "ACTIVE",
                "LEFT_WITHIN_30D",
                "RETAINED_90D",
                "RETAINED_180D",
                "TERMINATED",
                name="retention_status",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'ACTIVE'"),
            index=True,
        ),
        sa.Column("contract_fulfillment_score", sa.Float(), nullable=True),
        sa.Column("employer_satisfaction_rating", sa.Integer(), nullable=True),
        sa.Column("employer_feedback_notes", sa.Text(), nullable=True),
        sa.Column(
            "verified_by_employer",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
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

    # 3. Create placement_training_attributions table
    op.create_table(
        "placement_training_attributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "placement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("placement_outcomes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "enrollment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("enrollments.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "provider_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.UniqueConstraint("placement_id", "course_id", name="uq_placement_course_attribution"),
    )

    # 4. Create provider_performance_snapshots table
    op.create_table(
        "provider_performance_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "provider_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("total_enrolled", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("total_completed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("total_placed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("completion_rate", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("placement_rate", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("retention_rate_90d", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("average_starting_salary", sa.Float(), nullable=True),
        sa.Column("average_employer_rating", sa.Float(), nullable=True),
        sa.Column(
            "ppi_score", sa.Float(), nullable=False, server_default=sa.text("0.0"), index=True
        ),
        sa.Column(
            "ppi_tier",
            postgresql.ENUM(
                "TIER_1_EXCELLENT",
                "TIER_2_PROFICIENT",
                "TIER_3_DEVELOPING",
                "TIER_4_NEEDS_IMPROVEMENT",
                name="ppi_tier",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'TIER_3_DEVELOPING'"),
        ),
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
        sa.UniqueConstraint(
            "provider_id", "period_start", "period_end", name="uq_provider_period_snapshot"
        ),
    )


def downgrade() -> None:
    # 1. Drop tables in reverse order
    op.drop_table("provider_performance_snapshots")
    op.drop_table("placement_training_attributions")
    op.drop_table("placement_outcomes")

    # 2. Drop enums
    op.execute("DROP TYPE IF EXISTS ppi_tier CASCADE")
    op.execute("DROP TYPE IF EXISTS retention_status CASCADE")

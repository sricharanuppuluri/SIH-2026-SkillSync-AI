"""Verified skill passport, skill evidence, and passport sharing schema

Revision ID: 0010_verified_skill_passport
Revises: 0009_training_curriculum
Create Date: 2026-09-06 22:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0010_verified_skill_passport"
down_revision: str | None = "0009_training_curriculum"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create Enums
    evidence_type_enum = postgresql.ENUM(
        "COURSE_COMPLETION",
        "CANDIDATE_DECLARATION",
        "RESUME_EXTRACTION",
        "CERTIFICATION",
        "ASSESSMENT",
        name="evidence_type",
        create_type=False,
    )
    evidence_type_enum.create(op.get_bind(), checkfirst=True)

    evidence_status_enum = postgresql.ENUM(
        "VALID",
        "REVOKED",
        "EXPIRED",
        name="evidence_status",
        create_type=False,
    )
    evidence_status_enum.create(op.get_bind(), checkfirst=True)

    verification_status_enum = postgresql.ENUM(
        "VERIFIED",
        "UNVERIFIED",
        "EXPIRED",
        "REJECTED",
        name="verification_status",
        create_type=False,
    )
    verification_status_enum.create(op.get_bind(), checkfirst=True)

    verification_method_enum = postgresql.ENUM(
        "COURSE_COMPLETION",
        "CERTIFICATION",
        "ASSESSMENT",
        "CANDIDATE_DECLARATION",
        "RESUME_EXTRACTION",
        "NONE",
        name="verification_method",
        create_type=False,
    )
    verification_method_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create skill_evidence table
    op.create_table(
        "skill_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "evidence_type",
            postgresql.ENUM(
                "COURSE_COMPLETION",
                "CANDIDATE_DECLARATION",
                "RESUME_EXTRACTION",
                "CERTIFICATION",
                "ASSESSMENT",
                name="evidence_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.String(500), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "VALID",
                "REVOKED",
                "EXPIRED",
                name="evidence_status",
                create_type=False,
            ),
            server_default="VALID",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "candidate_id",
            "skill_id",
            "evidence_type",
            "source_id",
            name="uq_skill_evidence_source",
        ),
    )
    op.create_index("ix_skill_evidence_candidate_id", "skill_evidence", ["candidate_id"])
    op.create_index("ix_skill_evidence_skill_id", "skill_evidence", ["skill_id"])
    op.create_index("ix_skill_evidence_evidence_type", "skill_evidence", ["evidence_type"])
    op.create_index("ix_skill_evidence_source_id", "skill_evidence", ["source_id"])
    op.create_index("ix_skill_evidence_status", "skill_evidence", ["status"])
    op.create_index(
        "ix_skill_evidence_candidate_skill", "skill_evidence", ["candidate_id", "skill_id"]
    )
    op.create_index(
        "ix_skill_evidence_candidate_type", "skill_evidence", ["candidate_id", "evidence_type"]
    )

    # 3. Create verified_skills table
    op.create_table(
        "verified_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "verification_status",
            postgresql.ENUM(
                "VERIFIED",
                "UNVERIFIED",
                "EXPIRED",
                "REJECTED",
                name="verification_status",
                create_type=False,
            ),
            server_default="UNVERIFIED",
            nullable=False,
        ),
        sa.Column(
            "verification_method",
            postgresql.ENUM(
                "COURSE_COMPLETION",
                "CERTIFICATION",
                "ASSESSMENT",
                "CANDIDATE_DECLARATION",
                "RESUME_EXTRACTION",
                "NONE",
                name="verification_method",
                create_type=False,
            ),
            server_default="NONE",
            nullable=False,
        ),
        sa.Column("verification_score", sa.Float(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verification_summary", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_verified_skill"),
    )
    op.create_index("ix_verified_skills_candidate_id", "verified_skills", ["candidate_id"])
    op.create_index("ix_verified_skills_skill_id", "verified_skills", ["skill_id"])
    op.create_index(
        "ix_verified_skills_verification_status", "verified_skills", ["verification_status"]
    )
    op.create_index(
        "ix_verified_skills_verification_method", "verified_skills", ["verification_method"]
    )
    op.create_index(
        "ix_verified_skills_cand_status",
        "verified_skills",
        ["candidate_id", "verification_status"],
    )

    # 4. Create skill_passport_shares table
    op.create_table(
        "skill_passport_shares",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("share_token", sa.String(64), unique=True, nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_skill_passport_shares_candidate_id", "skill_passport_shares", ["candidate_id"]
    )
    op.create_index(
        "ix_skill_passport_shares_share_token", "skill_passport_shares", ["share_token"]
    )


def downgrade() -> None:
    # 1. Drop tables
    op.drop_table("skill_passport_shares")
    op.drop_table("verified_skills")
    op.drop_table("skill_evidence")

    # 2. Drop enums
    sa.Enum(name="verification_method").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="verification_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="evidence_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="evidence_type").drop(op.get_bind(), checkfirst=True)

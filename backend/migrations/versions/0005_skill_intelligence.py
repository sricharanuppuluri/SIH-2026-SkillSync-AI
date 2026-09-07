"""Skill intelligence canonical taxonomy, aliases, and relationships

Revision ID: 0005_skill_intelligence
Revises: 0004_employer_module
Create Date: 2026-09-06 17:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0005_skill_intelligence"
down_revision: str | None = "0004_employer_module"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

skill_type_enum = postgresql.ENUM(
    "TECHNICAL",
    "SOFT",
    "DOMAIN",
    "TOOL",
    "CERTIFICATION",
    "OTHER",
    name="skill_type",
    create_type=False,
)

skill_status_enum = postgresql.ENUM(
    "ACTIVE",
    "INACTIVE",
    name="skill_status",
    create_type=False,
)

skill_relationship_type_enum = postgresql.ENUM(
    "RELATED",
    "PREREQUISITE",
    "COMPLEMENTARY",
    name="skill_relationship_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    skill_type_enum.create(bind, checkfirst=True)
    skill_status_enum.create(bind, checkfirst=True)
    skill_relationship_type_enum.create(bind, checkfirst=True)

    # 1. Add new columns to skills table
    op.add_column(
        "skills",
        sa.Column("slug", sa.String(120), nullable=True),
    )
    op.add_column(
        "skills",
        sa.Column("subcategory", sa.String(100), nullable=True),
    )
    op.add_column(
        "skills",
        sa.Column(
            "skill_type",
            skill_type_enum,
            nullable=False,
            server_default="TECHNICAL",
        ),
    )
    op.add_column(
        "skills",
        sa.Column(
            "status",
            skill_status_enum,
            nullable=False,
            server_default="ACTIVE",
        ),
    )
    op.add_column(
        "skills",
        sa.Column(
            "parent_skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # 2. Deterministic backfill of slug for any existing skill rows
    op.execute(
        sa.text(
            """
            UPDATE skills
            SET slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
            WHERE slug IS NULL
            """
        )
    )

    # Ensure no empty slug from backfill
    op.execute(
        sa.text(
            """
            UPDATE skills
            SET slug = lower(normalized_name)
            WHERE slug IS NULL OR slug = ''
            """
        )
    )

    # Alter slug to nullable=False and add unique index
    op.alter_column("skills", "slug", nullable=False)
    op.create_index(op.f("ix_skills_slug"), "skills", ["slug"], unique=True)
    op.create_index(op.f("ix_skills_subcategory"), "skills", ["subcategory"], unique=False)
    op.create_index(op.f("ix_skills_skill_type"), "skills", ["skill_type"], unique=False)
    op.create_index(op.f("ix_skills_status"), "skills", ["status"], unique=False)
    op.create_index(op.f("ix_skills_parent_skill_id"), "skills", ["parent_skill_id"], unique=False)

    # 3. Create skill_aliases table
    op.create_table(
        "skill_aliases",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("alias", sa.String(100), nullable=False),
        sa.Column("normalized_alias", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_skill_aliases_skill_id"), "skill_aliases", ["skill_id"], unique=False)
    op.create_index(
        op.f("ix_skill_aliases_normalized_alias"),
        "skill_aliases",
        ["normalized_alias"],
        unique=True,
    )

    # 4. Create skill_relationships table
    op.create_table(
        "skill_relationships",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "source_skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "relationship_type",
            skill_relationship_type_enum,
            nullable=False,
            server_default="RELATED",
        ),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source_skill_id != target_skill_id",
            name="ck_skill_relationships_no_self_loop",
        ),
        sa.CheckConstraint(
            "weight >= 0.1 AND weight <= 2.0",
            name="ck_skill_relationships_weight_range",
        ),
        sa.UniqueConstraint(
            "source_skill_id",
            "target_skill_id",
            "relationship_type",
            name="uq_skill_relationships_source_target_type",
        ),
    )
    op.create_index(
        op.f("ix_skill_relationships_source_skill_id"),
        "skill_relationships",
        ["source_skill_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_skill_relationships_target_skill_id"),
        "skill_relationships",
        ["target_skill_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_skill_relationships_relationship_type"),
        "skill_relationships",
        ["relationship_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("skill_relationships")
    op.drop_table("skill_aliases")

    op.drop_index(op.f("ix_skills_parent_skill_id"), table_name="skills")
    op.drop_index(op.f("ix_skills_status"), table_name="skills")
    op.drop_index(op.f("ix_skills_skill_type"), table_name="skills")
    op.drop_index(op.f("ix_skills_subcategory"), table_name="skills")
    op.drop_index(op.f("ix_skills_slug"), table_name="skills")

    op.drop_column("skills", "parent_skill_id")
    op.drop_column("skills", "status")
    op.drop_column("skills", "skill_type")
    op.drop_column("skills", "subcategory")
    op.drop_column("skills", "slug")

    bind = op.get_bind()
    skill_relationship_type_enum.drop(bind, checkfirst=True)
    skill_status_enum.drop(bind, checkfirst=True)
    skill_type_enum.drop(bind, checkfirst=True)

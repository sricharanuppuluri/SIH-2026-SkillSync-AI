"""Embeddings and semantic skill matching table

Revision ID: 0007_embeddings_semantic_matching
Revises: 0006_candidate_module
Create Date: 2026-09-06 20:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0007_skill_embeddings"
down_revision: str | None = "0006_candidate_module"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create skill_embeddings table using ARRAY(Float) for universal cross-platform support
    op.create_table(
        "skill_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("embedding", postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column(
            "model_name",
            sa.String(100),
            nullable=False,
            server_default="sentence-transformers/all-MiniLM-L6-v2",
        ),
        sa.Column(
            "embedding_dimension",
            sa.Integer(),
            nullable=False,
            server_default="384",
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
        sa.UniqueConstraint("skill_id", "model_name", name="uq_skill_embedding_model"),
    )

    # 2. Indexes
    op.create_index(
        "ix_skill_embeddings_skill_id",
        "skill_embeddings",
        ["skill_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_skill_embeddings_skill_id", table_name="skill_embeddings")
    op.drop_table("skill_embeddings")

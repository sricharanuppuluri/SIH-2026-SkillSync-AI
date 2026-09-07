"""AI Career Copilot conversation and message persistence tables

Revision ID: 0008_copilot_conversations
Revises: 0007_skill_embeddings
Create Date: 2026-09-06 21:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_copilot_conversations"
down_revision: str | None = "0007_skill_embeddings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create copilot_conversations table
    op.create_table(
        "copilot_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "title",
            sa.String(255),
            nullable=False,
            server_default="Career Discussion",
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

    op.create_index(
        "ix_copilot_conversations_candidate_id",
        "copilot_conversations",
        ["candidate_id"],
    )
    op.create_index(
        "ix_copilot_conversations_job_id",
        "copilot_conversations",
        ["job_id"],
    )

    # 2. Create copilot_messages table
    op.create_table(
        "copilot_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("copilot_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("structured_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
        "ix_copilot_messages_conversation_id",
        "copilot_messages",
        ["conversation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_copilot_messages_conversation_id", table_name="copilot_messages")
    op.drop_table("copilot_messages")
    op.drop_index("ix_copilot_conversations_job_id", table_name="copilot_conversations")
    op.drop_index("ix_copilot_conversations_candidate_id", table_name="copilot_conversations")
    op.drop_table("copilot_conversations")

"""Employer module job_status lifecycle enum and column

Revision ID: 0004_employer_module
Revises: 0003_domain_foundation
Create Date: 2026-09-06 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_employer_module"
down_revision: str | None = "0003_domain_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

job_status_enum = postgresql.ENUM(
    "DRAFT",
    "PUBLISHED",
    "CLOSED",
    name="job_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    job_status_enum.create(bind, checkfirst=True)

    op.add_column(
        "jobs",
        sa.Column(
            "status",
            job_status_enum,
            nullable=False,
            server_default="PUBLISHED",
        ),
    )
    op.create_index(op.f("ix_jobs_status"), "jobs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_jobs_status"), table_name="jobs")
    op.drop_column("jobs", "status")

    bind = op.get_bind()
    job_status_enum.drop(bind, checkfirst=True)

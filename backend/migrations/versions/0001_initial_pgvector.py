"""Initialize pgvector extension

Revision ID: 0001_initial_pgvector
Revises:
Create Date: 2026-09-06 08:30:00.000000

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0001_initial_pgvector'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enable pgvector extension if available in the PostgreSQL environment
    from sqlalchemy import text

    bind = op.get_bind()
    try:
        check_sql = text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
        has_vector = bind.execute(check_sql).scalar()
        if has_vector:
            bind.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        else:
            print("[NOTE] pgvector extension not present in local PostgreSQL instance.")
    except Exception as e:
        print(f"[NOTE] pgvector check note: {e}")


def downgrade() -> None:
    from sqlalchemy import text
    bind = op.get_bind()
    try:
        bind.execute(text("DROP EXTENSION IF EXISTS vector;"))
    except Exception as e:
        print(f"[NOTE] pgvector drop extension note: {e}")

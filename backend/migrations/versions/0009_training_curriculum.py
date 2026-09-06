"""Training provider curriculum and course management tables and columns

Revision ID: 0009_training_curriculum
Revises: 0008_copilot_conversations
Create Date: 2026-09-06 22:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0009_training_curriculum"
down_revision: str | None = "0008_copilot_conversations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create Enums
    course_status_enum = postgresql.ENUM(
        "DRAFT", "PUBLISHED", "CLOSED", name="course_status", create_type=False
    )
    course_status_enum.create(op.get_bind(), checkfirst=True)

    course_difficulty_enum = postgresql.ENUM(
        "BEGINNER", "INTERMEDIATE", "ADVANCED", name="course_difficulty", create_type=False
    )
    course_difficulty_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add columns to courses
    op.add_column("courses", sa.Column("category", sa.String(100), nullable=True))
    op.add_column(
        "courses",
        sa.Column(
            "difficulty",
            postgresql.ENUM(
                "BEGINNER", "INTERMEDIATE", "ADVANCED", name="course_difficulty", create_type=False
            ),
            nullable=False,
            server_default="INTERMEDIATE",
        ),
    )
    op.add_column(
        "courses",
        sa.Column(
            "status",
            postgresql.ENUM(
                "DRAFT", "PUBLISHED", "CLOSED", name="course_status", create_type=False
            ),
            nullable=False,
            server_default="DRAFT",
        ),
    )
    op.add_column("courses", sa.Column("location_state", sa.String(100), nullable=True))
    op.add_column("courses", sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("courses", sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "courses", sa.Column("enrollment_deadline", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_index("ix_courses_category", "courses", ["category"])
    op.create_index("ix_courses_status", "courses", ["status"])

    # 3. Add description column to training_provider_profiles
    op.add_column("training_provider_profiles", sa.Column("description", sa.Text(), nullable=True))

    # 4. Create curriculum_modules table
    op.create_table(
        "curriculum_modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="1"),
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
    op.create_index("ix_curriculum_modules_course_id", "curriculum_modules", ["course_id"])

    # 5. Create curriculum_lessons table
    op.create_table(
        "curriculum_lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "module_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_modules.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="1"),
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
    op.create_index("ix_curriculum_lessons_module_id", "curriculum_lessons", ["module_id"])

    # 6. Create enrollment_lesson_progress table
    op.create_table(
        "enrollment_lesson_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "enrollment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("enrollments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_lessons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("enrollment_id", "lesson_id", name="uq_enrollment_lesson_progress"),
    )
    op.create_index(
        "ix_enrollment_lesson_progress_enrollment_id",
        "enrollment_lesson_progress",
        ["enrollment_id"],
    )
    op.create_index(
        "ix_enrollment_lesson_progress_lesson_id",
        "enrollment_lesson_progress",
        ["lesson_id"],
    )


def downgrade() -> None:
    # 1. Drop enrollment_lesson_progress table
    op.drop_index(
        "ix_enrollment_lesson_progress_lesson_id", table_name="enrollment_lesson_progress"
    )
    op.drop_index(
        "ix_enrollment_lesson_progress_enrollment_id", table_name="enrollment_lesson_progress"
    )
    op.drop_table("enrollment_lesson_progress")

    # 2. Drop curriculum_lessons table
    op.drop_index("ix_curriculum_lessons_module_id", table_name="curriculum_lessons")
    op.drop_table("curriculum_lessons")

    # 3. Drop curriculum_modules table
    op.drop_index("ix_curriculum_modules_course_id", table_name="curriculum_modules")
    op.drop_table("curriculum_modules")

    # 4. Drop training_provider_profiles.description
    op.drop_column("training_provider_profiles", "description")

    # 5. Drop courses columns and indexes
    op.drop_index("ix_courses_status", table_name="courses")
    op.drop_index("ix_courses_category", table_name="courses")
    op.drop_column("courses", "enrollment_deadline")
    op.drop_column("courses", "end_date")
    op.drop_column("courses", "start_date")
    op.drop_column("courses", "location_state")
    op.drop_column("courses", "status")
    op.drop_column("courses", "difficulty")
    op.drop_column("courses", "category")

    # 6. Drop Enums
    sa.Enum(name="course_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="course_difficulty").drop(op.get_bind(), checkfirst=True)

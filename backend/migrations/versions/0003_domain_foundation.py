"""Domain foundation models, relations, indexes, and enums

Revision ID: 0003_domain_foundation
Revises: 0002_create_users_table
Create Date: 2026-09-06 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_domain_foundation"
down_revision: str | None = "0002_create_users_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum definitions
employment_type_enum = postgresql.ENUM(
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "INTERNSHIP",
    name="employment_type",
    create_type=False,
)
experience_level_enum = postgresql.ENUM(
    "ENTRY",
    "MID",
    "SENIOR",
    "LEAD",
    name="experience_level",
    create_type=False,
)
proficiency_level_enum = postgresql.ENUM(
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
    name="proficiency_level",
    create_type=False,
)
course_mode_enum = postgresql.ENUM(
    "ONLINE",
    "OFFLINE",
    "HYBRID",
    name="course_mode",
    create_type=False,
)
application_status_enum = postgresql.ENUM(
    "APPLIED",
    "SHORTLISTED",
    "INTERVIEW",
    "OFFERED",
    "REJECTED",
    "HIRED",
    name="application_status",
    create_type=False,
)
enrollment_status_enum = postgresql.ENUM(
    "ENROLLED",
    "IN_PROGRESS",
    "COMPLETED",
    "DROPPED",
    name="enrollment_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Create Enums
    employment_type_enum.create(bind, checkfirst=True)
    experience_level_enum.create(bind, checkfirst=True)
    proficiency_level_enum.create(bind, checkfirst=True)
    course_mode_enum.create(bind, checkfirst=True)
    application_status_enum.create(bind, checkfirst=True)
    enrollment_status_enum.create(bind, checkfirst=True)

    # 2. Candidate Profiles
    op.create_table(
        "candidate_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("headline", sa.String(length=255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("experience_years", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("education_level", sa.String(length=100), nullable=True),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", name="uq_candidate_profiles_user_id"),
    )
    op.create_index(
        op.f("ix_candidate_profiles_user_id"), "candidate_profiles", ["user_id"], unique=True
    )
    op.create_index(
        op.f("ix_candidate_profiles_location_city"),
        "candidate_profiles",
        ["location_city"],
        unique=False,
    )
    op.create_index(
        op.f("ix_candidate_profiles_location_state"),
        "candidate_profiles",
        ["location_state"],
        unique=False,
    )

    # 3. Employer Profiles
    op.create_table(
        "employer_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("company_description", sa.Text(), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=100), nullable=True),
        sa.Column("website_url", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", name="uq_employer_profiles_user_id"),
    )
    op.create_index(
        op.f("ix_employer_profiles_user_id"), "employer_profiles", ["user_id"], unique=True
    )
    op.create_index(
        op.f("ix_employer_profiles_company_name"),
        "employer_profiles",
        ["company_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_employer_profiles_industry"), "employer_profiles", ["industry"], unique=False
    )

    # 4. Training Provider Profiles
    op.create_table(
        "training_provider_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("institution_name", sa.String(length=255), nullable=False),
        sa.Column("provider_type", sa.String(length=100), nullable=True),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=100), nullable=True),
        sa.Column("website_url", sa.String(length=255), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", name="uq_training_provider_profiles_user_id"),
    )
    op.create_index(
        op.f("ix_training_provider_profiles_user_id"),
        "training_provider_profiles",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_training_provider_profiles_institution_name"),
        "training_provider_profiles",
        ["institution_name"],
        unique=False,
    )

    # 5. Government Profiles
    op.create_table(
        "government_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("department_name", sa.String(length=255), nullable=False),
        sa.Column("jurisdiction", sa.String(length=100), nullable=True),
        sa.Column("designation", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", name="uq_government_profiles_user_id"),
    )
    op.create_index(
        op.f("ix_government_profiles_user_id"), "government_profiles", ["user_id"], unique=True
    )

    # 6. Skills
    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("normalized_name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False, server_default="General"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_skills_normalized_name"), "skills", ["normalized_name"], unique=True)
    op.create_index(op.f("ix_skills_category"), "skills", ["category"], unique=False)

    # 7. Jobs
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "employer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employer_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=100), nullable=True),
        sa.Column("is_remote", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "employment_type", employment_type_enum, nullable=False, server_default="FULL_TIME"
        ),
        sa.Column("experience_level", experience_level_enum, nullable=False, server_default="MID"),
        sa.Column("salary_min", sa.Float(), nullable=True),
        sa.Column("salary_max", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_jobs_employer_id"), "jobs", ["employer_id"], unique=False)
    op.create_index(op.f("ix_jobs_title"), "jobs", ["title"], unique=False)

    # 8. Job Skills
    op.create_table(
        "job_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "minimum_proficiency",
            sa.String(length=50),
            nullable=False,
            server_default="INTERMEDIATE",
        ),
        sa.Column("weight", sa.Float(), nullable=False, server_default=sa.text("1.0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),
    )

    # 9. Candidate Skills
    op.create_table(
        "candidate_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
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
            "proficiency", proficiency_level_enum, nullable=False, server_default="INTERMEDIATE"
        ),
        sa.Column("years_experience", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
    )

    # 10. Courses
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "provider_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_provider_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("duration_hours", sa.Integer(), nullable=False, server_default=sa.text("40")),
        sa.Column("mode", course_mode_enum, nullable=False, server_default="ONLINE"),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(op.f("ix_courses_provider_id"), "courses", ["provider_id"], unique=False)
    op.create_index(op.f("ix_courses_title"), "courses", ["title"], unique=False)

    # 11. Course Skills
    op.create_table(
        "course_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("course_id", "skill_id", name="uq_course_skill"),
    )

    # 12. Applications
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", application_status_enum, nullable=False, server_default="APPLIED"),
        sa.Column("cover_note", sa.Text(), nullable=True),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job_application"),
    )

    # 13. Enrollments
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", enrollment_status_enum, nullable=False, server_default="ENROLLED"),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("candidate_id", "course_id", name="uq_candidate_course_enrollment"),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("enrollments")
    op.drop_table("applications")
    op.drop_table("course_skills")
    op.drop_table("courses")
    op.drop_table("candidate_skills")
    op.drop_table("job_skills")
    op.drop_table("jobs")
    op.drop_table("skills")
    op.drop_table("government_profiles")
    op.drop_table("training_provider_profiles")
    op.drop_table("employer_profiles")
    op.drop_table("candidate_profiles")

    bind = op.get_bind()
    enrollment_status_enum.drop(bind, checkfirst=True)
    application_status_enum.drop(bind, checkfirst=True)
    course_mode_enum.drop(bind, checkfirst=True)
    proficiency_level_enum.drop(bind, checkfirst=True)
    experience_level_enum.drop(bind, checkfirst=True)
    employment_type_enum.drop(bind, checkfirst=True)

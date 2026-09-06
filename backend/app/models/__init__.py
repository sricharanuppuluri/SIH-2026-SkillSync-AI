"""SQLAlchemy models package exporting all domain entities and enums."""

from app.models.application import Application, ApplicationStatus
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.course import Course, CourseMode, CourseSkill
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill, JobStatus
from app.models.profiles import (
    CandidateProfile,
    EmployerProfile,
    GovernmentProfile,
    TrainingProviderProfile,
)
from app.models.skill import (
    Skill,
    SkillAlias,
    SkillRelationship,
    SkillRelationshipType,
    SkillStatus,
    SkillType,
)
from app.models.user import User, UserRole

__all__ = [
    "Application",
    "ApplicationStatus",
    "Base",
    "CandidateProfile",
    "CandidateSkill",
    "Course",
    "CourseMode",
    "CourseSkill",
    "EmployerProfile",
    "EmploymentType",
    "Enrollment",
    "EnrollmentStatus",
    "ExperienceLevel",
    "GovernmentProfile",
    "Job",
    "JobSkill",
    "JobStatus",
    "ProficiencyLevel",
    "Skill",
    "SkillAlias",
    "SkillRelationship",
    "SkillRelationshipType",
    "SkillStatus",
    "SkillType",
    "TimestampMixin",
    "TrainingProviderProfile",
    "UUIDPrimaryKeyMixin",
    "User",
    "UserRole",
]

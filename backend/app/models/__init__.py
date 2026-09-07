"""SQLAlchemy models package exporting all domain entities and enums."""

from app.models.application import Application, ApplicationStatus
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.candidate_education import CandidateEducation
from app.models.candidate_experience import CandidateExperience
from app.models.candidate_skill import CandidateSkill, ProficiencyLevel
from app.models.copilot_conversation import CopilotConversation, CopilotMessage
from app.models.course import Course, CourseDifficulty, CourseMode, CourseSkill, CourseStatus
from app.models.curriculum import CurriculumLesson, CurriculumModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.enrollment_progress import EnrollmentLessonProgress
from app.models.job import EmploymentType, ExperienceLevel, Job, JobSkill, JobStatus
from app.models.passport_share import SkillPassportShare
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
from app.models.skill_embedding import SkillEmbedding
from app.models.skill_evidence import EvidenceStatus, EvidenceType, SkillEvidence
from app.models.user import User, UserRole
from app.models.verified_skill import VerificationMethod, VerificationStatus, VerifiedSkill

__all__ = [
    "Application",
    "ApplicationStatus",
    "Base",
    "CandidateEducation",
    "CandidateExperience",
    "CandidateProfile",
    "CandidateSkill",
    "CopilotConversation",
    "CopilotMessage",
    "Course",
    "CourseDifficulty",
    "CourseMode",
    "CourseSkill",
    "CourseStatus",
    "CurriculumLesson",
    "CurriculumModule",
    "EmployerProfile",
    "EmploymentType",
    "Enrollment",
    "EnrollmentLessonProgress",
    "EnrollmentStatus",
    "EvidenceStatus",
    "EvidenceType",
    "ExperienceLevel",
    "GovernmentProfile",
    "Job",
    "JobSkill",
    "JobStatus",
    "ProficiencyLevel",
    "Skill",
    "SkillAlias",
    "SkillEmbedding",
    "SkillEvidence",
    "SkillPassportShare",
    "SkillRelationship",
    "SkillRelationshipType",
    "SkillStatus",
    "SkillType",
    "TimestampMixin",
    "TrainingProviderProfile",
    "UUIDPrimaryKeyMixin",
    "User",
    "UserRole",
    "VerificationMethod",
    "VerificationStatus",
    "VerifiedSkill",
]

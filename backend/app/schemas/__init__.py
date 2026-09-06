"""Pydantic schemas package."""

from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.schemas.auth import (
    TokenPayload,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.schemas.course import (
    CourseCreate,
    CourseResponse,
    CourseSkillRequirement,
    CourseSkillResponse,
    CourseUpdate,
)
from app.schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentResponse,
    EnrollmentUpdate,
)
from app.schemas.health import HealthResponse
from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobSkillRequirement,
    JobSkillResponse,
    JobUpdate,
)
from app.schemas.profiles import (
    CandidateProfileCreate,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    EmployerProfileCreate,
    EmployerProfileResponse,
    EmployerProfileUpdate,
    GovernmentProfileCreate,
    GovernmentProfileResponse,
    GovernmentProfileUpdate,
    TrainingProviderProfileCreate,
    TrainingProviderProfileResponse,
    TrainingProviderProfileUpdate,
)
from app.schemas.skill import (
    SkillCreate,
    SkillResponse,
    SkillUpdate,
)

__all__ = [
    "ApplicationCreate",
    "ApplicationResponse",
    "ApplicationUpdate",
    "CandidateProfileCreate",
    "CandidateProfileResponse",
    "CandidateProfileUpdate",
    "CourseCreate",
    "CourseResponse",
    "CourseSkillRequirement",
    "CourseSkillResponse",
    "CourseUpdate",
    "EmployerProfileCreate",
    "EmployerProfileResponse",
    "EmployerProfileUpdate",
    "EnrollmentCreate",
    "EnrollmentResponse",
    "EnrollmentUpdate",
    "GovernmentProfileCreate",
    "GovernmentProfileResponse",
    "GovernmentProfileUpdate",
    "HealthResponse",
    "JobCreate",
    "JobResponse",
    "JobSkillRequirement",
    "JobSkillResponse",
    "JobUpdate",
    "SkillCreate",
    "SkillResponse",
    "SkillUpdate",
    "TokenPayload",
    "TokenResponse",
    "TrainingProviderProfileCreate",
    "TrainingProviderProfileResponse",
    "TrainingProviderProfileUpdate",
    "UserLoginRequest",
    "UserRegisterRequest",
    "UserResponse",
]

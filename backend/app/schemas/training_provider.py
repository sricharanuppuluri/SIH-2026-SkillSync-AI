"""Training Provider dashboard and management Pydantic schemas."""

from pydantic import BaseModel, Field

from app.schemas.course import CourseResponse
from app.schemas.enrollment import EnrollmentCandidateInfo


class TrainingProviderDashboardMetrics(BaseModel):
    """Live database aggregate statistics for a training provider."""

    total_courses: int = 0
    draft_courses: int = 0
    published_courses: int = 0
    closed_courses: int = 0
    total_enrollments: int = 0
    active_enrollments: int = 0
    completed_enrollments: int = 0
    total_capacity: int = 0
    remaining_capacity: int = 0


class TrainingProviderDashboardResponse(BaseModel):
    """Comprehensive dashboard payload for training providers."""

    metrics: TrainingProviderDashboardMetrics
    recent_courses: list[CourseResponse] = Field(default_factory=list)
    recent_enrollments: list[EnrollmentCandidateInfo] = Field(default_factory=list)

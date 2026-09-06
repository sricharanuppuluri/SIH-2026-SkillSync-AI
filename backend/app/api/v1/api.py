"""Central API v1 router mounting all sub-module routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    candidate,
    candidate_learning,
    copilot,
    courses,
    employer,
    health,
    jobs,
    passport,
    profiles,
    rbac_test,
    skills,
    training_provider,
)

api_router = APIRouter()

# Phase 0: System Health & Diagnostics
api_router.include_router(health.router, tags=["Health"])

# Phase 2: Authentication & RBAC
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rbac_test.router, tags=["RBAC Verification"])

# Phase 3: Core Domain Foundation Endpoints
api_router.include_router(skills.router, prefix="/skills", tags=["Skills Taxonomy"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(courses.router, prefix="/courses", tags=["Courses"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])

# Phase 4: Employer Module Endpoints
api_router.include_router(employer.router, prefix="/employer", tags=["Employer Module"])

# Phase 7: Candidate Module Endpoints
api_router.include_router(candidate.router, prefix="/candidate", tags=["Candidate Module"])

# Phase 10: AI Career Copilot Endpoints
api_router.include_router(copilot.router, prefix="/candidate/copilot", tags=["AI Career Copilot"])

# Phase 11: Training Provider & Curriculum Module Endpoints
api_router.include_router(
    training_provider.router, prefix="/training-provider", tags=["Training Provider Module"]
)
api_router.include_router(
    candidate_learning.router, prefix="/candidate/learning", tags=["Candidate Learning Module"]
)

# Phase 12: Verified Skill Passport Endpoints
api_router.include_router(passport.router, tags=["Verified Skill Passport"])

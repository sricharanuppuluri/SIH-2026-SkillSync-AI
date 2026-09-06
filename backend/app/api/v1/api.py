"""Central API v1 router mounting all sub-module routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    courses,
    health,
    jobs,
    profiles,
    rbac_test,
    skills,
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

"""Central API v1 router mounting all sub-module routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

# Phase 0: System Health & Diagnostics
api_router.include_router(health.router, tags=["Health"])

# Future Phase Modules (Ready to be mounted):
# api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & RBAC"])
# api_router.include_router(jobs.router, prefix="/jobs", tags=["Employer Jobs"])
# api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidate Profiles"])
# api_router.include_router(skills.router, prefix="/skills", tags=["Skill Taxonomy"])
# api_router.include_router(matching.router, prefix="/matching", tags=["Matching Engine"])
# api_router.include_router(copilot.router, prefix="/copilot", tags=["Career Copilot"])
# api_router.include_router(curriculum.router, prefix="/curriculum", tags=["Curriculum Optimizer"])
# api_router.include_router(demand.router, prefix="/demand", tags=["Demand Forecasting"])
# api_router.include_router(passport.router, prefix="/passport", tags=["Skill Passport"])
# api_router.include_router(outcomes.router, prefix="/outcomes", tags=["Outcome Intelligence"])

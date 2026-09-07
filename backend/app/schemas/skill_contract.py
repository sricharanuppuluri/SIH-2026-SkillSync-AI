"""Pydantic validation schemas for Employer Skill Contracts."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.candidate_skill import ProficiencyLevel
from app.models.skill import SkillType
from app.models.skill_contract import (
    ContractEvidenceType,
    ContractRequirementImportance,
    ContractRequirementType,
    ContractStatus,
)


class SkillContractRequirementBase(BaseModel):
    """Base definition of a skill requirement within a contract."""

    skill_id: uuid.UUID = Field(..., description="Canonical Skill ID from skills taxonomy")
    required_proficiency: ProficiencyLevel = Field(
        default=ProficiencyLevel.INTERMEDIATE,
        description="Minimum expected proficiency level",
    )
    requirement_type: ContractRequirementType = Field(
        default=ContractRequirementType.REQUIRED,
        description="REQUIRED or PREFERRED distinction",
    )
    importance: ContractRequirementImportance = Field(
        default=ContractRequirementImportance.HIGH,
        description="Priority weighting (LOW, MEDIUM, HIGH, CRITICAL)",
    )
    minimum_experience_months: int = Field(
        default=0,
        ge=0,
        le=600,
        description="Minimum practical experience required in months",
    )
    evidence_type: ContractEvidenceType = Field(
        default=ContractEvidenceType.NONE,
        description="Expected verification proof standard",
    )
    notes: str | None = Field(
        None,
        max_length=1000,
        description="Employer context or qualification notes",
    )


class SkillContractRequirementCreate(SkillContractRequirementBase):
    """Payload to create or add a skill requirement to a contract."""

    pass


class SkillContractRequirementResponse(SkillContractRequirementBase):
    """Full read schema for a contract skill requirement."""

    id: uuid.UUID
    contract_id: uuid.UUID
    skill_name: str
    skill_slug: str
    skill_category: str | None = None
    skill_type: SkillType = SkillType.TECHNICAL
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillContractCreate(BaseModel):
    """Payload to draft a new Skill Contract for a job requisition."""

    job_id: uuid.UUID = Field(..., description="Target Job Requisition ID")
    title: str | None = Field(None, max_length=255, description="Descriptive contract title")
    description: str | None = Field(None, max_length=2000, description="Detailed competency notes")
    requirements: list[SkillContractRequirementCreate] = Field(
        default_factory=list,
        max_length=50,
        description="List of canonical skill requirements",
    )


class SkillContractUpdate(BaseModel):
    """Payload to update an existing DRAFT Skill Contract."""

    title: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=2000)
    requirements: list[SkillContractRequirementCreate] | None = Field(
        None,
        max_length=50,
        description="Updated canonical skill requirements (replaces list if provided)",
    )


class ContractQualityResponse(BaseModel):
    """Deterministic quality and completeness assessment for a Skill Contract."""

    contract_id: uuid.UUID
    score: int = Field(..., ge=0, le=100, description="Quality completeness score 0-100")
    rating: str = Field(..., description="EXCELLENT, GOOD, MODERATE, or NEEDS_IMPROVEMENT")
    breakdown: dict[str, int] = Field(
        default_factory=dict,
        description="Points breakdown across quality dimensions",
    )
    explanations: list[str] = Field(
        default_factory=list,
        description="Deterministic assessment feedback messages",
    )


class SkillContractResponse(BaseModel):
    """Complete Skill Contract response schema."""

    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    employer_id: uuid.UUID
    employer_name: str | None = None
    version: int
    status: ContractStatus
    title: str | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    effective_at: datetime | None = None
    archived_at: datetime | None = None
    requirements: list[SkillContractRequirementResponse] = Field(default_factory=list)
    requirements_count: int = 0
    quality_score: int | None = None

    model_config = ConfigDict(from_attributes=True)


class SkillContractSummary(BaseModel):
    """Lightweight summary schema for contract listings."""

    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    version: int
    status: ContractStatus
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    effective_at: datetime | None = None
    archived_at: datetime | None = None
    requirements_count: int = 0
    required_count: int = 0
    preferred_count: int = 0
    quality_score: int | None = None

    model_config = ConfigDict(from_attributes=True)


class ContractSkillInsight(BaseModel):
    """Skill intelligence and demand/supply context for a contract skill requirement."""

    skill_id: uuid.UUID
    skill_name: str
    category: str | None = None
    skill_type: SkillType
    requirement_type: ContractRequirementType
    required_proficiency: ProficiencyLevel
    importance: ContractRequirementImportance
    evidence_type: ContractEvidenceType
    minimum_experience_months: int
    current_demand: int = 0
    verified_supply: int = 0
    shortage_category: str = "BALANCED"
    training_supply: int = 0
    forecast_demand_3m: float | None = None
    forecast_shortage_3m: str | None = None


class ContractInsightsResponse(BaseModel):
    """Comprehensive ecosystem insights for an Employer Skill Contract."""

    contract_id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    version: int
    status: ContractStatus
    total_skills: int
    required_skills_count: int
    preferred_skills_count: int
    critical_skills_count: int
    high_priority_count: int
    verified_evidence_count: int
    average_proficiency: str
    category_distribution: dict[str, int]
    skill_type_distribution: dict[str, int]
    skill_insights: list[ContractSkillInsight]

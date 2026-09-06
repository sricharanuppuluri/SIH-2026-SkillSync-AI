"""Role-specific profile Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Candidate Profile
class CandidateProfileBase(BaseModel):
    headline: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    experience_years: float = Field(default=0.0, ge=0)
    education_level: str | None = Field(default=None, max_length=100)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)


class CandidateProfileCreate(CandidateProfileBase):
    pass


class CandidateProfileUpdate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    experience_years: float | None = Field(default=None, ge=0)
    education_level: str | None = None
    location_city: str | None = None
    location_state: str | None = None


class CandidateProfileResponse(CandidateProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Employer Profile
class EmployerProfileBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    company_description: str | None = None
    industry: str | None = Field(default=None, max_length=100)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)
    website_url: str | None = Field(default=None, max_length=255)


class EmployerProfileCreate(EmployerProfileBase):
    pass


class EmployerProfileUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=2, max_length=255)
    company_description: str | None = None
    industry: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    website_url: str | None = None


class EmployerProfileResponse(EmployerProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Training Provider Profile
class TrainingProviderProfileBase(BaseModel):
    institution_name: str = Field(..., min_length=2, max_length=255)
    provider_type: str | None = Field(default=None, max_length=100)
    location_city: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=100)
    website_url: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)


class TrainingProviderProfileCreate(TrainingProviderProfileBase):
    pass


class TrainingProviderProfileUpdate(BaseModel):
    institution_name: str | None = Field(default=None, min_length=2, max_length=255)
    provider_type: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    website_url: str | None = None
    contact_email: str | None = None


class TrainingProviderProfileResponse(TrainingProviderProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Government Profile
class GovernmentProfileBase(BaseModel):
    department_name: str = Field(..., min_length=2, max_length=255)
    jurisdiction: str | None = Field(default=None, max_length=100)
    designation: str | None = Field(default=None, max_length=100)


class GovernmentProfileCreate(GovernmentProfileBase):
    pass


class GovernmentProfileUpdate(BaseModel):
    department_name: str | None = Field(default=None, min_length=2, max_length=255)
    jurisdiction: str | None = None
    designation: str | None = None


class GovernmentProfileResponse(GovernmentProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

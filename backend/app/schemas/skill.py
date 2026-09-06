"""Skill domain Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SkillBase(BaseModel):
    """Base attributes for skills."""

    name: str = Field(..., min_length=1, max_length=100, description="Skill title")
    category: str = Field(
        default="General", max_length=100, description="Skill category or taxonomy branch"
    )
    description: str | None = Field(
        default=None, description="Optional description or definition of the skill"
    )


class SkillCreate(SkillBase):
    """Payload for creating a skill."""

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Skill name cannot be empty")
        return cleaned


class SkillUpdate(BaseModel):
    """Payload for updating a skill."""

    name: str | None = Field(None, min_length=1, max_length=100)
    category: str | None = Field(None, max_length=100)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Skill name cannot be empty")
            return cleaned
        return v


class SkillResponse(SkillBase):
    """Serialized representation of a skill."""

    id: uuid.UUID
    normalized_name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

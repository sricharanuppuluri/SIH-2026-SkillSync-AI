"""Skill domain Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.skill import SkillRelationshipType, SkillStatus, SkillType


class SkillBase(BaseModel):
    """Base attributes for skills."""

    name: str = Field(..., min_length=1, max_length=100, description="Skill title")
    slug: str | None = Field(
        default=None, max_length=120, description="Unique normalized URL-safe slug"
    )
    category: str = Field(
        default="General", max_length=100, description="Skill category or taxonomy branch"
    )
    subcategory: str | None = Field(
        default=None, max_length=100, description="Optional taxonomy subcategory"
    )
    description: str | None = Field(
        default=None, description="Optional description or definition of the skill"
    )
    skill_type: SkillType = Field(
        default=SkillType.TECHNICAL, description="Skill classification type"
    )
    status: SkillStatus = Field(default=SkillStatus.ACTIVE, description="Lifecycle status")
    parent_skill_id: uuid.UUID | None = Field(
        default=None, description="Optional parent skill ID for taxonomy hierarchy"
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
    slug: str | None = Field(None, max_length=120)
    category: str | None = Field(None, max_length=100)
    subcategory: str | None = Field(None, max_length=100)
    description: str | None = None
    skill_type: SkillType | None = None
    status: SkillStatus | None = None
    parent_skill_id: uuid.UUID | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Skill name cannot be empty")
            return cleaned
        return v


class SkillAliasCreate(BaseModel):
    """Payload for creating a skill alias."""

    alias: str = Field(..., min_length=1, max_length=100, description="Skill alias/synonym")

    @field_validator("alias")
    @classmethod
    def clean_alias(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Alias cannot be empty")
        return cleaned


class SkillAliasResponse(BaseModel):
    """Serialized skill alias."""

    id: uuid.UUID
    skill_id: uuid.UUID
    alias: str
    normalized_alias: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillRelationshipCreate(BaseModel):
    """Payload for creating a skill relationship."""

    target_skill_id: uuid.UUID
    relationship_type: SkillRelationshipType = Field(
        default=SkillRelationshipType.RELATED, description="Type of graph relationship"
    )
    weight: float = Field(default=1.0, ge=0.1, le=2.0, description="Relationship strength weight")


class SkillRelationshipResponse(BaseModel):
    """Serialized skill relationship."""

    id: uuid.UUID
    source_skill_id: uuid.UUID
    target_skill_id: uuid.UUID
    relationship_type: SkillRelationshipType
    weight: float
    created_at: datetime
    source_skill_name: str | None = None
    target_skill_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SkillCatalogItem(BaseModel):
    """Lightweight canonical skill catalog item for selectors and search."""

    id: uuid.UUID
    name: str
    slug: str
    category: str
    subcategory: str | None = None
    skill_type: SkillType

    model_config = ConfigDict(from_attributes=True)


class SkillResponse(SkillBase):
    """Serialized representation of a canonical skill."""

    id: uuid.UUID
    slug: str
    normalized_name: str
    created_at: datetime
    updated_at: datetime
    parent_name: str | None = None
    aliases_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SkillDetailResponse(SkillResponse):
    """Detailed skill view including hierarchy, aliases, and relationships."""

    parent: SkillResponse | None = None
    children: list[SkillResponse] = Field(default_factory=list)
    aliases: list[SkillAliasResponse] = Field(default_factory=list)
    outbound_relationships: list[SkillRelationshipResponse] = Field(default_factory=list)
    inbound_relationships: list[SkillRelationshipResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

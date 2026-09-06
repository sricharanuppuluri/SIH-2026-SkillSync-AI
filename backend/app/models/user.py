"""User database model and role definitions."""

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profiles import (
        CandidateProfile,
        EmployerProfile,
        GovernmentProfile,
        TrainingProviderProfile,
    )


class UserRole(enum.StrEnum):
    """Primary Role-Based Access Control (RBAC) roles."""

    CANDIDATE = "CANDIDATE"
    EMPLOYER = "EMPLOYER"
    TRAINING_PROVIDER = "TRAINING_PROVIDER"
    GOVERNMENT = "GOVERNMENT"
    ADMIN = "ADMIN"


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Core User entity representing registered accounts across the ecosystem."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role", native_enum=True),
        default=UserRole.CANDIDATE,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # 1-to-1 Profile Relationships
    candidate_profile: Mapped["CandidateProfile | None"] = relationship(
        "CandidateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    employer_profile: Mapped["EmployerProfile | None"] = relationship(
        "EmployerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    training_provider_profile: Mapped["TrainingProviderProfile | None"] = relationship(
        "TrainingProviderProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    government_profile: Mapped["GovernmentProfile | None"] = relationship(
        "GovernmentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User {self.email} (role={self.role.value}, active={self.is_active})>"

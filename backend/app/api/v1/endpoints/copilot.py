"""API endpoints for the AI Career Copilot: chat, conversation history, and lifecycle."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.career_copilot import (
    CareerCopilotChatResult,
    CareerCopilotRequest,
    CopilotConversationResponse,
    CopilotConversationSummary,
)
from app.services.career_copilot_service import career_copilot_service

router = APIRouter()


@router.post(
    "/chat",
    response_model=CareerCopilotChatResult,
    summary="Submit a prompt to AI Career Copilot",
)
async def chat(
    request: CareerCopilotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CareerCopilotChatResult:
    """Send prompt to Career Copilot and receive structured, grounded career advice."""
    return await career_copilot_service.chat(db, current_user, request)


@router.get(
    "/conversations",
    response_model=list[CopilotConversationSummary],
    summary="List candidate's Copilot conversations",
)
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> list[CopilotConversationSummary]:
    """Retrieve all Copilot conversation sessions belonging to the authenticated candidate."""
    return await career_copilot_service.list_conversations(db, current_user)


@router.get(
    "/conversations/{conversation_id}",
    response_model=CopilotConversationResponse,
    summary="Get conversation details and messages",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> CopilotConversationResponse:
    """Retrieve complete message history for an authorized conversation session."""
    return await career_copilot_service.get_conversation(db, current_user, conversation_id)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Copilot conversation",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.ADMIN)),
) -> None:
    """Delete a conversation session owned by the authenticated candidate."""
    await career_copilot_service.delete_conversation(db, current_user, conversation_id)

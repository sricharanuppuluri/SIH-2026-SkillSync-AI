"""Semantic skill matching service implementing deterministic exact/alias precedence.

Combines exact catalog lookups, alias resolution, and pgvector semantic similarity.
"""

import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.skill import Skill, SkillAlias, SkillStatus
from app.models.skill_embedding import SkillEmbedding
from app.schemas.semantic import (
    EmbeddingStatusResponse,
    MatchType,
    SemanticMatchItem,
    SemanticMatchRequest,
    SemanticMatchResponse,
)
from app.services.embedding_service import embedding_service
from app.services.skill_service import normalize_skill_name

logger = logging.getLogger(__name__)


class SemanticSkillService:
    """Service combining deterministic canonical resolution with local vector semantic search."""

    @staticmethod
    def _compute_cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two normalized vector arrays.

        Because vectors produced by SentenceTransformers with normalize_embeddings=True
        have unit norm (||v|| = 1.0), cosine similarity is exactly equal to the dot product.
        """
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
        # Clamp to [0.0, 1.0] to prevent floating point inaccuracies
        return max(0.0, min(1.0, float(dot_product)))

    async def match_skill(
        self,
        db: AsyncSession,
        request: SemanticMatchRequest,
    ) -> SemanticMatchResponse:
        """Find matching canonical skills for query text using multi-tier resolution.

        Resolution hierarchy:
        1. Exact Match on canonical Skill.normalized_name (Similarity: 1.0, Type: EXACT)
        2. Alias Match on SkillAlias.normalized_alias (Similarity: 1.0, Type: ALIAS)
        3. Semantic Vector Match using local pgvector embeddings (Type: STRONG_SEMANTIC/SEMANTIC)
        """
        raw_text = request.text
        top_k = request.top_k
        requested_type = request.skill_type
        normalized_query = normalize_skill_name(raw_text)

        matches: list[SemanticMatchItem] = []
        seen_skill_ids: set[uuid.UUID] = set()

        # ---------------------------------------------------------
        # Tier 1: Exact Canonical Match
        # ---------------------------------------------------------
        exact_stmt = select(Skill).where(
            Skill.normalized_name == normalized_query,
            Skill.status == SkillStatus.ACTIVE,
        )
        if requested_type:
            exact_stmt = exact_stmt.where(Skill.skill_type == requested_type)

        exact_res = await db.execute(exact_stmt)
        exact_skill = exact_res.scalars().first()

        if exact_skill:
            matches.append(
                SemanticMatchItem(
                    skill_id=exact_skill.id,
                    skill_name=exact_skill.name,
                    skill_type=exact_skill.skill_type,
                    category=exact_skill.category or "General",
                    similarity=1.0,
                    match_type=MatchType.EXACT,
                    matched_via="Exact canonical match",
                    explanation=f"Exact match for active canonical skill '{exact_skill.name}'.",
                )
            )
            seen_skill_ids.add(exact_skill.id)

        # ---------------------------------------------------------
        # Tier 2: Canonical Alias Match
        # ---------------------------------------------------------
        alias_stmt = (
            select(SkillAlias)
            .options(selectinload(SkillAlias.skill))
            .where(SkillAlias.normalized_alias == normalized_query)
        )
        alias_res = await db.execute(alias_stmt)
        alias_obj = alias_res.scalars().first()

        if alias_obj and alias_obj.skill and alias_obj.skill.status == SkillStatus.ACTIVE:
            skill = alias_obj.skill
            if skill.id not in seen_skill_ids and (
                not requested_type or skill.skill_type == requested_type
            ):
                matches.append(
                    SemanticMatchItem(
                        skill_id=skill.id,
                        skill_name=skill.name,
                        skill_type=skill.skill_type,
                        category=skill.category or "General",
                        similarity=1.0,
                        match_type=MatchType.ALIAS,
                        matched_via=f"Alias: '{alias_obj.alias}'",
                        explanation=(
                            f"Resolved via canonical alias '{alias_obj.alias}' to '{skill.name}'."
                        ),
                    )
                )
                seen_skill_ids.add(skill.id)

        # ---------------------------------------------------------
        # Tier 3: Local Semantic Embedding Matching
        # ---------------------------------------------------------
        # Only perform semantic search if we need more candidates to fill top_k
        if len(matches) < top_k and embedding_service.is_available():
            try:
                query_vector = embedding_service.generate_embedding(raw_text)

                # Fetch canonical skill embeddings for the active model
                emb_stmt = (
                    select(SkillEmbedding, Skill)
                    .join(Skill, SkillEmbedding.skill_id == Skill.id)
                    .where(
                        Skill.status == SkillStatus.ACTIVE,
                        SkillEmbedding.model_name == settings.EMBEDDING_MODEL_NAME,
                    )
                )
                if requested_type:
                    emb_stmt = emb_stmt.where(Skill.skill_type == requested_type)

                emb_res = await db.execute(emb_stmt)
                candidate_rows = emb_res.all()

                semantic_candidates: list[dict[str, Any]] = []

                for emb_row in candidate_rows:
                    emb: SkillEmbedding = emb_row[0]
                    skill: Skill = emb_row[1]

                    if skill.id in seen_skill_ids:
                        continue

                    similarity = self._compute_cosine_similarity(query_vector, emb.embedding)

                    # Apply threshold filtering (< 0.70 is rejected as NO_MATCH)
                    if similarity >= settings.SEMANTIC_STRONG_MATCH_THRESHOLD:
                        match_type = MatchType.STRONG_SEMANTIC
                        explanation = (
                            f"Strong semantic match with {similarity:.1%} similarity "
                            f"based on contextual representation."
                        )
                    elif similarity >= settings.SEMANTIC_MATCH_THRESHOLD:
                        match_type = MatchType.SEMANTIC
                        explanation = (
                            f"Suggested semantic match with {similarity:.1%} similarity. "
                            f"Review recommended before confirmation."
                        )
                    else:
                        continue  # Below threshold

                    semantic_candidates.append(
                        {
                            "item": SemanticMatchItem(
                                skill_id=skill.id,
                                skill_name=skill.name,
                                skill_type=skill.skill_type,
                                category=skill.category or "General",
                                similarity=round(similarity, 4),
                                match_type=match_type,
                                matched_via="Local vector embedding",
                                explanation=explanation,
                            ),
                            "similarity": similarity,
                            "skill_name": skill.name,
                            "skill_id": str(skill.id),
                        }
                    )

                # Deterministic tie-breaking:
                # 1. similarity DESC
                # 2. skill_name ASC
                # 3. skill_id ASC
                semantic_candidates.sort(
                    key=lambda c: (-c["similarity"], c["skill_name"].lower(), c["skill_id"])
                )

                remaining_slots = top_k - len(matches)
                for cand in semantic_candidates[:remaining_slots]:
                    matches.append(cand["item"])
                    seen_skill_ids.add(cand["item"].skill_id)

            except Exception as e:
                logger.error(f"Semantic search failed during vector comparison: {e}")

        return SemanticMatchResponse(
            query=raw_text,
            normalized_query=normalized_query,
            matches=matches,
            model_name=settings.EMBEDDING_MODEL_NAME,
        )

    async def get_embedding_status(self, db: AsyncSession) -> EmbeddingStatusResponse:
        """Compute coverage metrics for canonical skill embeddings."""
        # Total active skills
        total_stmt = select(func.count(Skill.id)).where(Skill.status == SkillStatus.ACTIVE)
        total_res = await db.execute(total_stmt)
        total_active_skills = total_res.scalar_one() or 0

        # Embedded skills for current active model
        emb_stmt = (
            select(func.count(SkillEmbedding.id))
            .join(Skill, SkillEmbedding.skill_id == Skill.id)
            .where(
                Skill.status == SkillStatus.ACTIVE,
                SkillEmbedding.model_name == settings.EMBEDDING_MODEL_NAME,
            )
        )
        emb_res = await db.execute(emb_stmt)
        embedded_skills = emb_res.scalar_one() or 0

        missing_embeddings = max(0, total_active_skills - embedded_skills)

        return EmbeddingStatusResponse(
            total_active_skills=total_active_skills,
            embedded_skills=embedded_skills,
            missing_embeddings=missing_embeddings,
            model_name=settings.EMBEDDING_MODEL_NAME,
            dimension=settings.EMBEDDING_DIMENSION,
            is_model_available=embedding_service.is_available(),
        )


semantic_skill_service = SemanticSkillService()

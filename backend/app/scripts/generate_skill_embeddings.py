"""Generate or update vector embeddings for canonical skills idempotently.

Usage:
    uv run python -m app.scripts.generate_skill_embeddings [--force]
"""

import argparse
import asyncio
import logging
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.skill import Skill, SkillStatus
from app.models.skill_embedding import SkillEmbedding
from app.services.embedding_service import embedding_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("generate_embeddings")


async def generate_skill_embeddings(session: AsyncSession, force: bool = False) -> dict[str, int]:
    """Generate or update vector embeddings for all active canonical skills.

    Args:
        session: Active asynchronous database session.
        force: If True, regenerates all embeddings regardless of staleness.

    Returns:
        Summary dict containing counts of processed, created, updated, and skipped skills.
    """
    logger.info(
        f"Starting embedding generation with model '{settings.EMBEDDING_MODEL_NAME}' "
        f"(dimension={settings.EMBEDDING_DIMENSION}, force={force})..."
    )

    # 1. Fetch active canonical skills with their aliases
    stmt = (
        select(Skill)
        .options(selectinload(Skill.aliases))
        .where(Skill.status == SkillStatus.ACTIVE)
        .order_by(Skill.name.asc())
    )
    res = await session.execute(stmt)
    skills = res.scalars().all()

    total_skills = len(skills)
    created_count = 0
    updated_count = 0
    skipped_count = 0

    logger.info(f"Found {total_skills} active canonical skills in catalog.")

    for skill in skills:
        alias_names = [a.alias for a in skill.aliases if a.alias]
        raw_type = skill.skill_type
        type_str = raw_type.value if hasattr(raw_type, "value") else str(raw_type)
        source_text = embedding_service.build_canonical_skill_source_text(
            skill_name=skill.name,
            skill_type=type_str,
            category=skill.category or "General",
            aliases=alias_names,
        )

        # Check existing embedding for this skill and model
        emb_stmt = select(SkillEmbedding).where(
            SkillEmbedding.skill_id == skill.id,
            SkillEmbedding.model_name == settings.EMBEDDING_MODEL_NAME,
        )
        emb_res = await session.execute(emb_stmt)
        existing_emb = emb_res.scalars().first()

        if existing_emb is None:
            # Generate new embedding
            vector = embedding_service.generate_embedding(source_text)
            new_emb = SkillEmbedding(
                skill_id=skill.id,
                embedding=vector,
                source_text=source_text,
                model_name=settings.EMBEDDING_MODEL_NAME,
                embedding_dimension=settings.EMBEDDING_DIMENSION,
            )
            session.add(new_emb)
            created_count += 1
            logger.info(f"[CREATE] Generated embedding for skill: '{skill.name}'")

        elif force or existing_emb.source_text != source_text:
            # Stale or forced update
            vector = embedding_service.generate_embedding(source_text)
            existing_emb.embedding = vector
            existing_emb.source_text = source_text
            existing_emb.embedding_dimension = settings.EMBEDDING_DIMENSION
            updated_count += 1
            reason = "FORCED" if force else "STALE (source text changed)"
            logger.info(f"[UPDATE - {reason}] Refreshed embedding for skill: '{skill.name}'")

        else:
            skipped_count += 1
            logger.debug(f"[SKIP] Embedding is up to date for skill: '{skill.name}'")

    await session.commit()

    summary = {
        "total_active_skills": total_skills,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }
    logger.info(
        f"Embedding generation completed: total={total_skills}, "
        f"created={created_count}, updated={updated_count}, skipped={skipped_count}."
    )
    return summary


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate canonical skill embeddings.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force regeneration of all embeddings even if not stale.",
    )
    args = parser.parse_args()

    async with AsyncSessionLocal() as session:
        try:
            await generate_skill_embeddings(session, force=args.force)
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}", exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

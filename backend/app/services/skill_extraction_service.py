"""Phase 6 — Local AI Skill Extraction Service.

Pipeline:
    Raw Text
       ↓ build_extraction_prompt()
    Local Ollama LLM  (generate_json)
       ↓ RawExtractionResponse.model_validate()
    Pydantic validation
       ↓ normalize / resolve
    resolve_skill_by_text()  (Phase 5 canonical resolver)
       ↓ deduplicate canonical IDs
    SkillExtractionResponse

The LLM is NOT the source of truth.
The canonical Skill database (Phase 5) is the source of truth.
Unknown LLM outputs remain unresolved — they are NEVER auto-inserted.
"""

import logging
import time
from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.ollama_client import (
    OllamaError,
    OllamaStatus,
    generate_json,
)
from app.core.config import settings
from app.schemas.skill_extraction import (
    ExtractionSourceType,
    RawExtractionResponse,
    SkillExtractionItem,
    SkillExtractionResponse,
)
from app.services.skill_service import normalize_skill_name, resolve_skill_by_text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a precise skill extraction assistant. Your only task is to identify \
technical and professional skills explicitly mentioned in the source text. \
You must return only valid JSON matching the specified schema. \
Do not invent or infer skills that are not explicitly mentioned. \
Do not create new canonical skill definitions. \
Prefer exact, well-known skill names (e.g. "Python", "PostgreSQL", "Docker"). \
If you are unsure, omit the skill rather than guess.\
"""

_USER_PROMPT_TEMPLATE = """\
Extract all explicitly mentioned skills from the following {source_type} text.

Return ONLY a JSON object in this exact format:
{{
  "skills": [
    {{
      "name": "<skill name>",
      "confidence": <float 0.0-1.0>,
      "evidence": "<short quote or phrase from the text that supports this skill>"
    }}
  ]
}}

Rules:
- Include only skills explicitly present in the text.
- Do not invent or infer skills not clearly mentioned.
- Prefer canonical, well-known names: "Python" not "Python language",
  "PostgreSQL" not "Postgres database server".
- Confidence: 1.0 = explicitly named, 0.7 = strongly implied by context, 0.5 = mentioned indirectly.
- Evidence: quote up to 10 words from the text supporting the extraction.
- Maximum 50 skills.
- Return valid JSON only. No extra explanation.

Available canonical skill names for reference (prefer these names when matching):
{catalog_hint}

Source text ({source_type}):
---
{text}
---
"""


def _build_prompt(text: str, source_type: str, catalog_hint: str) -> str:
    """Construct the extraction user prompt."""
    return _USER_PROMPT_TEMPLATE.format(
        source_type=source_type,
        text=text,
        catalog_hint=catalog_hint or "(no catalog available)",
    )


def _build_catalog_hint(catalog_names: list[str]) -> str:
    """Build a bounded catalog hint string from canonical skill names.

    Limits to first 200 names to avoid excessively long prompts.
    """
    if not catalog_names:
        return ""
    names = catalog_names[:200]
    return ", ".join(names)


# ---------------------------------------------------------------------------
# Core extraction pipeline
# ---------------------------------------------------------------------------


async def _load_catalog_names(db: AsyncSession) -> list[str]:
    """Load active canonical skill names for the prompt catalog hint."""
    from app.services.skill_service import get_skill_catalog

    skills = await get_skill_catalog(db, limit=500)
    return [s.name for s in skills]


async def extract_skills(
    db: AsyncSession,
    text: str,
    source_type: ExtractionSourceType = ExtractionSourceType.OTHER,
) -> SkillExtractionResponse:
    """Run the full skill extraction pipeline against the local Ollama model.

    Args:
        db: Async database session (used for canonical resolver).
        text: Source text to extract skills from (already validated).
        source_type: Type of source document.

    Returns:
        SkillExtractionResponse with resolved canonical skills and warnings.

    This function never raises — all Ollama errors are caught and returned
    as a failed-but-structured response to ensure API stability.
    """
    start_ms = time.perf_counter() * 1000

    logger.info(
        "skill_extraction.start source_type=%s text_length=%d",
        source_type.value,
        len(text),
    )

    warnings: list[str] = []

    # ------------------------------------------------------------------
    # 1. Load catalog hint (active skills only, bounded)
    # ------------------------------------------------------------------
    try:
        catalog_names = await _load_catalog_names(db)
    except Exception as exc:
        logger.warning("skill_extraction.catalog_load_failed error=%s", exc)
        catalog_names = []
        warnings.append("Canonical catalog unavailable for prompt hint.")

    catalog_hint = _build_catalog_hint(catalog_names)
    prompt = _build_prompt(text=text, source_type=source_type.value, catalog_hint=catalog_hint)

    # ------------------------------------------------------------------
    # 2. Call Ollama
    # ------------------------------------------------------------------
    raw_data: dict[str, Any] | None = None

    try:
        raw_data = await generate_json(prompt=prompt, system_prompt=_SYSTEM_PROMPT)
    except OllamaError as exc:
        logger.warning(
            "skill_extraction.ollama_error status=%s message=%s",
            exc.status,
            str(exc),
        )
        friendly = {
            OllamaStatus.TIMEOUT: "Local AI service timed out. Please try again.",
            OllamaStatus.MODEL_NOT_FOUND: (
                f"Ollama model '{settings.OLLAMA_MODEL}' is not available. "
                "Please pull the model and retry."
            ),
            OllamaStatus.INVALID_RESPONSE: "Local AI returned an invalid response.",
        }.get(exc.status, "Local AI service is unavailable.")
        warnings.append(friendly)
    except Exception as exc:
        logger.error("skill_extraction.unexpected_error error=%s", exc, exc_info=True)
        warnings.append("An unexpected error occurred during extraction.")

    # If Ollama failed, return graceful empty result
    if raw_data is None:
        elapsed = time.perf_counter() * 1000 - start_ms
        logger.info(
            "skill_extraction.failed source_type=%s elapsed_ms=%.1f",
            source_type.value,
            elapsed,
        )
        return SkillExtractionResponse(
            success=False,
            skills=[],
            model=settings.OLLAMA_MODEL,
            source_type=source_type,
            processing_time_ms=round(elapsed, 2),
            resolved_count=0,
            unresolved_count=0,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # 3. Validate raw LLM output with Pydantic
    # ------------------------------------------------------------------
    try:
        raw_extraction = RawExtractionResponse.model_validate(raw_data)
    except ValidationError as exc:
        logger.warning("skill_extraction.validation_failed errors=%s", exc.error_count())
        warnings.append("AI response did not match the expected schema; extraction aborted.")
        elapsed = time.perf_counter() * 1000 - start_ms
        return SkillExtractionResponse(
            success=False,
            skills=[],
            model=settings.OLLAMA_MODEL,
            source_type=source_type,
            processing_time_ms=round(elapsed, 2),
            resolved_count=0,
            unresolved_count=0,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # 4. Normalize + resolve each extracted skill against canonical catalog
    # ------------------------------------------------------------------
    resolved_items: list[SkillExtractionItem] = []
    seen_canonical_ids: set[str] = set()
    seen_normalized_names: set[str] = set()

    for raw_item in raw_extraction.skills:
        norm_name = normalize_skill_name(raw_item.name)

        # Resolve via Phase 5 deterministic resolver
        canonical_skill = None
        try:
            canonical_skill = await resolve_skill_by_text(db, raw_item.name)
        except Exception as exc:
            logger.warning(
                "skill_extraction.resolve_failed raw_name=%s error=%s",
                raw_item.name,
                exc,
            )

        if canonical_skill is not None:
            canonical_id_str = str(canonical_skill.id)

            # Deduplicate by canonical ID (multiple LLM names → same skill)
            if canonical_id_str in seen_canonical_ids:
                logger.debug(
                    "skill_extraction.duplicate_canonical raw_name=%s canonical=%s",
                    raw_item.name,
                    canonical_skill.name,
                )
                continue
            seen_canonical_ids.add(canonical_id_str)

            resolved_items.append(
                SkillExtractionItem(
                    raw_name=raw_item.name,
                    normalized_name=norm_name,
                    canonical_skill_id=canonical_skill.id,
                    canonical_skill_name=canonical_skill.name,
                    confidence=raw_item.confidence,
                    evidence=raw_item.evidence,
                    resolved=True,
                )
            )
        else:
            # Unresolved — deduplicate by normalized name to avoid clutter
            if norm_name in seen_normalized_names:
                continue
            seen_normalized_names.add(norm_name)

            resolved_items.append(
                SkillExtractionItem(
                    raw_name=raw_item.name,
                    normalized_name=norm_name,
                    canonical_skill_id=None,
                    canonical_skill_name=None,
                    confidence=raw_item.confidence,
                    evidence=raw_item.evidence,
                    resolved=False,
                )
            )
            warnings.append(f"'{raw_item.name}' was not found in the canonical skill catalog.")

    resolved_count = sum(1 for i in resolved_items if i.resolved)
    unresolved_count = sum(1 for i in resolved_items if not i.resolved)
    elapsed = time.perf_counter() * 1000 - start_ms

    logger.info(
        "skill_extraction.complete source_type=%s total=%d"
        " resolved=%d unresolved=%d elapsed_ms=%.1f",
        source_type.value,
        len(resolved_items),
        resolved_count,
        unresolved_count,
        elapsed,
    )

    return SkillExtractionResponse(
        success=True,
        skills=resolved_items,
        model=settings.OLLAMA_MODEL,
        source_type=source_type,
        processing_time_ms=round(elapsed, 2),
        resolved_count=resolved_count,
        unresolved_count=unresolved_count,
        warnings=warnings,
    )

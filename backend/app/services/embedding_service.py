"""Local embedding service using Sentence Transformers."""

import logging
import re
import threading
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingServiceError(Exception):
    """Exception raised for errors in the embedding service."""

    pass


class EmbeddingService:
    """Singleton service for local Sentence Transformers embedding generation."""

    _instance: "EmbeddingService | None" = None
    _lock: threading.Lock = threading.Lock()
    _model: Any = None
    _model_loaded: bool = False
    _model_load_error: str | None = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.dimension = settings.EMBEDDING_DIMENSION

    def _get_model(self) -> Any:
        """Lazily load the SentenceTransformer model in a thread-safe manner."""
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is not None:
                return self._model

            try:
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading local embedding model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                self._model_loaded = True
                self._model_load_error = None
                return self._model
            except Exception as e:
                self._model_loaded = False
                self._model_load_error = str(e)
                logger.error(f"Failed to load embedding model {self.model_name}: {e}")
                raise EmbeddingServiceError(f"Embedding model unavailable: {e}") from e

    def is_available(self) -> bool:
        """Check whether the embedding model can be loaded/used."""
        try:
            self._get_model()
            return True
        except Exception:
            return False

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize raw skill input while preserving critical technical tokens.

        Preserves:
            - Technical characters: 'C++', 'C#', '.NET', 'Node.js', 'React.js'
            - Hyphenated terms: 'machine-learning', 'back-end'
            - Trims and collapses multiple whitespace characters.
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty or only whitespace")

        # Strip surrounding whitespace
        cleaned = text.strip()
        # Collapse multiple whitespace characters into single space
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned

    @staticmethod
    def build_canonical_skill_source_text(
        skill_name: str,
        skill_type: str,
        category: str,
        aliases: list[str] | None = None,
    ) -> str:
        """Build deterministic source text for canonical skill embedding generation.

        Format:
            "{skill_name}. {skill_type.title()} skill. Category: {category}. "
            "Aliases: {sorted_aliases}."
        """
        parts = [skill_name.strip()]
        if skill_type:
            parts.append(f"{skill_type.capitalize()} skill")
        if category:
            parts.append(f"Category: {category.strip()}")
        if aliases:
            clean_aliases = sorted([a.strip() for a in aliases if a and a.strip()])
            if clean_aliases:
                parts.append(f"Aliases: {', '.join(clean_aliases)}")
        return ". ".join(parts) + "."

    def generate_embedding(self, text: str) -> list[float]:
        """Generate a normalized 384-dimensional embedding vector for a single text."""
        cleaned = self.normalize_text(text)
        model = self._get_model()
        try:
            # normalize_embeddings=True ensures cosine similarity equals dot product
            vector = model.encode(cleaned, normalize_embeddings=True)
            if hasattr(vector, "tolist"):
                result = vector.tolist()
            else:
                result = list(vector)

            if len(result) != self.dimension:
                logger.warning(
                    f"Generated vector dimension {len(result)} "
                    f"does not match configured dimension {self.dimension}"
                )
            return [float(x) for x in result]
        except Exception as e:
            logger.error(f"Error generating embedding for text '{cleaned[:50]}...': {e}")
            raise EmbeddingServiceError(f"Embedding generation failed: {e}") from e

    def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate normalized embeddings for a batch of text items."""
        if not texts:
            return []

        cleaned_texts = [self.normalize_text(t) for t in texts]
        model = self._get_model()
        try:
            vectors = model.encode(cleaned_texts, normalize_embeddings=True)
            results = []
            for v in vectors:
                if hasattr(v, "tolist"):
                    results.append([float(x) for x in v.tolist()])
                else:
                    results.append([float(x) for x in v])
            return results
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise EmbeddingServiceError(f"Batch embedding generation failed: {e}") from e

    def get_metadata(self) -> dict[str, Any]:
        """Return model metadata and runtime status."""
        return {
            "model_name": self.model_name,
            "dimension": self.dimension,
            "is_loaded": self._model is not None,
            "is_available": self.is_available(),
            "load_error": self._model_load_error,
        }


# Global singleton instance
embedding_service = EmbeddingService()

"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App information
    APP_NAME: str = "SkillSync AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    VERSION: str = "0.1.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Security
    JWT_SECRET_KEY: str = "skillsync_development_insecure_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/skillsync_ai"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/skillsync_ai"

    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/0"

    # Local AI / Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral:latest"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text:latest"
    OLLAMA_TIMEOUT: float = 30.0  # seconds

    # Embeddings & Semantic Matching
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    SEMANTIC_MATCH_THRESHOLD: float = 0.70
    SEMANTIC_STRONG_MATCH_THRESHOLD: float = 0.85

    # Skill extraction limits
    EXTRACTION_MAX_TEXT_LENGTH: int = 10000  # characters
    EXTRACTION_MIN_TEXT_LENGTH: int = 10  # characters

    # Rate Limiting
    RATE_LIMITING_ENABLED: bool = True

    # CORS Origins (comma-separated string or list)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

# SkillSync AI — Backend Dockerfile
# Production multi-stage build for FastAPI backend with uv package manager

# ─── Stage 1: Build Dependencies ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

# System dependencies for psycopg2 / asyncpg compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY pyproject.toml uv.lock* ./

# Install all dependencies (no dev extras)
RUN uv sync --frozen --no-dev --no-editable

# ─── Stage 2: Runtime Image ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Minimal runtime OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security
RUN groupadd --system skillsync && useradd --system --gid skillsync --no-create-home skillsync

WORKDIR /app

# Copy installed virtualenv from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application source
COPY --chown=skillsync:skillsync . .

# Activate virtualenv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER skillsync

EXPOSE 8000

# Health check using the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run with uvicorn — settings are injected from environment / .env
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--no-access-log"]

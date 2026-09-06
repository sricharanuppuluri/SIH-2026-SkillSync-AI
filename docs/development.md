# SkillSync AI — Development Guide

This guide describes the developer workflow, branch strategy, local setup, and quality gates for SkillSync AI.

## 1. Branch Strategy

We use a GitFlow-inspired branching strategy:

```text
main (v0.1.0, v0.2.0, ...)
  │
  └── develop (integration branch)
        │
        ├── feature/phase-0-foundation
        ├── feature/auth-rbac
        ├── feature/employer-module
        └── feature/matching-engine
```

- **`main`**: Production and tagged release branch. Only receives merges from `develop` after full validation.
- **`develop`**: Central integration branch. All feature branches merge here via Pull Requests.
- **`feature/<name>`**: Dedicated branch for a specific phase or functional module.
- **`bugfix/<name>`**: Dedicated branch for addressing defects found in `develop`.

## 2. Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: v18.0.0 or higher (v20+ / v22 recommended)
- **Python**: 3.12+ (tested up to 3.14)
- **uv** (recommended for Python) or standard `pip`/`venv`
- **PostgreSQL**: 15+ with `pgvector` extension enabled
- **Redis**: 6+ (local service, Docker, or Podman)
- **Ollama** (optional for local LLM inference): [ollama.ai](https://ollama.ai)

## 3. Local Development Setup

### 3.1 Clone & Checkout
```bash
git clone <repository-url>
cd skillsync-ai
git checkout -b feature/phase-0-foundation
```

### 3.2 Environment Setup
Copy the environment file:
```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

### 3.3 Database & Redis with Containers (Optional)
If using Docker or Podman:
```bash
# Docker Compose:
docker compose up -d

# Or Podman Compose:
podman-compose up -d
```

### 3.4 Backend Setup
```bash
cd backend

# Create virtual environment & install dependencies with uv:
uv venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

uv pip install -r requirements.txt

# Run migrations:
alembic upgrade head

# Start development server:
uvicorn app.main:app --reload --port 8000
```

FastAPI will be available at:
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3.5 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Next.js will be available at:
- Web App: `http://localhost:3000`

## 4. Testing & Quality Standards

Always run the full suite before pushing code:

### Backend Checks
```bash
cd backend
# Run lint checks
ruff check .

# Run test suite
pytest -v
```

### Frontend Checks
```bash
cd frontend
# Run linter
npm run lint

# TypeScript verification
npx tsc --noEmit

# Frontend tests
npm test

# Production build verification
npm run build
```

## 5. Phase Completion Checklist

Before merging a phase into `develop`:
1. [ ] All local unit and integration tests pass.
2. [ ] Zero linter errors or warnings.
3. [ ] Database migrations are tested up and down.
4. [ ] Documentation updated to reflect changes.
5. [ ] PR created targeting `develop`.

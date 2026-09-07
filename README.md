# SkillSync AI 🚀

> **AI-Powered Skill Intelligence & Closed-Loop Employment Ecosystem**  
> *Industry Demand → Skill Intelligence → Training Supply → Verified Skill Passport → AI Matching → Employment Outcomes → Ecosystem Feedback*

SkillSync AI is a production-ready, open-source platform that bridges the divide between industry labor demand and workforce education. By uniting employers, government policymakers, training providers, and candidates into an interconnected digital twin, SkillSync AI replaces credential inflation and enrollment-only vanity metrics with verifiable skill credentials, semantic matching, and evidence-backed employment outcomes.

---

## 📌 Current Status

**Status**: Production-ready application foundation and SIH demonstration environment.  
- **Completed Phases**: Phases 1 through 20 (Final SIH Release, UI Polish, & Judge Readiness — `v1.0.0-RC`).  
- **Test Suite**: 244 backend tests passing, 131 frontend Vitest tests passing, 0 lint warnings/errors, 0 TypeScript errors.  
- **Alembic Head**: `0012_outcome_intelligence`.  
- **Demo State**: 100% deterministic, idempotent seeding with safe operator reset capability.

---

## 🎯 The Core Problem & Solution

### The Problem
Traditional labor markets suffer from four critical disconnects:
1. **Unverifiable Resumes**: Self-declared candidate skill claims create friction, interview fatigue, and credential fraud.
2. **Lagging Curriculum**: Training providers teach outdated syllabi without visibility into emerging industry demand.
3. **Reactive Hiring**: Employers rely on crude keyword filters rather than structured, quality-assured skill contracts.
4. **Blind Policy Planning**: Governments fund training programs based on enrollment quotas rather than verified employment retention.

### The SkillSync AI Solution
SkillSync AI provides a closed-loop skill ecosystem:
```
Employer Job Demand
      │ (Formalized via Skill Contracts)
      ▼
Skill Demand Digital Twin ──────► Demand Forecast ──────► What-If Simulator
      │ (Identifies Acute Shortages)
      ▼
Training Provider Curricula
      │ (Candidate Enrolls & Completes Curriculum)
      ▼
Verified Skill Passport
      │ (Tamper-Resistant Digital Credentials)
      ▼
AI Semantic Matching & Application
      │ (pgvector High-Dimensional Cosine Similarity)
      ▼
Verified Employment & Placement Outcomes
      │ (Tracks 90-Day & 180-Day Retention + Employer Ratings)
      ▼
Provider Performance Index (PPI) & Macro Policy Feedback
```

---

## 🌟 Major Platform Capabilities

- **Canonical Skill Intelligence**: 50+ normalized canonical skills with aliases, categories, and graph relationships preventing taxonomy drift.
- **Local AI Skill Extraction**: Zero cloud AI lock-in; uses local Ollama (`mistral:latest` default, configurable via `OLLAMA_MODEL`) with deterministic fallback tokenization.
- **Semantic Skill Matching**: Powered by PostgreSQL `pgvector` for high-fidelity vector cosine similarity matching.
- **Explainable Skill Gap Engine**: Categorizes requirements into `MATCHED`, `PARTIAL`, and `MISSING` with tailored training recommendations.
- **Verified Skill Passport**: Distinguishes self-reported claims from verified competencies backed by course completion records and secure public share tokens.
- **Employer Skill Contracts**: Structured, versioned competency agreements enforcing hiring rigor and verifiable evidence prerequisites.
- **Skill Demand Digital Twin**: Real-time aggregation of active jobs and candidate supply computing shortage ratios across industries and regions.
- **Statistical Demand Forecasting**: Holt linear exponential smoothing and linear trend models with backtested MAE bounds.
- **Stateless What-If Simulator**: Policy scenario modeling enabling government simulations without mutating production records.
- **Employment Outcome Intelligence**: Tracks verified starting salaries, retention milestones, and employer satisfaction ratings.
- **Provider Performance Index (PPI)**: Objective 4-factor institutional ranking across deterministic quality tiers (Tier 1 Excellent to Tier 4).
- **Strict Privacy & Zero-PII Aggregates**: Zero candidate PII exposed in government, macro analytics, or digital twin endpoints.

---

## 🏗️ System Architecture

```text
                        ┌────────────────────────────────────────┐
                        │      Next.js 15 App Router UI          │
                        │    (Vanilla CSS + Premium Theme)       │
                        └───────────────────┬────────────────────┘
                                            │ REST / JSON (JWT Auth)
                                            ▼
                        ┌────────────────────────────────────────┐
                        │       FastAPI 0.115 API Gateway        │
                        │        (Async Python 3.12+)            │
                        └─────────┬───────────────────┬──────────┘
                                  │                   │
                     ┌────────────┘                   └────────────┐
                     ▼                                             ▼
          ┌───────────────────────┐                     ┌─────────────────────┐
          │      PostgreSQL 16    │                     │        Redis        │
          │      + pgvector       │                     │  (Cache & Limits)   │
          └──────────┬────────────┘                     └─────────────────────┘
                     │
                     ▼
          ┌───────────────────────┐
          │    Local Ollama LLM   │
          │ (Offline Skill Parser)│
          └───────────────────────┘
```

See [Ecosystem Architecture Documentation](docs/architecture/skillsync-e2e-architecture.md) for detailed Mermaid system diagrams.

---

## 🧰 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), Vanilla CSS Design Tokens, Lucide Icons
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async), [Pydantic v2](https://docs.pydantic.dev/), [Alembic](https://alembic.sqlalchemy.org/)
- **Database & Vectors**: [PostgreSQL 16](https://www.postgresql.org/) with [`pgvector`](https://github.com/pgvector/pgvector)
- **Cache & Rate Limiting**: [Redis 7](https://redis.io/)
- **Local AI & Embeddings**: [Ollama](https://ollama.com/) (`mistral:latest` default) with offline regex fallback, [SentenceTransformers](https://sbert.net/) (`all-MiniLM-L6-v2`)
- **Testing & Code Quality**: [Pytest](https://pytest.org/), [Ruff](https://astral.sh/ruff), [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/)

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v18+ (Node 20+ recommended)
- **Python**: 3.12+ (tested with Python 3.14) & [`uv`](https://github.com/astral-sh/uv)
- **PostgreSQL**: 15+ (with `pgvector` enabled)
- **Docker Compose** (optional for auxiliary services)

### 2. Launch Infrastructure (Docker)
```bash
docker-compose up -d postgres redis ollama
```

### 3. Backend Setup
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 3000
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 🎭 SIH Demo Environment & Personas

Run the automated demo verifier:
```bash
python scripts/run_demo.py --check-only
```

To perform a clean, deterministic reset between demonstration sessions:
```bash
python scripts/run_demo.py --reset --check-only
```

### Demo Accounts

| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Government Admin** | `dev.gov@skillsync.internal` | `DevPassword123!` | Labor Analytics & Policy Director |
| **Enterprise Employer** | `dev.employer@skillsync.internal` | `DevPassword123!` | TechNova Digital Solutions (Hiring Lead) |
| **Candidate** | `dev.candidate@skillsync.internal` | `DevPassword123!` | Demo Candidate (Full Stack Cloud) |
| **Training Provider** | `dev.provider@skillsync.internal` | `DevPassword123!` | SkillForge Training Institute (Curriculum Lead) |
| **Platform Superadmin**| `admin@skillsync.internal` | `DevPassword123!` | System Superuser |

*Refer to [SIH Demo Runbook](docs/SIH_DEMO_RUNBOOK.md) and [SIH Final Rehearsal](docs/SIH_FINAL_REHEARSAL.md) for full step-by-step presentation scripts.*

---

## 🧪 Validation & Test Commands

### Backend Verification
```bash
cd backend
# 1. Full Unit & E2E Test Suite (244 tests)
uv run pytest -v

# 2. Phase 19 Ecosystem Integration Tests
uv run pytest tests/test_e2e_ecosystem.py -v

# 3. Code Style & Formatting
uv run ruff check .
uv run ruff format --check .

# 4. Database Migration Head Check
uv run alembic heads
uv run alembic current
```

### Frontend Verification
```bash
cd frontend
# 1. Vitest Component Suite (131 tests)
npx vitest run

# 2. Linting & Type Check
npm run lint
npx tsc --noEmit

# 3. Production Build
npm run build
```

---

## 📂 Repository Structure

```text
SIH-2026-SkillSync-AI/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # REST route controllers (Auth, Skills, Jobs, Passport, Outcomes, etc.)
│   │   ├── core/              # Database, Redis, security, configuration
│   │   ├── db/seed.py         # Deterministic demo ecosystem seed & reset
│   │   ├── models/            # SQLAlchemy 2.0 async domain entities
│   │   ├── schemas/           # Pydantic v2 schemas and validators
│   │   └── services/          # Pure business logic and domain services
│   ├── migrations/versions/   # Alembic migration scripts (0001 through 0012)
│   ├── tests/                 # 244 unit, integration, and E2E tests
│   └── pyproject.toml         # uv / pip dependencies and tool configs
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js 15 App Router pages and route handlers
│   │   ├── components/        # Role-specific UI components & AppShell
│   │   └── context/           # Auth and global application state providers
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── architecture/          # System architecture and Mermaid models
│   ├── phase-19-integration-map.md
│   ├── SIH_DEMO_GUIDE.md      # Evaluator live demonstration walkthrough
│   ├── SIH_FINAL_PRESENTATION_FLOW.md
│   └── sih-demo-runbook.md    # Operational execution & recovery runbook
├── scripts/
│   ├── run_demo.py            # Automated demo verifier and reset utility
│   └── seed_demo.py           # Standalone deterministic seeder
├── docker-compose.yml         # Container definitions
└── README.md
```

---

## 🔒 Security & Privacy Commitments

- **Zero-PII Analytics**: All public, government, and Digital Twin endpoints return pure mathematical aggregates without leaking candidate PII.
- **Cryptographic Access Tokens**: Authenticated sessions utilize HMAC-SHA256 JWT tokens with role-based access control (RBAC).
- **IDOR Protection**: Strict ownership checks enforce candidate, employer, and training provider entity isolation.
- **On-Premise AI Execution**: Skill parsing runs on local Ollama instances, ensuring proprietary job specifications and resumes never leave local infrastructure.

---

## 📄 License
This project is licensed under the Apache 2.0 Open Source License.

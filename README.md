# SkillSync AI 🚀

> **AI-Powered Skill Development & Employment Ecosystem**  
> *Industry Demand → Skill Intelligence → Training → Verified Competency → Employment → Outcome Feedback*

SkillSync AI is an open-source platform that aligns vocational training and curriculum design with real-time and emerging industry demand. By connecting employers, government skill missions, training institutes, and candidates, SkillSync AI replaces guesswork and enrollment-only metrics with dynamic skill intelligence, verifiable competency tracking, and evidence-based employment outcomes.

---

## 🏗️ Architecture

SkillSync AI is architected as a high-performance **Modular Monolith**:

```text
                        ┌────────────────────────┐
                        │    Next.js Frontend    │
                        │ (TypeScript + Tailwind)│
                        └───────────┬────────────┘
                                    │ REST / JSON
                                    ▼
                        ┌────────────────────────┐
                        │    FastAPI Backend     │
                        │ (Async Python 3.12+)   │
                        └───────┬────────┬───────┘
                                │        │
                     ┌──────────┘        └──────────┐
                     ▼                              ▼
          ┌────────────────────┐          ┌───────────────────┐
          │     PostgreSQL     │          │       Redis       │
          │     + pgvector     │          │  (Cache & Queue)  │
          └──────────┬─────────┘          └───────────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │ Local AI / ML Core │
          │ (Ollama, Sentence- │
          │  Transformers,     │
          │  spaCy, Scikit)    │
          └────────────────────┘
```

See [System Architecture](docs/architecture.md) for full technical rationale.

---

## 🧰 Free & Open-Source Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), Lucide Icons
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async), [Pydantic v2](https://docs.pydantic.dev/), [Alembic](https://alembic.sqlalchemy.org/)
- **Database & Search**: [PostgreSQL](https://www.postgresql.org/) with [`pgvector`](https://github.com/pgvector/pgvector) for semantic vector similarity
- **Cache & Message Broker**: [Redis](https://redis.io/)
- **Local AI & NLP**: [Ollama](https://ollama.ai/) (Local LLMs: Mistral / Llama), [Sentence Transformers](https://sbert.net/), [spaCy](https://spacy.io/), [scikit-learn](https://scikit-learn.org/)
- **Testing & Quality**: [Pytest](https://pytest.org/), [Ruff](https://astral.sh/ruff), [ESLint](https://eslint.org/), [Vitest](https://vitest.dev/)
- **Containers (Optional)**: Docker Compose & Podman Compose

---

## 📁 Repository Structure

```text
skillsync-ai/
├── README.md
├── LICENSE                     # Apache 2.0 Open Source
├── .gitignore
├── .env.example                # Safe development defaults
├── CONTRIBUTING.md             # Contribution guidelines
├── SECURITY.md                 # Vulnerability disclosure
├── docker-compose.yml          # Container configuration (PostgreSQL + pgvector, Redis)
├── podman-compose.yml          # Podman configuration
│
├── docs/
│   ├── architecture.md         # System design and architecture
│   ├── development.md          # Branching, workflow & setup guide
│   └── api.md                  # REST API specification
│
├── frontend/                   # Next.js App Router frontend
│   ├── src/
│   │   ├── app/                # Pages, layouts, styles
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/                # API client & helpers
│   │   └── types/              # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # Versioned routers (/api/v1/)
│   │   ├── core/               # Configuration, DB & Redis
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── ai/                 # Ollama & local AI client
│   ├── migrations/             # Alembic migration scripts
│   ├── tests/                  # Pytest test suite
│   └── requirements.txt
│
├── ml/                         # ML models, notebooks & experiments
├── data/                       # Raw, processed & sample datasets
├── scripts/                    # Automation and setup scripts
└── .github/workflows/ci.yml    # GitHub Actions CI workflow
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (Node 20 or 22 recommended)
- **Python**: 3.12+ (tested up to 3.14) & [`uv`](https://github.com/astral-sh/uv)
- **PostgreSQL**: 15+ (with `pgvector`)
- **Redis**: 6+ (optional for initial setup)

### 2. Start Services (Docker or Podman)
```bash
# Using Docker Compose:
docker compose up -d

# Or using Podman Compose:
podman-compose up -d
```
*Note: The application is fully capable of running against local PostgreSQL and handles Redis/Ollama gracefully if they are offline.*

### 3. Start Backend
```bash
cd backend

# Setup virtual environment and install dependencies
uv venv
# Activate virtual environment:
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
uv pip install -r requirements.txt

# Run migrations (when DB is ready)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
- Frontend Web App: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing & Linting

### Backend Tests
```bash
cd backend
ruff check .
pytest -v
```

### Frontend Tests & Validation
```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test
npm run build
```

---

## 🌿 Git & Contribution Workflow

SkillSync AI utilizes GitFlow:
- `main`: Production and tagged release versions (`v0.1.0`, etc.)
- `develop`: Central integration branch
- `feature/*`: Specific phase or feature branches

See [Development Guide](docs/development.md) and [Contributing Guide](CONTRIBUTING.md) for branch rules and PR requirements.

---

## 📄 License
This project is open-source under the [Apache 2.0 License](LICENSE).

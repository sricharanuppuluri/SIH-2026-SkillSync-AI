# SkillSync AI — System Architecture

## 1. Overview

**SkillSync AI** is an AI-powered, industry-driven skill development ecosystem designed to align vocational training programs with real-time and emerging employment demand.

The architecture is built on a **Modular Monolith** pattern:

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

## 2. Why a Modular Monolith?

Rather than prematurely adopting distributed microservices, SkillSync AI leverages a **modular monolith** for the following reasons:

1. **Unified Domain Modeling**: Core entities (Candidates, Jobs, Skills, Courses, Credentials) share relational consistency and transaction boundaries within PostgreSQL.
2. **Simplified Deployment & Operations**: Runs seamlessly on local developer workstations without complex service meshes, distributed tracing overhead, or multi-repo synchronization.
3. **High Performance**: In-process calls avoid network serialization and latency penalties for internal service queries.
4. **Future Extraction**: Clear modular boundaries (`app/api/v1/endpoints/`, `app/services/`, `app/models/`) allow distinct services (such as the AI matching engine or outcome intelligence) to be extracted into standalone services if throughput demands scale.

## 3. Core Architectural Layers

### 3.1 Frontend Layer (Next.js)
- **Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS, shadcn/ui design patterns, Lucide icons.
- **State & Data Fetching**: Typed API abstractions (`src/lib/api.ts`), dynamic client components, server components for pre-rendering where appropriate.
- **Dynamic-First Principle**: Dashboards and metric cards consume live backend REST APIs rather than hardcoding static mock numbers.

### 3.2 API & Application Layer (FastAPI)
- **Framework**: FastAPI with Python async handlers (`asyncio`).
- **Data Validation & Schemas**: Pydantic v2 schemas for request validation and response serialization.
- **Routing**: Versioned routers mounted under `/api/v1/`.
- **Dependency Injection**: Reusable dependencies for database sessions (`get_db`), Redis clients, and authentication contexts.

### 3.3 Persistence & Vector Search (PostgreSQL + pgvector)
- **ORM & Migrations**: SQLAlchemy 2.0 (async engine) + Alembic.
- **Relational Data**: Candidates, employers, job requisitions, courses, skill taxonomy, application records.
- **Vector Search (`pgvector`)**: Stores high-dimensional embeddings for candidate resumes, job descriptions, and skill taxonomy definitions to power semantic similarity matching without proprietary third-party vector databases.

### 3.4 Caching & Async Acceleration (Redis)
- **Caching**: Caches frequently queried skill taxonomies, district-level aggregation summaries, and session states.
- **Rate Limiting & Temporary Data**: Fast in-memory state tracking.
- **Background Tasks**: Task queues for heavier ML processing or PDF resume parsing.

### 3.5 Local AI / ML Subsystem
- **LLM Engine**: Ollama running locally (e.g. Mistral, Llama 3, or Phi-3).
- **Embeddings**: Sentence-Transformers / local embedding models (`nomic-embed-text`, `all-MiniLM-L6-v2`).
- **NLP & Taxonomy Extraction**: spaCy, regex, and scikit-learn for skill entity recognition and gap analysis.
- **Resilience**: The backend is architected to operate gracefully even when local AI models are offline or downloading.

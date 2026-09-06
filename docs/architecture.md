# SkillSync AI — System Architecture

## 1. Overview

**SkillSync AI** is an AI-powered, industry-driven skill development ecosystem designed to align vocational training programs with real-time and emerging employment demand.

The architecture is built on a **Modular Monolith** pattern:

```text
                        ┌────────────────────────┐
                        │    Next.js Frontend    │
                        │ (TypeScript + Tailwind)│
                        └───────────┬────────────┘
                                    │ REST / JSON (JWT Bearer)
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
- **Framework**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS, shadcn/ui design patterns, Lucide icons.
- **Authentication**: `AuthProvider` and `useAuth()` centralized React context with token persistence in `localStorage`.
- **Role-Aware Navigation**: Nav items dynamically filtered based on authenticated user's RBAC role (`CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT`, `ADMIN`).

### 3.2 API & Application Layer (FastAPI)
- **Framework**: FastAPI with Python async handlers (`asyncio`).
- **Data Validation & Schemas**: Pydantic v2 schemas for request validation and response serialization.
- **Authentication & Security**: Bcrypt salted password hashing, JWT bearer token verification (`python-jose`), and reusable dependency injection (`get_current_user`, `require_authenticated_user`, `require_roles`).
- **Anti-Privilege Escalation**: Public registration rejects unauthorized privilege escalation (`ADMIN` role assignment).

### 3.3 Persistence & Vector Search (PostgreSQL + pgvector)
- **ORM & Migrations**: SQLAlchemy 2.0 (async engine) + Alembic.
- **Identity & RBAC Schema**: `users` table with UUID primary key, indexed unique email, salted password hash, `user_role` enum, and active status flag.
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

---

## 4. Core Domain Models & Relational Architecture (Phase 3)

The domain foundation establishes relational models, constraints, and cascade policies across the core actors and capabilities:

```text
               User (id, email, role)
                ├── CandidateProfile (user_id -> users.id)
                │     ├── CandidateSkill (candidate_id, skill_id, proficiency)
                │     ├── Application (candidate_id, job_id, status)
                │     └── Enrollment (candidate_id, course_id, status)
                │
                ├── EmployerProfile (user_id -> users.id)
                │     └── Job (employer_id -> employer_profiles.id)
                │           ├── JobSkill (job_id, skill_id, importance)
                │           └── Application (candidate_id, job_id, status)
                │
                ├── TrainingProviderProfile (user_id -> users.id)
                │     └── Course (provider_id -> training_provider_profiles.id)
                │           ├── CourseSkill (course_id, skill_id)
                │           └── Enrollment (candidate_id, course_id, status)
                │
                ├── GovernmentProfile (user_id -> users.id)
                │
                └── Skill (canonical taxonomy; id, name, normalized_name)
```

### 4.1 Primary Domain Entities

1. **User**: Core authentication identity and RBAC role. Has 1-to-1 relationships to role-specific profiles.
2. **CandidateProfile**: Job seeker profile (education, experience, location, bio).
3. **EmployerProfile**: Corporate hiring identity (company name, industry, size, location).
4. **TrainingProviderProfile**: Educational/vocational institution identity (accreditation, capacity).
5. **GovernmentProfile**: Labor analytics and public policy department profile.
6. **Skill**: Canonical skill taxonomy node. Enforces unique `normalized_name` for deduplication.
7. **Job**: Employer requisition specifying location, employment type, seniority, salary bounds.
8. **JobSkill**: Many-to-many junction attaching required skills, proficiency expectations, and weights to jobs.
9. **CandidateSkill**: Candidate competency profile linking verified skills and years of experience.
10. **Course**: Training curriculum offered by a provider with duration, mode, capacity, and seat tracking.
11. **CourseSkill**: Many-to-many junction attaching skills taught by a course curriculum.
12. **Application**: Formal job application tracking candidate status transitions (`APPLIED` → `HIRED`/`REJECTED`).
13. **Enrollment**: Course registration tracking candidate training progression (`ENROLLED` → `COMPLETED`/`DROPPED`).

### 4.2 Referential Integrity & Cascade Guarantees
- **User Cascade**: Deleting a `User` cascades to delete their respective profile (`CandidateProfile`, `EmployerProfile`, `TrainingProviderProfile`, `GovernmentProfile`).
- **Profile Cascade**: Deleting an `EmployerProfile` cascades to their `Job` listings; deleting a `TrainingProviderProfile` cascades to their `Course` offerings; deleting a `CandidateProfile` cascades to their `CandidateSkill`, `Application`, and `Enrollment` rows.
- **Skill Protection**: Canonical `Skill` records are referenced via foreign keys with cascade deletion on junction tables to maintain referential hygiene while preserving taxonomy integrity.
- **Deduplication**: Composite unique constraints prevent duplicate applications (`candidate_id`, `job_id`), duplicate enrollments (`candidate_id`, `course_id`), and duplicate junction assignments.

---

## 5. Employer Module Architecture (Phase 4 — Active)

### 5.1 Multi-Tenant Ownership & Isolation Model
To ensure absolute data isolation across different hiring organizations:
1. **Server-Derived Identity**: The employer's identity is strictly resolved from the authenticated JWT session (`current_user.id` → `EmployerProfile.id`). Client requests cannot supply an arbitrary `employer_id`.
2. **Access Control Barrier**:
   - `require_roles(UserRole.EMPLOYER, UserRole.ADMIN)` protects all `/api/v1/employer/*` endpoints.
   - Candidates and unauthenticated callers are rejected with HTTP 403 and 401 respectively.
3. **Information Concealment**: Cross-tenant attempts (e.g. Employer A requesting Employer B's job or applicant) return HTTP `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.

### 5.2 Deterministic Requisition Lifecycle State Machine
Job requisitions follow an explicit deterministic lifecycle:
```text
  ┌─────────┐      publish      ┌───────────┐       close       ┌────────┐
  │  DRAFT  │ ────────────────> │ PUBLISHED │ ────────────────> │ CLOSED │
  └─────────┘                   └───────────┘                   └────────┘
       ▲                              │                              │
       │                              │                              │
       └────────── re-open ───────────┴────────── re-open ───────────┘
```
- **Draft**: Editable, unindexed, not accepting submissions.
- **Published**: Readily visible to candidates, accepting applications, active in search indexes. Synchronizes `is_active=True`.
- **Closed**: Locked from candidate applications, preserves historical analytics and applicant records. Synchronizes `is_active=False`.

### 5.3 Live Aggregated Metrics Engine
The employer dashboard operates on zero mocked or hardcoded statistics. Key performance metrics are calculated in real time using SQL aggregations:
- Total, published, draft, and closed jobs directly queried against the employer's profile.
- Total application count and status breakdown (`APPLIED`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `REJECTED`, `HIRED`) computed via joined grouping.
- Submissions and requisitions are presented in real time with pagination and filtering.

### 5.4 Frontend Architecture
- **EmployerDashboard**: Rendered on `/dashboard` when user role is `EMPLOYER`.
- **SkillSelector**: Reusable competency intake component querying the canonical taxonomy, enforcing uniqueness, and assigning proficiency thresholds and weight parameters.
- **Role-Aware Sidebar**: Dynamic navigation items (`Manage Jobs`, `Review Applicants`, `Company Profile`) scoped by RBAC role with client-side and server-side route guards.

# SkillSync_AI — Technical Architecture & Engineering Defense

> **Smart India Hackathon 2026 — Comprehensive Engineering & Deep Technical Defense**  
> **Platform Version**: `v1.0.0-RC` (Release Candidate, Commit: `e7fae90`)  
> **Architecture Style**: Local-First, Highly Cohesive Modular Monolith

---

## 1. Executive Architectural Overview

SkillSync_AI is engineered as a high-performance **modular monolith** that unifies relational data, cryptographic credentials, semantic vector search, and local AI inference into an autonomous, closed-loop skill intelligence ecosystem.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 15 Web Frontend                         │
│   (App Router, React 19, TailwindCSS, Lucide Icons, WCAG 2.1 AA)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST + Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application Core                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Domain Services Layer                     │   │
│   │  • Auth & RBAC        • Canonical Skill Taxonomy               │   │
│   │  • Employer & Jobs    • Skill Contracts & SLAs                 │   │
│   │  • Candidate & Resume • Skill Gap Engine                       │   │
│   │  • Training Supply    • Cryptographic Skill Passport           │   │
│   │  • Demand Twin        • Forecasting & What-If Simulator        │   │
│   │  • Semantic Matching  • Outcomes, Retention & Provider PPI     │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │ Async SQLAlchemy 2.0 / Pydantic v2│
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐             ┌────────────────────────────────┐
│     PostgreSQL 16 + pgvector    │             │       Local AI Engine          │
│  • Relational Schema (ACID)     │             │  • Ollama (Open-Weight LLMs)   │
│  • 384-d Vector Embeddings      │             │  • Sentence Transformers       │
│  • HNSW / IVFFlat Vector Index  │             │    (all-MiniLM-L6-v2)          │
│  • Cryptographic Hash Records   │             │  • Bounded Timeouts (1.5s/30s) │
│  • Linear Alembic Migrations    │             │  • Heuristic Regex Fallback    │
└─────────────────────────────────┘             └────────────────────────────────┘
```

---

## 2. Deep-Dive: Core Engineering Decisions

### 2.1 Why a Modular Monolith over Microservices?
1. **Zero Distributed Transaction Complexity**: The closed-loop ecosystem spans 18 interrelated milestones. When a student completes a course, that event triggers: (1) assessment grade persistence, (2) cryptographic passport minting, (3) skill gap recomputation, and (4) job match index updates. In a microservices architecture, this requires distributed 2-phase commits or complex Saga orchestrators with eventual consistency lag. In our modular monolith, these execute within atomic ACID transactions in PostgreSQL.
2. **Sub-Millisecond In-Process Communication**: Domain services call each other via asynchronous in-memory interfaces rather than high-latency HTTP/gRPC network hops.
3. **Turnkey Deployment**: One containerized deployable package for simple deployment in institutional datacenters without requiring a dedicated Kubernetes cluster.

### 2.2 Why PostgreSQL 16 + pgvector over Separate Vector Databases?
1. **Single Source of Truth**: External vector databases (e.g., Pinecone, Milvus, Qdrant) require dual-writing from PostgreSQL. If a job is deleted in PostgreSQL, an asynchronous worker must synchronize the vector store, creating eventual consistency gaps and data drift.
2. **Hybrid Unified Queries**: With `pgvector`, we can run single, elegant SQL queries combining relational predicates with vector similarity:
   ```sql
   SELECT c.id, c.full_name,
          1 - (cs.embedding <=> :job_requirement_vector) AS cosine_similarity
   FROM candidates c
   JOIN candidate_skills cs ON c.id = cs.candidate_id
   JOIN verified_passports vp ON cs.skill_id = vp.skill_id AND vp.is_valid = TRUE
   WHERE c.is_active = TRUE
     AND c.preferred_location = :location
   ORDER BY cosine_similarity DESC
   LIMIT 20;
   ```
3. **Cost & Sovereignty**: Zero SaaS licensing fees; runs within standard PostgreSQL hosting.

### 2.3 Why Local AI (Ollama) over Commercial Cloud APIs?
1. **Candidate Data Sovereignty**: Transmitting student resumes, employment histories, and salary benchmarks to OpenAI or Anthropic violates Indian data protection principles (DPDP Act). Local Ollama inference ensures zero citizen PII ever leaves the server.
2. **Zero Marginal Operating Cost**: Parsing 100,000 resumes on cloud APIs costs $3,000+. On local hardware, it costs $0.00 in API fees.
3. **Deterministic Offline Resilience**: Even in air-gapped test environments or during internet outages, local AI continues executing.

---

## 3. Pragmatic AI Architecture: AI vs. Deterministic Governance

To prevent hallucination and maintain absolute legal and financial integrity, SkillSync_AI enforces a strict separation between **probabilistic AI assistance** and **authoritative deterministic rules**:

| Ecosystem Domain | Probabilistic AI / ML Component | Authoritative Deterministic Component | Rationale & Safety Boundary |
| :--- | :--- | :--- | :--- |
| **Skill Extraction** | Local LLM extracts raw skill strings from resumes and job descriptions | Canonical Skill Taxonomy Resolver maps strings strictly to database IDs via alias lookup | LLMs propose skill labels, but only canonical, verified database skills are recorded. |
| **Semantic Matching** | Sentence Transformers generate dense 384-dimensional semantic vectors | Cosine distance scored in pgvector with verified passport weight multipliers (+20%) | Vectors bridge vocabulary gaps, but verified credentials deterministically boost ranking. |
| **Career Copilot** | LLM generates conversational career advice and lesson suggestions | Prompt templates grounded strictly in active job requirements; 1.5s timeout circuit breaker | AI advises, but cannot modify database state or guarantee interviews. |
| **Demand Forecasting** | Holt-Winters exponential smoothing & linear trend time-series models | Aggregated historical job postings, rolling standard deviation confidence bounds | Statistical mathematics replaces subjective guesswork; bounded by historical variance. |
| **Skill Contracts** | None | Cryptographic database record with SLA turnaround and legally binding terms | Zero AI involvement. Contract terms are legally binding database commitments. |
| **Skill Passport** | None | SHA-256 hash chaining: $\text{Hash}_n = \text{SHA256}(\text{Data} + \text{Hash}_{n-1})$ | Zero AI involvement. Cryptographic proof guaranteed by mathematics. |
| **Provider PPI** | None | Mathematical composite index: $\text{PPI} = 0.40P + 0.35R + 0.25S$ | Zero AI involvement. Institute rankings reflect audited database outcomes. |

---

## 4. Cryptographic Verified Skill Passport Engine

### 4.1 Immutable Chaining Mechanism
When a candidate passes an accredited course assessment (≥70%), the backend mints a verified credential:
$$\text{Payload} = \{\text{candidate\_id}, \text{skill\_id}, \text{provider\_id}, \text{score}, \text{timestamp}, \text{prev\_hash}\}$$
$$\text{Current Hash} = \text{SHA-256}(\text{JSON}(\text{Payload}))$$

### 4.2 Tamper Evidence & Verification
- The resulting hash is permanently anchored in the `verified_passports` table with a public UUID `share_token`.
- When an employer or judge navigates to `/passport/share/[token]`, the server validates the hash chain against stored parameters. If a malicious actor alters a candidate's score or skill level in the database directly, the calculated hash mismatches, and the verification status displays `INVALID / TAMPERED`.

---

## 5. Demand Forecasting & Policy Simulation Algorithms

### 5.1 Demand Forecasting Model
The forecasting engine evaluates skill signals over 30, 60, and 90-day time horizons:
1. **Decomposition**: Time series is decomposed into baseline level ($L_t$), trend velocity ($T_t$), and seasonal components ($S_t$).
2. **Backtesting & Accuracy**: Computes Mean Absolute Error (MAE) against recent 30-day historical actuals, displaying backtested confidence metrics directly on government dashboards.

### 5.2 What-If Policy Simulation Mechanics
1. **In-Memory Non-Destructive Clones**: When a planner runs a simulation, live tables are never mutated. State vectors are cloned into transient memory.
2. **Perturbation Propagation**: Applying a policy vector (e.g., $+20\%$ EV manufacturing incentive) multiplies baseline demand for associated skills using a cross-elasticity coefficient matrix.
3. **Side-by-Side Delta**: The engine outputs baseline vs. simulated deltas, highlighting impending regional shortages.

---

## 6. Outcome Intelligence & Provider Performance Index (PPI)

### 6.1 Mathematical Formulation
The closed loop measures post-hiring success at 30, 60, and 90-day intervals:
$$\text{PPI} = (0.40 \times P) + (0.35 \times R_{90}) + (0.25 \times S_{\text{employer}})$$
- $P$ (**Placement Rate**): $\frac{\text{Verified Hires}}{\text{Certified Course Graduates}}$
- $R_{90}$ (**90-Day Retention Rate**): $\frac{\text{Candidates Retained at 90 Days}}{\text{Total Verified Hires}}$
- $S_{\text{employer}}$ (**Employer Satisfaction Score**): Normalized average 1-to-5 star rating on real-world competency.

### 6.2 Feedback Ingestion
High PPI scores dynamically increase a training provider's visibility in candidate course discovery and update government subsidy eligibility algorithms.

---

## 7. Security, Authorization & Privacy Defense

1. **Strict RBAC & Token-Bound IDOR Protection**:
   - Access tokens use cryptographically signed JWTs (`HS256`).
   - Every API query validates that `current_user.id` or `current_user.organization_id` strictly matches the targeted resource.
2. **Password Security**: Bcrypt with salt rounds for all user credentials.
3. **Prompt Injection Defense**:
   - User inputs to the Career Copilot are treated as untrusted data strings within rigid delimiters.
   - Copilot operates with zero database write permissions.
4. **Security Headers & Sanitization**:
   - HSTS, X-Content-Type-Options, X-Frame-Options, and strict CORS origins.
   - Pydantic v2 sanitizes inputs, preventing SQL injection and XSS payloads.

---

## 8. Scalability & Performance Benchmarks

### 8.1 Production Build & Test Validation
- **Backend Test Suite**: **244 / 244 passed** (0 failures, 100% pass rate).
- **Frontend Test Suite**: **131 / 131 passed** across 32 test files.
- **Frontend Compilation**: **38 Next.js routes** statically and dynamically compiled.
- **Lint & Types**: 0 Ruff warnings, 0 ESLint warnings, 0 TypeScript errors.

### 8.2 Production Scale Strategy
- **API Statelessness**: FastAPI instances run statelessly behind NGINX or AWS ALB.
- **Database Concurrency**: PostgreSQL with pgBouncer connection pooling supports 10,000+ concurrent connections.
- **Read Replicas**: High-volume public passport verifications and demand heatmaps can be routed to read replicas.
- **Background Tasks**: Redis-backed Celery workers handle heavy embedding generation and resume parsing asynchronously.

# SkillSync_AI — Technical Architecture & Engineering Defense

> **Smart India Hackathon 2026 — Comprehensive Engineering & Technical Defense**  
> **Platform Version**: `v1.0.0-RC` (Release Candidate, Commit: `10fffe4`)  
> **Architecture Style**: Local-First, Highly Cohesive Modular Monolith

---

## 1. Architectural Overview

SkillSync_AI is structured as a **modular monolith** that unifies relational data, competency credentials, semantic vector search, and local AI inference into an integrated, feedback-driven skill intelligence ecosystem.

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
│   │  • Employer & Jobs    • Skill Contracts                        │   │
│   │  • Candidate & Resume • Skill Gap Engine                       │   │
│   │  • Training Supply    • Verified Skill Passport                │   │
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
│  • Relational Schema (ACID)     │             │  • Ollama (mistral:latest def) │
│  • 384-d Vector Embeddings      │             │  • Sentence Transformers       │
│  • Cosine Similarity Search     │             │    (all-MiniLM-L6-v2)          │
│  • Linear Alembic Migrations    │             │  • Bounded Timeouts (1.5s/30s) │
│  • Single Head: 0012            │             │  • Heuristic Regex Fallback    │
└─────────────────────────────────┘             └────────────────────────────────┘
```

---

## 2. Core Architectural Decisions

### 2.1 Why a Modular Monolith over Microservices?
1. **Atomic Transactional Integrity**: The closed-loop ecosystem spans 18 interrelated milestones. When a student completes a course, that event triggers: (1) enrollment status persistence, (2) evidence creation, (3) verified skill recalculation, and (4) job match updates. In a microservices architecture, this requires distributed transactions or eventual consistency patterns. In our modular monolith, these execute within atomic ACID transactions in PostgreSQL.
2. **Low Communication Overhead**: Domain services interact via asynchronous Python interfaces rather than multi-hop HTTP/gRPC network calls.
3. **Operational Simplicity**: A single deployable containerized package simplifies evaluation and deployment in institutional environments.

### 2.2 Why PostgreSQL 16 + pgvector over Separate Vector Databases?
1. **Single Source of Truth**: External vector databases (e.g., Pinecone, Milvus) require dual-writing from PostgreSQL. If an entity is updated or deleted, asynchronous sync workers must manage eventual consistency.
2. **Unified Relational and Vector Queries**: With `pgvector`, we execute single queries that filter records using standard relational conditions while ranking results by vector similarity:
   ```sql
   SELECT c.id, c.headline,
          1 - (cs.embedding <=> :target_skill_vector) AS cosine_similarity
   FROM candidate_profiles c
   JOIN candidate_skills cs ON c.id = cs.candidate_id
   JOIN verified_skills vs ON cs.skill_id = vs.skill_id AND vs.verification_status = 'VERIFIED'
   WHERE c.is_active = TRUE
   ORDER BY cosine_similarity DESC
   LIMIT 20;
   ```
3. **Open-Source & Self-Hostable**: Avoids external cloud vendor dependencies and commercial subscription fees.

### 2.3 Why Local AI (Ollama) over Commercial Cloud APIs?
1. **Citizen Data Privacy**: Processing candidate resumes and career records locally prevents sensitive personal data from traversing commercial third-party servers.
2. **Zero Commercial API Dependencies**: Running local inference avoids recurring per-token cloud API costs.
3. **Predictable Operation**: The system remains functional without requiring external internet connectivity.

---

## 3. Pragmatic AI Architecture: AI Assistance vs. Deterministic Governance

SkillSync_AI strictly separates **probabilistic AI assistance** from **authoritative deterministic rules**:

| Ecosystem Domain | Probabilistic AI / ML Component | Authoritative Deterministic Component | Rationale & Safety Boundary |
| :--- | :--- | :--- | :--- |
| **Skill Extraction** | Local LLM extracts raw candidate skill strings from text | Canonical Skill Taxonomy Resolver maps strings strictly to database IDs via alias lookups | AI proposes skill labels, but only canonical, database-backed skills are recorded. |
| **Semantic Matching** | Sentence Transformers (`all-MiniLM-L6-v2`) generate 384-d vectors | Cosine distance scored in pgvector with verified credential weight multipliers (+20%) | Vectors bridge vocabulary gaps, while verified evidence deterministically boosts rank. |
| **Career Copilot** | LLM generates contextual advice grounded in database facts | Prompt templates grounded in active job requirements; 1.5s circuit breaker on health checks | AI advises the student, but cannot mutate database records or grant credentials. |
| **Demand Forecasting** | Holt exponential smoothing & linear trend time-series models | Aggregated historical job postings, rolling standard deviation confidence bounds | Statistical mathematics replaces subjective guesswork; bounded by historical variance. |
| **Skill Contracts** | None | Versioned database record with proficiency levels and evidence types | Zero AI involvement. Formal, versioned competency specification. |
| **Skill Passport** | None | Deterministic evidence precedence (Certification > Course > Assessment > Declaration) | Zero AI involvement. Credential status is governed strictly by verifiable evidence. |
| **Provider PPI** | None | Deterministic formula: $0.25\,\text{Comp} + 0.35\,\text{Place} + 0.20\,\text{Ret} + 0.20\,\text{EmpRating}$ | Zero AI involvement. Provider ratings reflect audited database outcomes. |

---

## 4. Verified Skill Passport Engine

### 4.1 Evidence-Backed Verification Hierarchy
Implemented in `backend/app/services/verified_skill_service.py`, verification is rule-driven:
- `EvidenceType.CERTIFICATION` ➔ `VERIFIED`
- `EvidenceType.COURSE_COMPLETION` (100% curriculum of published course) ➔ `VERIFIED`
- `EvidenceType.ASSESSMENT` ➔ `VERIFIED`
- `EvidenceType.RESUME_EXTRACTION` ➔ `UNVERIFIED`
- `EvidenceType.CANDIDATE_DECLARATION` ➔ `UNVERIFIED`

Self-declarations and unverified extractions never grant verified status.

### 4.2 Secure Public Sharing
- Public sharing is managed using cryptographically secure tokens generated via `secrets.token_urlsafe(32)`.
- When an external evaluator accesses `/passport/share/[token]`, the platform returns a read-only view of verified competencies without exposing private contact details or requiring user login.

---

## 5. Demand Forecasting & Policy Simulation Algorithms

### 5.1 Demand Forecasting Model
Implemented in `backend/app/services/demand_forecast_service.py`:
1. **Holt Linear Exponential Smoothing**: Used when $n \ge 6$ historical monthly observations exist (`statsmodels.tsa.api.Holt` with `smoothing_level=0.4, smoothing_trend=0.2`).
2. **Linear Trend Regression**: Used when $3 \le n < 6$ observations exist via `np.polyfit`.
3. **Baseline Fallback**: Used for sparse history ($n < 3$) using recent rolling averages.
4. **Accuracy Metrics**: Backtested Mean Absolute Error (MAE) and 95% confidence bounds are computed and displayed on government dashboards.

### 5.2 What-If Policy Simulation Mechanics
1. **In-Memory Non-Destructive Execution**: When a policy simulation runs, operational database tables are never mutated. State vectors are evaluated in transient memory.
2. **Perturbation Propagation**: Sectoral policy shocks apply multiplier vectors across canonical skills.
3. **Side-by-Side Comparison**: Outputs baseline historical metrics alongside simulated projections across 30, 60, and 90-day horizons.

---

## 6. Outcome Intelligence & Provider Performance Index (PPI)

### 6.1 Mathematical Formulation
Implemented in `backend/app/services/outcome_service.py` (lines 40–88):
$$\text{PPI} = (0.25 \times \text{Comp}) + (0.35 \times \text{Place}) + (0.20 \times \text{Ret}_{90\text{d}}) + (0.20 \times \text{EmpRating})$$
- $\text{Comp}$ (**Completion Rate**): Course completion percentage (0–100).
- $\text{Place}$ (**Placement Rate**): Verified placements divided by certified course graduates (0–100).
- $\text{Ret}_{90\text{d}}$ (**90-Day Retention Rate**): Percentage of placed candidates retaining employment at 90 days (0–100).
- $\text{EmpRating}$ (**Normalized Employer Rating**): $(\frac{\text{Average Rating}}{5.0}) \times 100$.

### 6.2 Performance Tiers
- $\ge 85.0$: **Tier 1 (Excellent)**
- $\ge 70.0$: **Tier 2 (Proficient)**
- $\ge 50.0$: **Tier 3 (Developing)**
- $< 50.0$: **Tier 4 (Needs Improvement)**

---

## 7. Security Architecture & Controls

1. **Authentication & Authorization**:
   - Stateless JWT tokens signed with `HS256` (24-hour validity).
   - Role-Based Access Control enforcing role boundaries: `CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT`, `ADMIN`.
2. **IDOR Protection**:
   - Database queries are scoped by authenticated `user_id` and organization ID, preventing unauthorized cross-tenant data access.
3. **Password Security**:
   - Bcrypt hashing with salt rounds for user credentials.
4. **Defense-in-Depth**:
   - Pydantic v2 input validation sanitizing query inputs.
   - Built-in `SecurityHeadersMiddleware` adding X-Content-Type-Options, X-Frame-Options, and HSTS.
   - Configurable CORS origin filtering.

---

## 8. Scalability: Current Architecture vs. Production Roadmap

| Dimension | Current Implementation (`v1.0.0-RC`) | Production Scaling Roadmap |
| :--- | :--- | :--- |
| **API Layer** | Single-instance asynchronous FastAPI | Horizontal API instances behind NGINX / ALB |
| **Database** | PostgreSQL 16 + pgvector with asyncpg pooling | pgBouncer connection pool + read replicas for analytics |
| **Caching** | Redis 7 local cache for rate limits | Distributed Redis cluster |
| **Heavy Tasks** | In-process asynchronous task execution | Distributed Celery workers for batch embeddings |
| **Inference** | Local Ollama daemon (`mistral:latest` default) | Dedicated GPU inference cluster / vLLM service |

# SkillSync AI — Final SIH 2026 System Architecture

> **Complete Architectural Specification & System Boundaries**  
> *Repository Baseline*: Phase 20 Release Candidate (`develop`)

---

## 1. High-Level Modular Monolith Architecture

SkillSync AI is architected as a modular monolith designed for sub-millisecond in-process domain communication, predictable transactional integrity, and zero third-party cloud lock-in.

```text
┌────────────────────────────────────────────────────────────────────────┐
│               Frontend Presentation Layer (Next.js 15)                 │
│        App Router • React 19 • TypeScript • Tailwind CSS • AppShell     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST / HTTPS (Bearer JWT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FastAPI 0.115 API Gateway & Routing                  │
│       CORS • Security Headers • Rate Limiter • Global Error Sanitizer  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Dependency Injection & RBAC
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Domain Business Services                         │
│  ┌─────────────────────────┬─────────────────────────┬──────────────┐  │
│  │ Skill & Taxonomy        │ Demand Digital Twin     │ Forecasting  │  │
│  │ (50+ Canonical Nodes)   │ (Shortage Ratios)       │ (Statsmodels)│  │
│  ├─────────────────────────┼─────────────────────────┼──────────────┤  │
│  │ Skill Contracts         │ What-If Simulator       │ Learning     │  │
│  │ (Quality Auditing)      │ (Stateless Projection)  │ (Curriculum) │  │
│  ├─────────────────────────┼─────────────────────────┼──────────────┤  │
│  │ Verified Passport       │ Semantic Matching       │ Outcomes     │  │
│  │ (Cryptographic Evidence)│ (pgvector Embeddings)   │ (PPI Engine) │  │
│  └─────────────────────────┴─────────────────────────┴──────────────┘  │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼ Async SQLAlchemy 2.0          ▼ HTTP Local Daemon
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│       PostgreSQL 16 Engine            │ │      Local Ollama LLM        │
│   • Relational Schema (Alembic 0012)  │ │   • Mistral / Llama 3 Model  │
│   • pgvector Extension (1536-dim)     │ │   • Offline Regex Fallback   │
│   • ACID Transactions                 │ │   • Zero Cloud AI Dependency │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 2. Core Subsystems & Technical Details

### 2.1 Authentication & Role-Based Access Control (RBAC)
- **Token Format**: Standard HMAC-SHA256 JSON Web Tokens (JWT) signed with secure server secrets and configurable expiration.
- **Password Security**: Argon2 / Bcrypt password hashing with unique salt generation.
- **Five Primary Personas**:
  - `ADMIN`: Full catalog, taxonomy, and user lifecycle administration.
  - `EMPLOYER`: Job requisition creation, Skill Contract authoring, applicant review, and placement reporting.
  - `CANDIDATE`: Profile management, self-declared skill tracking, skill gap evaluation, course enrollment, and Verified Skill Passport.
  - `TRAINING_PROVIDER`: Accredited curriculum authoring, lesson tracking, graduate certification, and PPI analytics.
  - `GOVERNMENT`: Real-time Demand Digital Twin monitoring, forecasting, what-if scenario simulations, and zero-PII labor analytics.
- **IDOR Protection**: Strict entity ownership validation ensures employers cannot access unassigned applicants or alter competitors' contracts.

### 2.2 Canonical Skill Taxonomy & AI Extraction
- **Canonical Skill Graph**: 50+ curated canonical skills with aliases and hierarchical relations (`PARENT_OF`, `CHILD_OF`, `RELATED_TO`).
- **On-Premise LLM Extraction**: Raw job descriptions, syllabi, and resumes are analyzed locally via Ollama (`mistral`/`llama3`).
- **Resilient Fallback**: If Ollama daemon is offline or times out, an automated regex tokenization engine normalizes terms against known canonical aliases without throwing uncaught server errors.

### 2.3 Embeddings & Semantic Skill Matching
- **High-Dimensional Vector Space**: Vector embeddings generated using local sentence-transformers (`all-MiniLM-L6-v2`) or Ollama embedding models (`nomic-embed-text`).
- **pgvector Cosine Similarity**: Employs PostgreSQL's `pgvector` extension to compute cosine distances (`<=>`), matching candidate profiles against job requirements in under 15ms.

### 2.4 Skill Demand Digital Twin & Forecasting
- **Real-Time Aggregation**: Jobs in `PUBLISHED` status continuously update active platform demand, regional breakdowns, and industry concentrations.
- **Shortage Ratio Formulation**:
  $$\text{Shortage Ratio} = \frac{\text{Active Job Demand}}{\max(\text{Verified Candidate Supply}, 1)}$$
- **Forecasting Engine**: Statistical autoregressive forecasting models expected 1-to-12-month demand trajectories, computing confidence intervals and growth trends.

### 2.5 Stateless What-If Simulator
- **Non-Destructive Simulation**: Simulates policy shocks, verified supply expansions, or training capacity changes against `ACTUAL` or `FORECAST` baselines.
- **Zero Production Mutations**: Pure mathematical in-memory projections ensure zero database writes, protecting production tables from policy experimentation.

### 2.6 Verified Skill Passport & Evidence Engine
- **Verification Guarantee**: Distinguishes between self-reported skills (`UNVERIFIED`) and skills proven through completed course curricula, institutional exams, or verified employer tenure (`VERIFIED`).
- **Public Share Tokens**: Authenticated candidate-owned share tokens enable external employers or recruiters to inspect read-only verified credentials (`/passport/share/[token]`).

### 2.7 Outcome Intelligence & Provider Performance Index (PPI)
- **Verified Placement Tracking**: Records starting salaries, employment contracts, and hiring dates upon candidate selection.
- **Retention Milestones**: Post-hire tracking validates employment durability at 30-day, 90-day, and 180-day benchmarks under strict sequential state machine transitions.
- **Deterministic PPI Formula**:
  $$\text{PPI} = (0.25 \times \text{Completion Rate}) + (0.35 \times \text{Placement Rate}) + (0.20 \times \text{Retention Rate}_{90D}) + (0.20 \times \text{Employer Rating Score})$$
- **Quality Tiers**:
  - `Tier 1 (Excellent)`: $\text{PPI} \ge 85$
  - `Tier 2 (Proficient)`: $70 \le \text{PPI} < 85$
  - `Tier 3 (Developing)`: $50 \le \text{PPI} < 70$
  - `Tier 4 (Needs Improvement)`: $\text{PPI} < 50$

---

## 3. Database Schema & Migration Chain

- Single Alembic Head: `0012_outcome_intelligence`
- Reversible Downgrades: Tested and verified down to `0011_skill_contracts` and re-upgraded seamlessly.
- Table Relationships:
  - `users` 1:1 `candidate_profiles` / `employer_profiles` / `training_provider_profiles`
  - `jobs` 1:N `job_skills` N:1 `canonical_skills`
  - `jobs` 1:1 `skill_contracts` 1:N `skill_contract_requirements`
  - `courses` 1:N `curriculum_modules` 1:N `curriculum_lessons`
  - `applications` 1:1 `placement_outcomes` 1:N `placement_training_attributions`

---

## 4. Security & Privacy Guarantees

1. **Zero-PII Analytics**: All public, government, and Digital Twin endpoints return mathematical aggregates without exposing candidate names, emails, contact details, or resumes.
2. **Sanitized Error Handling**: Global exception handler masks backend stack traces and file paths in production environments.
3. **HTTP Security Headers**: Strict-Transport-Security, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and Content-Security-Policy (CSP) headers applied globally.

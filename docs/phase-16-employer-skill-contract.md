# Phase 16 — Employer Skill Contract Exchange

## 1. Overview & Objective

The **Employer Skill Contract Exchange** establishes a structured, versioned, machine-readable competency and evidence framework for job requisitions in SkillSync AI.

Prior to Phase 16, job requirements relied on basic requirement pairings. Phase 16 elevates requisitions to formal skill contracts that define:
* Canonical skill references (Phase 5 catalog as the single source of truth)
* Required proficiency levels (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
* Requirement tier (`REQUIRED` vs `PREFERRED`)
* Criticality / Importance (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
* Evidence requirements (`NONE`, `VERIFIED_SKILL`, `COURSE_COMPLETION`, `CERTIFICATION`, `PROJECT`, `WORK_EXPERIENCE`)
* Minimum verified experience in months
* Explanatory notes & criteria

```text
Employer
   ↓
Job Requisition
   ↓
Skill Contract (v1, v2...)
   ↓
Canonical Skills (Phase 5)
   ↓
Proficiency & Importance Weights
   ↓
Evidence Requirements (Verified Passport — Phase 12)
   ↓
Deterministic Skill Gap Engine (Phase 8)
   ↓
Market Supply / Demand Twin (Phase 13) & Forecasting (Phase 14)
   ↓
What-If Simulator Pathways (Phase 15)
```

---

## 2. Architecture & Data Model

### 2.1 Database Schema

Two normalized tables were introduced via Alembic migration `0011_skill_contracts`:

#### `skill_contracts`
* `id` (`UUID`, Primary Key)
* `job_id` (`UUID`, Foreign Key to `jobs.id`, ON DELETE CASCADE, Indexed)
* `employer_id` (`UUID`, Foreign Key to `employer_profiles.id`, ON DELETE CASCADE, Indexed)
* `version` (`Integer`, NOT NULL, default 1)
* `status` (`Enum`: `DRAFT`, `ACTIVE`, `ARCHIVED`, NOT NULL)
* `title` (`String(255)`, Optional)
* `created_at` (`DateTime(timezone=True)`, NOT NULL)
* `updated_at` (`DateTime(timezone=True)`, NOT NULL)
* `effective_at` (`DateTime(timezone=True)`, Optional)
* `archived_at` (`DateTime(timezone=True)`, Optional)
* **Partial Unique Index**: `ix_uq_active_contract_per_job` on `(job_id)` WHERE `status = 'ACTIVE'` guaranteeing at most one active contract per job requisition at any given moment.

#### `skill_contract_requirements`
* `id` (`UUID`, Primary Key)
* `contract_id` (`UUID`, Foreign Key to `skill_contracts.id`, ON DELETE CASCADE, Indexed)
* `skill_id` (`UUID`, Foreign Key to `skills.id`, ON DELETE RESTRICT, Indexed)
* `required_proficiency` (`Enum`: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
* `requirement_type` (`Enum`: `REQUIRED`, `PREFERRED`)
* `importance` (`Enum`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
* `minimum_experience_months` (`Integer`, NOT NULL, default 0)
* `evidence_type` (`Enum`: `NONE`, `VERIFIED_SKILL`, `COURSE_COMPLETION`, `CERTIFICATION`, `PROJECT`, `WORK_EXPERIENCE`)
* `notes` (`Text`, Optional)
* `created_at` / `updated_at` (`DateTime(timezone=True)`)
* **Unique Constraint**: `(contract_id, skill_id)` preventing duplicate skill entries within a contract.

---

## 3. Contract Lifecycle & Versioning Rules

```text
       ┌──────────┐
       │  DRAFT   │ ◄─── (Created via POST /api/v1/contracts or POST /version)
       └────┬─────┘
            │  (Atomic Activation)
            ▼
       ┌──────────┐
       │  ACTIVE  │ ───► (Previous active version automatically ARCHIVED)
       └────┬─────┘
            │  (Explicit archive or superseded by new activation)
            ▼
       ┌──────────┐
       │ ARCHIVED │ ───► (Immutable historical record)
       └──────────┘
```

1. **Deterministic Versioning**: Requisitions start at `v1`. Forking creates `v(N+1)` as a new `DRAFT` pre-populated with previous requirements.
2. **Atomic Single-Active Invariant**: Activating a contract executes in a single database transaction, archiving any existing active contract for that job and activating the selected draft.
3. **Immutability of History**: Only `DRAFT` contracts can be edited. `ACTIVE` and `ARCHIVED` contracts are read-only; any requirement changes require creating a new draft version.
4. **Non-Destructive Guarantee**: Old versions are retained for full auditability and historical tracking.

---

## 4. Deterministic Contract Quality Score

The quality score algorithm (`compute_contract_quality_score`) calculates a 0–100 score without LLMs based on 6 deterministic criteria:
1. **Base Presence**: Minimum required skills defined.
2. **Proficiency Completeness**: Explicit proficiency levels assigned.
3. **Evidence Rigor**: Verified evidence criteria specified for critical requirements.
4. **Importance Distribution**: Balanced spread across critical, high, medium, and low tiers.
5. **Experience Feasibility**: Non-negative experience thresholds.
6. **Integrity**: Zero duplicate skills.

Ratings:
* `EXCELLENT` (≥ 85)
* `GOOD` (70–84)
* `FAIR` (50–69)
* `POOR` (< 50)

---

## 5. Subsystem Integrations

### 5.1 Canonical Skill Intelligence (Phase 5)
Every contract requirement strictly maps to an existing canonical skill via `skill_id`. Free-text and uncurated skills are rejected at validation.

### 5.2 Deterministic Skill Gap Engine (Phase 8)
When evaluating a candidate against a job:
* If an `ACTIVE` `SkillContract` exists, the Skill Gap Engine evaluates candidate competencies against contract proficiencies, importance weights, and evidence requirements.
* If no active contract exists, the engine falls back seamlessly to legacy `JobSkill` definitions (100% backward compatible).

### 5.3 Verified Skill Passport (Phase 12)
If a contract requirement specifies `evidence_type = "VERIFIED_SKILL"`, the engine verifies against the candidate's `VerifiedSkill` records. Self-declared skills without passport verification will yield a `PARTIAL` gap with explicit verification advice.

### 5.4 Semantic Matching (Phase 9)
Semantic match scores reflect profile conceptual similarity, but contract compliance strictly evaluates proficiency and evidence criteria, preventing semantic similarity from bypassing mandatory contractual standards.

### 5.5 Market Demand Twin (Phase 13) & Holt-Winters Forecasting (Phase 14)
The contract insights engine aggregates real-time market demand, verified vs self-declared supply, shortage ratios, and 6-month Holt-Winters forecast trends.

### 5.6 What-If Simulator (Phase 15)
Market insight cards provide 1-click deep links to `/simulator?skill_id={id}` for exploring demand surges and supply training interventions without mutating real platform records.

---

## 6. API Reference

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `GET` | `/api/v1/contracts` | List employer skill contracts (filter by `job_id`, `status`) | `EMPLOYER`, `ADMIN` |
| `POST` | `/api/v1/contracts` | Create draft skill contract | `EMPLOYER`, `ADMIN` |
| `GET` | `/api/v1/contracts/{id}` | Get full contract with requirements | `EMPLOYER`, `ADMIN`, `CANDIDATE`* |
| `PUT` | `/api/v1/contracts/{id}` | Update draft contract title & requirements | `EMPLOYER`, `ADMIN` |
| `POST` | `/api/v1/contracts/{id}/activate` | Atomically activate draft contract | `EMPLOYER`, `ADMIN` |
| `POST` | `/api/v1/contracts/{id}/archive` | Archive active contract | `EMPLOYER`, `ADMIN` |
| `POST` | `/api/v1/contracts/{id}/version` | Fork new draft version | `EMPLOYER`, `ADMIN` |
| `GET` | `/api/v1/contracts/{id}/quality` | Get quality score & audit explanation | `EMPLOYER`, `ADMIN` |
| `GET` | `/api/v1/contracts/{id}/insights` | Get market intelligence & supply insights | `EMPLOYER`, `ADMIN` |
| `GET` | `/api/v1/jobs/{job_id}/contract` | Get active contract for a job | All authenticated |
| `GET` | `/api/v1/jobs/{job_id}/contract/history` | Get version history for a job | `EMPLOYER`, `ADMIN` |

---

## 7. Security & IDOR Protection

1. **Ownership Enforcement**: Employers can only view, edit, activate, or archive contracts for jobs belonging to their own `EmployerProfile`. Cross-employer operations return `403 Forbidden` or `404 Not Found`.
2. **RBAC Isolation**: Candidates and Training Providers cannot author, modify, or activate contracts.
3. **Zero PII Exposure**: Contract APIs return strictly skill and requisition metrics, exposing 0 candidate personal data.
4. **Non-Destructive**: Re-calculating quality scores or insights performs read-only aggregates without mutating platform data.

---

## 8. Verification & Quality Gates

* **Backend Tests**: 204/204 passing (`pytest -v`)
* **Backend Formatting/Linting**: `ruff check` (PASS), `ruff format` (PASS)
* **Alembic Migrations**: Single head `0011_skill_contracts`, upgrade/downgrade verified
* **Frontend Tests**: 124/124 passing across 30 test suites (`vitest run`)
* **Frontend Linting**: ESLint clean (0 errors, 0 warnings)
* **TypeScript Compilation**: `tsc --noEmit` (PASS)
* **Production Build**: Next.js production build succeeded with 36 routes

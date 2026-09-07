# SkillSync AI — SIH 2026 Live Demonstration Guide

> **Smart India Hackathon 2026 — SkillSync AI**  
> Complete end-to-end ecosystem demonstration walkthrough for evaluators, judges, and mentors.

---

## Overview

**SkillSync AI** is a full-stack, AI-powered skill development and employment ecosystem connecting **Candidates**, **Employers**, **Training Providers**, and **Government Observers** through transparent, verifiable, AI-driven skill matching and employment outcome tracking.

This guide provides step-by-step demonstration walkthroughs for the SIH live demo session.

---

## Demo Architecture Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                     SkillSync AI Ecosystem                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15 App)   →   http://localhost:3000          │
│  Backend  (FastAPI 0.115)    →   http://localhost:8000          │
│  API Docs (Swagger UI)       →   http://localhost:8000/docs     │
│  PostgreSQL + pgvector       →   localhost:5432                 │
│  Redis (rate limit/cache)    →   localhost:6379                 │
│  Ollama (local LLM)          →   localhost:11434                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pre-Demo Setup (5 minutes before demo)

### 1. Start Infrastructure
```bash
docker-compose up -d postgres redis ollama
# Wait for PostgreSQL healthcheck to pass (~15s)
```

### 2. Apply Migrations
```bash
cd backend
uv run alembic upgrade head
uv run alembic current    # Verify: 0012_outcome_intelligence (head)
```

### 3. Seed Deterministic Demo Data
```bash
python scripts/run_demo.py --reset --check-only
# Expected: [SUCCESS] Deterministic SIH demo database seeding complete!
```

### 4. Start Application Servers

**Backend:**
```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev -- --port 3000
```

### 5. Verify Health
```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy", ...}
```

---

## Demo Persona Accounts

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@skillsync.internal` | `DevPassword123!` | Platform administrator |
| **Candidate** | `dev.candidate@skillsync.internal` | `DevPassword123!` | Demo Candidate — Full Stack & Cloud Developer |
| **Employer** | `dev.employer@skillsync.internal` | `DevPassword123!` | TechNova Digital Solutions — Cloud hiring |
| **Training Provider** | `dev.provider@skillsync.internal` | `DevPassword123!` | SkillForge Training Institute — Certified curricula |
| **Government** | `dev.gov@skillsync.internal` | `DevPassword123!` | Labor Analytics & Workforce Policy Director |

---

## The Canonical SIH Demo Scenario (15–20 minutes)
**Narrative**: *"AI & Cloud Talent Shortage → Training → Verified Hiring → Retention Feedback"*

### Act 1: Government Labor Intelligence & Simulation (4 min)
**Login as Government User: `dev.gov@skillsync.internal`**
1. **Demand Digital Twin** (`/demand`):
   - Showcase platform-wide KPIs: active published jobs, shortage classifications, supply gaps.
   - Filter by skill to highlight the acute shortage in Python, FastAPI, and Cloud infrastructure.
2. **Skill Detail & Forecasting** (`/demand/skills/[skillId]`):
   - View 360° breakdown: regional distribution, employer demand share, and historical trends.
   - Inspect the statistical 3-to-6 month forward-looking demand projection.
   - Verify Zero-PII candidate supply counts.
3. **What-If Scenario Simulator** (`/simulator`):
   - Model hypothetical intervention (+50 verified candidates, +100 training seats).
   - Demonstrate the drop in shortage ratio without any changes or mutations to production records.

### Act 2: Employer Requisition & Skill Contract (4 min)
**Login as Employer: `dev.employer@skillsync.internal`**
1. **Published Jobs** (`/employer/jobs`):
   - View "Lead Cloud Infrastructure Engineer" posting.
2. **Employer Skill Contract** (`/employer/contracts`):
   - Open active Skill Contract tied to the job.
   - Show contract requirements referencing canonical skill IDs with mandatory proficiency levels.
   - Highlight the **Contract Quality Score** (>=50), enforcing high-fidelity hiring specifications.

### Act 3: Candidate Skill Gap & Verified Passport (5 min)
**Login as Candidate: `dev.candidate@skillsync.internal`**
1. **Candidate Profile & Skills** (`/candidate/skills`):
   - Show candidate portfolio: declared skills and experience.
2. **Skill Gap Engine** (`/candidate/jobs/[jobId]/skill-gap`):
   - Run diagnosis against the Employer's job.
   - View deterministic breakdown: `MATCHED` (Python), `PARTIAL`, and `MISSING` (Cloud Infrastructure) skills.
3. **Learning & Completion** (`/candidate/learning`):
   - Browse SkillForge Training Institute courses directly remediating the missing skill.
   - Demonstrate course enrollment, module progress, and completion evidence.
4. **Verified Skill Passport** (`/candidate/passport`):
   - Trigger passport recalculation.
   - Observe the skill status change to **VERIFIED**, backed by course completion evidence.
   - Generate shareable public passport token (`/passport/share/[token]`).

### Act 4: Job Application, Placement, & Outcome Intelligence (4 min)
1. **Candidate Application & Employer Review** (`/employer/applications`):
   - Candidate applies; Employer reviews applicant.
   - Note verified skill badges eliminating recruitment uncertainty.
   - Employer transitions status: `APPLIED` → `SHORTLISTED` → `HIRED`.
2. **Verified Placement Outcome** (`/employer/outcomes`):
   - Record placement outcome at ₹12,00,000 annual starting salary.
   - Employer submits 90-day retention confirmation and 5-star satisfaction rating.
3. **Provider Performance Index (PPI)** (`/training-provider/outcomes`):
   - View SkillForge Training Institute's institutional performance score.
   - Show deterministic Tier 1 placement metrics.
4. **Macro Policy Feedback** (`/analytics`):
   - Return to macro analytics to show closed-loop feedback into government labor market indicators.

---

## Technical Proof Points to Highlight

1. **Deterministic Test Coverage**: 244 backend tests passing, 131 frontend Vitest tests passing, 0 lint errors, 0 TypeScript errors.
2. **Zero Cloud Lock-in**: Local Ollama AI skill extraction with robust offline fallback.
3. **Stateless Simulation**: What-If Simulator executes non-destructive scenario projections.
4. **Zero-PII Compliance**: Government and digital twin aggregates strictly prohibit candidate PII leakage.
5. **Single Alembic Migration Head**: Verified at `0012_outcome_intelligence`.

---

## Evaluator Environment Reset

Evaluators can safely and deterministically reset the demo data at any time:
```bash
python scripts/run_demo.py --reset --check-only
```
This purges all demo transactional records and recreates the deterministic SIH ecosystem while leaving canonical skill taxonomies intact.

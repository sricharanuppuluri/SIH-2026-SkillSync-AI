# SkillSync AI — SIH 2026 Live Demonstration Guide

> **Smart India Hackathon 2026 — SkillSync AI**
> Complete demonstration walkthrough for evaluators, judges, and mentors.

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
│  Frontend (Vite + React)     →   http://localhost:3000          │
│  Backend  (FastAPI)          →   http://localhost:8000          │
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

### 3. Seed Demo Data
```bash
python scripts/seed_demo.py
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
npm run dev
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
| **Candidate** | `dev.candidate@skillsync.internal` | `DevPassword123!` | Aarav Sharma — Full Stack Python & AI Cloud Engineer |
| **Employer** | `dev.employer@skillsync.internal` | `DevPassword123!` | TechNova Solutions — Junior Backend Engineer hiring |
| **Training Provider** | `dev.provider@skillsync.internal` | `DevPassword123!` | SkillBridge Academy — Full Stack Python Bootcamp |
| **Government** | `dev.gov@skillsync.internal` | `DevPassword123!` | Rajesh Verma — Director of Labor Analytics |

---

## Demo Walkthrough — Recommended Flow (20 minutes)

### Act 1: The Candidate Journey (5 min)

**Login as Candidate: Aarav Sharma**

1. **Profile & Skill Passport** → Navigate to *My Skills*
   - Show verified Python (98%) and FastAPI (95%) skills
   - Highlight: "These are cryptographically verified by the training provider — not self-reported"
   - **Talking Point:** *"Unlike LinkedIn, skills here are validated against actual course completion records"*

2. **AI Skill Extraction** → Navigate to *Skill Extractor*
   - Paste a job description or resume text
   - Click "Extract Skills" — AI (local Ollama) extracts and normalizes skill mentions
   - **Talking Point:** *"We use locally hosted LLMs — no data leaves the premises"*

3. **Career Copilot** → Navigate to *AI Copilot*
   - Ask: "What skills should I develop to become a senior backend engineer?"
   - Demonstrate real-time AI guidance
   - **Talking Point:** *"Personalized career roadmaps using on-premise AI"*

4. **Job Applications** → Navigate to *Browse Jobs*
   - Show semantic skill matching score against TechNova's Junior Backend Engineer role
   - Submit application
   - **Talking Point:** *"78-98% semantic match computed using pgvector embeddings"*

---

### Act 2: The Employer Perspective (5 min)

**Login as Employer: TechNova Solutions**

1. **Skill Contracts** → Navigate to *Skill Contracts*
   - Show the active contract requiring Python (INTERMEDIATE) and FastAPI (INTERMEDIATE)
   - **Talking Point:** *"Employers set structured skill requirements — not vague job descriptions"*

2. **Candidate Applications** → Navigate to *Applications*
   - Show Aarav's application with verified skill badges
   - Application status shows HIRED
   - **Talking Point:** *"Every verified skill is traceable to the training provider that certified it"*

3. **Semantic Matching** → Demonstrate the skill gap analysis
   - Show candidate's verified skills vs. contract requirements
   - **Talking Point:** *"Semantic matching reduces bias and focuses on verifiable competencies"*

---

### Act 3: The Training Provider Dashboard (4 min)

**Login as Training Provider: SkillBridge Academy**

1. **Course Management** → Navigate to *My Courses*
   - Show "Full Stack Python & AI Cloud Engineering Bootcamp" (160 hours, HYBRID)
   - **Talking Point:** *"Training providers can see which of their graduates got placed"*

2. **Provider Performance Index (PPI)** → Navigate to *Analytics*
   - Show PPI Score: **89.4 / 100** — Tier 1 (Excellent)
   - Breakdown: Completion Rate 83.3%, Placement Rate 92%, Retention 91.3%
   - **Talking Point:** *"Accountability for training quality — providers ranked by real employment outcomes, not just certificates issued"*

3. **Placement Outcomes** → Show the Phase 17 attribution chain
   - Aarav Sharma → TechNova → via SkillBridge Bootcamp enrollment
   - **Talking Point:** *"Complete traceable chain from training to employment"*

---

### Act 4: The Government Observer View (4 min)

**Login as Government: Rajesh Verma, NSDA**

1. **Ecosystem Analytics** → Navigate to *Dashboard*
   - Show aggregate employment rates, skill gaps, PPI rankings
   - **Talking Point:** *"Policy makers can see real-time labor market intelligence"*

2. **Skills Gap Analysis**
   - Show which canonical skills have high demand but low verified supply
   - **Talking Point:** *"Governments can direct NSDC funding to high-demand skill gaps"*

3. **Provider Accountability Rankings**
   - Show ranked list of training providers by PPI score
   - **Talking Point:** *"Evidence-based accreditation — providers must demonstrate employment outcomes, not just enrollment numbers"*

---

### Act 5: Technical Deep Dive (2 min)

**Show API Documentation: http://localhost:8000/docs**

1. Demonstrate the `/api/v1/skill-extraction/extract` endpoint
2. Show JWT authentication flow
3. Highlight 212 passing unit tests, 0 failures
4. Show Alembic migration history (12 migrations, all tracked)

---

## Fallback Resilience Strategies

If any service is unavailable during demo:

| Issue | Fallback |
|-------|---------|
| Ollama/AI down | Show pre-recorded AI response; note "LLM running locally" |
| Redis down | Rate limiter auto-falls back to in-memory (transparent) |
| Frontend error | Demo directly via Swagger UI at `/docs` |
| Database slow | Use cached API responses already loaded in browser |
| Internet down | Entire system runs 100% offline — all local |

---

## Key Differentiators to Highlight

1. **🔐 Verifiable Skills** — Not self-reported; certified by training providers
2. **🤖 On-Premise AI** — Ollama runs locally; no data sent to OpenAI/Google
3. **📊 PPI Accountability** — Training providers ranked by real employment outcomes
4. **🔍 Semantic Matching** — pgvector embeddings for intelligent job matching
5. **🏛️ Government Visibility** — Real-time labor market intelligence dashboard
6. **🔒 Security First** — Security headers, rate limiting, sanitized error handling
7. **📋 Audit Trail** — Every placement traceable to training → enrollment → employer
8. **🐳 Container-Ready** — Full Docker/Podman deployment in one command

---

## SIH Evaluation Rubric Mapping

| Criterion | SkillSync AI Implementation |
|-----------|---------------------------|
| Innovation | PPI scoring, non-causal attribution, semantic skill matching |
| Feasibility | Production-ready FastAPI + React, PostgreSQL, 12 migration phases |
| Impact | Measurable employment outcomes, government labor intelligence |
| Technical Execution | 212 tests passing, full CI/CD, security hardened |
| Scalability | Redis caching, async SQLAlchemy, containerized deployment |
| Data Privacy | On-premise LLM, RBAC, JWT auth, no third-party data sharing |

---

## Post-Demo Reset

To reset the database between demos:
```bash
python scripts/seed_demo.py --reset
```

---

*SkillSync AI — Bridging Skills to Employment Through Verified Intelligence*

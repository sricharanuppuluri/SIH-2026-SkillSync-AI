# SkillSync_AI — SIH Final Day Checklist

> **Smart India Hackathon 2026 — On-Site Evaluation & Live Presentation Master Checklist**  
> **Platform Version**: `v1.0.0-RC`  
> **Repository Baseline**: Commit `35bbacf`  
> **Ground Rule**: Zero cloud dependencies during demo; 100% offline localhost execution.

---

## 1. Before Entering the Judging Room

### Hardware & Environment Readiness
- [ ] **Laptop Battery & Power**: Laptop charged to 100%; AC power brick connected to avoid CPU throttling.
- [ ] **Display & Resolution**: Screen resolution set to standard 1080p (1920x1080); OS display scaling at 100% or 125%.
- [ ] **Do Not Disturb Mode**: System notifications, popups, Discord, Slack, and email client alerts muted.
- [ ] **Wi-Fi Independence**: Confirm the system works completely on `localhost` without requiring venue Wi-Fi.

### Infrastructure & Service Health
- [ ] **Docker Engine**: Docker Desktop running; container `postgres` active on port `5432`.
- [ ] **PostgreSQL pgvector**: Verify `pgvector` extension is active in database `skillsync`.
- [ ] **Database Migrations**: `uv run alembic current` displays `0012_outcome_intelligence (head)`.
- [ ] **Deterministic Demo Seed**: Run `uv run python scripts/run_demo.py --reset --check-only` (reports `[+] Demo verification complete!`).
- [ ] **Backend Server**: FastAPI running on `http://localhost:8000` (`uv run uvicorn app.main:app --port 8000`).
- [ ] **API Health**: Confirm `http://localhost:8000/api/v1/health` returns `{"status":"healthy"}`.
- [ ] **Frontend Application**: Next.js running on `http://localhost:3000` (`npm run dev -- --port 3000`).
- [ ] **Local AI (Ollama)**: Ollama running on `http://localhost:11434` with `mistral:latest` model loaded. If offline, confirm automatic heuristic regex fallback works.
- [ ] **Git Repository State**: On branch `main`, working tree clean (`git status` reports 0 untracked/unstaged changes).

### Browser Tabs Pre-Staging (Google Chrome)
- [ ] **Tab 1 — Employer Persona**: `http://localhost:3000/employer/jobs`  
  *Credentials*: `dev.employer@skillsync.internal` / `DevPassword123!`
- [ ] **Tab 2 — Government Admin Persona**: `http://localhost:3000/demand`  
  *Credentials*: `dev.gov@skillsync.internal` / `DevPassword123!`
- [ ] **Tab 3 — Candidate Persona**: `http://localhost:3000/candidate/dashboard`  
  *Credentials*: `dev.candidate@skillsync.internal` / `DevPassword123!`
- [ ] **Tab 4 — Training Provider Persona**: `http://localhost:3000/training-provider/outcomes`  
  *Credentials*: `dev.provider@skillsync.internal` / `DevPassword123!`
- [ ] **Tab 5 — Public Verification (Incognito)**: Keep empty incognito window ready to paste public passport link.
- [ ] **Terminal Recovery Session**: Terminal minimized with command ready:  
  `uv run python scripts/run_demo.py --reset --check-only`

---

## 2. Presentation & Delivery Readiness

### Timing & Script Discipline (Strict 5-Minute Flow)
- [ ] **0:00–0:30 — Problem & Closed-Loop Vision**: Clearly state the fragmentation between labor demand, training, and employment.
- [ ] **0:30–1:15 — Employer Demand & Skill Contract**: Open active job at TechNova; show versioned Skill Contract with proficiency levels, importance tags, and evidence prerequisites.
- [ ] **1:15–2:00 — Demand Intelligence & What-If Simulation**: Show Skill Demand Digital Twin; run non-destructive in-memory policy simulation in the What-If Simulator (+25% shock).
- [ ] **2:00–2:45 — Candidate Skill Gap & Training Alignment**: Show deterministic Gap Engine score; highlight critical missing gaps mapped to SkillForge Institute's accredited curriculum.
- [ ] **2:45–3:30 — Verified Skill Passport**: Show tamper-evident evidence hierarchy badges (`COURSE_COMPLETION`); open public passport via 32-byte secure token (`secrets.token_urlsafe(32)`) in Incognito window without login.
- [ ] **3:30–4:15 — Semantic Matching & Hiring**: Show pgvector 384-dimensional cosine ranking (~94% demo match); click *"Issue Offer / Hire Candidate"*; status updates to `HIRED`.
- [ ] **4:15–5:00 — Retention & Provider Performance Index (PPI)**: Display 30/60/90-day retention tracking, employer rating (4.8/5.0), and the 4-factor Provider Performance Index calculation.
- [ ] **Closing Statement Memorized**: Deliver the verbatim 30-second closing statement on the closed feedback loop.

### Team Roles & Rehearsal
- [ ] **Speaker 1 (Narrative Lead)**: Delivers problem, screen flow, and 30-second closing.
- [ ] **Speaker 2 (Technical & AI Lead)**: Answers questions on Holt smoothing, pgvector cosine matching, Ollama Mistral inference, and PPI math.
- [ ] **Speaker 3 (Product & Policy Lead)**: Answers questions on Skill Contracts, Passport evidence weighting, What-If economics, and institutional incentives.
- [ ] **No Interruptions Rule**: Team members speak only when prompted or in clear turn-taking sequence.
- [ ] **Honest Data Rule**: Seeded demo scores (~94% match, ~92% retention) are strictly identified as representative evaluation datasets, never as real-world longitudinal trials.

---

## 3. Technical Verification Baseline

- [ ] **Backend Tests**: 244/244 passed (`uv run pytest`)
- [ ] **Frontend Tests**: 131/131 passed across 32 test files (`npx vitest run`)
- [ ] **TypeScript Check**: 0 errors (`npx tsc --noEmit`)
- [ ] **ESLint**: 0 warnings, 0 errors (`npm run lint`)
- [ ] **Next.js Production Build**: 38/38 routes generated successfully (`npm run build`)
- [ ] **Database Schema**: 12 Alembic migrations cleanly applied (`0012_outcome_intelligence`)
- [ ] **Deterministic Seed**: Verified idempotent execution with zero runtime warnings

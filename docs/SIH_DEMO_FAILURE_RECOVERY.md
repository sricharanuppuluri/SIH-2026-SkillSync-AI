# SkillSync_AI — Demo Failure Recovery & Emergency Runbook

> **Smart India Hackathon 2026 — Live Presentation Incident Playbook**  
> **Platform Version**: `v1.0.0-RC` (Release Candidate, Commit: `10fffe4`)  
> **Rule**: Stay composed. Every component has a tested diagnostic and recovery procedure.

---

## 1. Quick Diagnostic & Recovery Palette

| Failure Symptom | Diagnostic Command | Instant Recovery Command |
| :--- | :--- | :--- |
| **Demo Data In Unexpected State** | `git status` | `python scripts/run_demo.py --reset --check-only` |
| **Backend API Down (Port 8000)** | `curl -I http://localhost:8000/api/v1/health` | `cd backend && uv run uvicorn app.main:app --reload --port 8000` |
| **Frontend Down (Port 3000)** | `curl -I http://localhost:3000` | `cd frontend && npm run dev -- --port 3000` |
| **PostgreSQL Unreachable** | `docker ps \| grep postgres` | `docker-compose up -d postgres` |
| **Redis Down** | `docker ps \| grep redis` | `docker-compose up -d redis` |
| **Ollama Daemon Offline** | `curl -s http://localhost:11434/api/tags` | System activates deterministic heuristic fallback |

---

## 2. Scenario-by-Scenario Incident Protocols

### Incident 1: Ollama Daemon is Offline or Unresponsive
- **What Happens in UI**:
  - The API health check marks Ollama as `offline` within 1.5 seconds.
  - Resume extraction and Career Copilot switch gracefully to **deterministic heuristic fallback parsing**.
  - The application does NOT crash, raise a 500 error, or leave the browser hanging.
- **Why the System Remains Stable**:
  - `check_ollama_status` incorporates a bounded 1.5-second timeout (`httpx.Timeout(1.5)`).
  - Generation requests incorporate bounded timeouts (`settings.OLLAMA_TIMEOUT = 30.0s`).
  - When unavailable, the backend logs a warning and falls back to regex keyword extraction against the canonical taxonomy.
- **What to Say to Judges**:
  > *"Notice that the application remains fully functional even with the local AI daemon offline: our architecture implements bounded timeouts and deterministic fallbacks so core workflows are never blocked."*
- **Recovery Action**:
  - In a background terminal: run `ollama serve` or `docker-compose restart ollama`.

---

### Incident 2: Demo Data In Unexpected State
- **What Happens**:
  - A previous rehearsal left candidates already hired or contracts in archived states, complicating the demo walkthrough.
- **Instant Recovery Action**:
  ```bash
  python scripts/run_demo.py --reset --check-only
  ```
- **Execution Time**: ~3.5 seconds.
- **What it Does**:
  1. Truncates transactional tables (`applications`, `verified_skills`, `skill_evidence`, `enrollments`, `jobs`).
  2. Preserves all canonical skills, aliases, and user accounts.
  3. Reseeds deterministic baseline data: TechNova job requisition, SkillForge courses, and demo candidates.
- **What to Say to Judges**:
  > *"Our platform includes deterministic reset and verification tooling, ensuring idempotent testability across evaluation sessions."*

---

### Incident 3: Backend API Unexpectedly Terminates
- **What Happens in UI**:
  - Browser notification: *"Network error: Unable to connect to SkillSync API"*.
- **Recovery Action**:
  1. Switch to backend terminal.
  2. Relaunch Uvicorn:
     ```bash
     cd backend
     uv run uvicorn app.main:app --reload --port 8000
     ```
  3. Refresh the browser page (`F5`).
- **Speaking Pivot**:
  > *"While our service reloads, let us examine the database schema and pgvector indexing structure..."*

---

### Incident 4: PostgreSQL Database Unreachable
- **What Happens**:
  - Logs show `ConnectionRefusedError: [Errno 111] Connection refused (localhost:5432)`.
- **Recovery Action**:
  1. Restart PostgreSQL container:
     ```bash
     docker-compose restart postgres
     ```
  2. Verify migration head:
     ```bash
     cd backend && uv run alembic current
     ```
     *(Must show `0012_outcome_intelligence (head)`)*.

---

### Incident 5: Presentation Venue Network Outage (Air-Gapped Operation)
- **What Happens**:
  - Venue Wi-Fi disconnects or enforces restrictive captive portals.
- **Why SkillSync_AI Continues Working**:
  - **100% Local Operation**: The complete platform runs on `localhost:3000` and `localhost:8000`.
  - Zero external cloud services, remote LLM APIs, or external asset CDNs are required.
- **What to Do**:
  - Proceed with the demonstration on localhost without interruption.
  - If projector hardware fails, display offline documentation and architecture diagrams from `docs/`.

---

## 3. Pre-Demo Health Verification Command

Run this single-line verification 10 minutes before stepping up to the jury table:

```bash
python scripts/run_demo.py --reset --check-only && curl -s http://localhost:8000/api/v1/health && curl -I http://localhost:3000
```

**Expected Green Baseline**:
- `Alembic head verified: 0012_outcome_intelligence`
- `Demo data seeded successfully.`
- `{"status":"healthy","database":"connected","redis":"connected"}`
- `HTTP/1.1 200 OK`

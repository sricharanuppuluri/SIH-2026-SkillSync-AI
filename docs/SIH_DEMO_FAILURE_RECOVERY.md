# SkillSync_AI — Demo Failure Recovery & Emergency Runbook

> **Smart India Hackathon 2026 — Live Presentation Contingency & Incident Playbook**  
> **Platform Version**: `v1.0.0-RC` (Release Candidate)  
> **Rule**: Keep Calm. Every component has a tested fallback.

---

## 1. Quick Emergency Command Palette

| Failure Symptom | Quick Diagnostic Command | Instant Recovery Command |
| :--- | :--- | :--- |
| **Demo Data Corrupted** | `git status` | `python scripts/run_demo.py --reset --check-only` |
| **Backend API Down (Port 8000)** | `curl -I http://localhost:8000/api/v1/health` | `cd backend && uv run uvicorn app.main:app --reload --port 8000` |
| **Frontend Down (Port 3000)** | `curl -I http://localhost:3000` | `cd frontend && npm run dev -- --port 3000` |
| **PostgreSQL Unreachable** | `docker ps \| grep postgres` | `docker-compose up -d postgres` |
| **Redis Down** | `docker ps \| grep redis` | `docker-compose up -d redis` |
| **Ollama Crashed / Unresponsive** | `curl -s http://localhost:11434/api/tags` | System degrades to regex fallback automatically within 1.5s |

---

## 2. Scenario-by-Scenario Incident Protocols

### Incident 1: Ollama Daemon is Dead or Frozen
- **What Happens in UI**:
  - Skill extraction on resume upload or job creation takes slightly longer (1.5 seconds) then completes.
  - Career Copilot displays pre-compiled career roadmap guidance.
- **Why the System Does Not Crash**:
  - The API incorporates a bounded 1.5s timeout circuit breaker (`httpx.Timeout(1.5)`).
  - When the timeout fires, the backend activates its **deterministic regex/heuristic tokenizer** and canonical taxonomy resolver.
- **What to Say to Judges**:
  > *"Notice how the system gracefully handled the AI latency: our local architecture uses bounded fallback circuit breakers so core workflows never hang, even in low-compute or offline scenarios."*
- **Recovery Action**:
  - In a background terminal: `ollama serve` or `docker-compose restart ollama`.

---

### Incident 2: Demo Data Left in Unintended State
- **What Happens**:
  - A previous test run left candidates already hired or contracts already completed, confusing the demo narrative.
- **Instant Recovery Action**:
  ```bash
  python scripts/run_demo.py --reset --check-only
  ```
- **Execution Time**: ~3.5 seconds.
- **What it Does**:
  1. Truncates transactional test tables (`applications`, `verified_passports`, `enrollments`, `jobs`).
  2. Preserves all canonical skills and user accounts.
  3. Reseeds the deterministic TechNova job, SkillForge courses, and demo candidates.
- **What to Say to Judges**:
  > *"One of our enterprise features is deterministic environment reset and state repeatability, allowing evaluators to verify the closed loop idempotently."*

---

### Incident 3: Backend API Unexpectedly Terminates
- **What Happens in UI**:
  - Red toast notification appears: *"Network error: Unable to connect to SkillSync API"*.
- **Recovery Action**:
  1. Open the backend PowerShell terminal.
  2. Relaunch Uvicorn:
     ```bash
     cd backend
     uv run uvicorn app.main:app --reload --port 8000
     ```
  3. Refresh the browser page (`F5`).
- **Speaking Pivot**:
  > *"While our background service hot-reloads, let me explain the underlying database schema and pgvector indexing structure..."*

---

### Incident 4: PostgreSQL Database Unreachable
- **What Happens**:
  - Backend logs display `ConnectionRefusedError: [Errno 111] Connection refused (localhost:5432)`.
- **Recovery Action**:
  1. Restart Docker container:
     ```bash
     docker-compose restart postgres
     ```
  2. Verify migration head:
     ```bash
     cd backend && uv run alembic current
     ```
  3. Verify port is listening:
     ```bash
     netstat -ano | findstr :5432
     ```

---

### Incident 5: Total Hardware / Wi-Fi Outage (Air-Gapped Mode)
- **What Happens**:
  - The presentation venue Wi-Fi disconnects or blocks local network ports.
- **Why SkillSync_AI Still Works**:
  - **100% Localhost Operation**: The entire ecosystem runs on `http://localhost:3000` and `http://localhost:8000` with zero external cloud dependencies.
  - Neither OpenAI, Google, AWS, nor any remote API is contacted.
- **What to Do**:
  - Continue the demo directly on localhost.
  - If projector fails, use pre-generated architecture diagrams and offline documentation saved in `docs/`.

---

## 3. Pre-Demo Cold Boot Verification Script

Run this single-line verification 10 minutes before stepping up to the jury table:

```bash
python scripts/run_demo.py --reset --check-only && curl -s http://localhost:8000/api/v1/health && curl -I http://localhost:3000
```

**Expected Green Baseline**:
- `Alembic head verified: 0012_outcome_intelligence`
- `Demo data seeded successfully.`
- `{"status":"healthy","database":"connected","redis":"connected"}`
- `HTTP/1.1 200 OK`

# SkillSync AI — SIH 2026 Operator Runbook

> **Operational Runbook for Evaluators, Judges, and Demo Operators**  
> Instructions for preparation, execution, health validation, and incident recovery during live demonstration.

---

## 1. Before Demo Checklist

### Step 1: Clone Repository & Check Out Feature/Integration Branch
```bash
git clone https://github.com/sricharanuppuluri/SIH-2026-SkillSync-AI.git
cd SIH-2026-SkillSync-AI
git checkout develop
```

### Step 2: Install Dependencies
```bash
# Backend (Python 3.12+ via uv)
cd backend
uv sync

# Frontend (Node.js 18+ / npm)
cd ../frontend
npm install
cd ..
```

### Step 3: Configure Environment Variables
Verify `.env` in root or `backend/.env`:
```env
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=skillsync
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=demo_secret_key_sih_2026_deterministic_production_seed
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
OLLAMA_BASE_URL=http://localhost:11434
```

### Step 4: Start Database & Auxiliary Services
```bash
docker-compose up -d postgres redis ollama
```

### Step 5: Run Database Migrations
```bash
cd backend
uv run alembic upgrade head
uv run alembic current    # Must display: 0012_outcome_intelligence (head)
cd ..
```

### Step 6: Seed Deterministic Demo Data
```bash
python scripts/run_demo.py --reset --check-only
```

### Step 7: Launch Backend & Frontend Services
- **Backend Service**:
  ```bash
  cd backend
  uv run uvicorn app.main:app --port 8000 --reload
  ```
- **Frontend Service**:
  ```bash
  cd frontend
  npm run dev -- --port 3000
  ```

### Step 8: Run Health Checks
```bash
# Healthcheck endpoint
curl -s http://localhost:8000/api/v1/health | jq .
# Expected output: {"status": "healthy", "database": "connected", "redis": "connected"}

# Frontend landing page
curl -I http://localhost:3000
# Expected HTTP 200 OK
```

---

## 2. Demo Persona Accounts

| Persona | Email | Password | Role / Agency |
| :--- | :--- | :--- | :--- |
| **Government Admin** | `dev.gov@skillsync.internal` | `DevPassword123!` | Ministry / State Labor Analytics Director |
| **Enterprise Employer** | `dev.employer@skillsync.internal` | `DevPassword123!` | TechNova Digital Solutions (Hiring Manager) |
| **Job Seeker Candidate**| `dev.candidate@skillsync.internal` | `DevPassword123!` | Demo Candidate (Full Stack Cloud Dev) |
| **Training Provider** | `dev.provider@skillsync.internal` | `DevPassword123!` | SkillForge Training Institute (Curriculum Lead)|
| **System Superadmin** | `admin@skillsync.internal` | `DevPassword123!` | Platform Superuser / Catalog Overseer |

---

## 3. Canonical SIH Demo Sequence

Follow this page-by-page sequence for a smooth 15-minute presentation:

1. **Government Dashboard** (`http://localhost:3000/demand`):
   - Review platform KPIs (active jobs, unique skills, verified candidates).
   - Point out critical shortages in Cloud Infrastructure and FastAPI.
2. **Skill Detail & Trend** (`http://localhost:3000/demand/skills/{skill_id}`):
   - Highlight regional and employer industry distributions.
   - Review the 3-month statistical forecast and Zero-PII candidate supply metric.
3. **What-If Scenario Simulator** (`http://localhost:3000/simulator`):
   - Enter hypothetical scenario (+50 verified supply, +100 training seats).
   - Explain that this calculation is completely stateless and does not mutate production records.
4. **Employer Requisitions** (`http://localhost:3000/employer/jobs`):
   - Show TechNova Digital Solutions' "Lead Cloud Infrastructure Engineer" listing.
5. **Employer Skill Contract** (`http://localhost:3000/employer/contracts`):
   - Inspect active contract specifying verified skill requirements with Contract Quality Score >= 50.
6. **Candidate Dashboard & Skill Gap** (`http://localhost:3000/candidate/jobs/{job_id}/skill-gap`):
   - Run diagnosis showing `MATCHED` and `MISSING` skill items.
7. **Curriculum Discovery & Learning** (`http://localhost:3000/candidate/learning`):
   - Enroll in SkillForge Training Institute's targeted course.
   - Simulate completion of module lessons.
8. **Verified Skill Passport** (`http://localhost:3000/candidate/passport`):
   - Recalculate passport to view course-verified skill credentials.
   - Show public sharing capability via unique share token (`/passport/share/{token}`).
9. **Job Application & Hiring** (`http://localhost:3000/employer/applications`):
   - Employer views verified badge on applicant profile and promotes to `HIRED`.
10. **Placement Outcome & Retention** (`http://localhost:3000/employer/outcomes`):
    - Record placement outcome at ₹12,00,000.
    - Submit 90-day retention milestone with 5-star employer satisfaction rating.
11. **Provider Performance Index (PPI)** (`http://localhost:3000/training-provider/outcomes`):
    - View SkillForge Training Institute's PPI scorecard (Tier 1 rating).
12. **Macro Analytics** (`http://localhost:3000/analytics`):
    - Review macro wage premiums and placement rates, completing the closed loop.

---

## 4. Incident Recovery & Troubleshooting Runbook

### Issue A: Evaluator Requests Complete Demo Reset
**Fix**:
```bash
python scripts/run_demo.py --reset --check-only
```
*Note*: This safely purges test placements, applications, and enrollments while maintaining canonical skills and recreating clean demo personas.

### Issue B: Ollama AI Service Unreachable
**Symptom**: `POST /api/v1/skills/extract` returns fallback tokens or timeout warning.  
**Fix**: The platform automatically falls back to regex-based canonical skill resolution. No presentation failure occurs. If you wish to start Ollama:
```bash
docker start ollama
# Verify
curl http://localhost:11434/api/tags
```

### Issue C: Port Conflict on 8000 or 3000
**Fix**:
```bash
# Terminate existing uvicorn process on Windows PowerShell:
Stop-Process -Name python -Force
# Or launch on alternative ports:
cd backend && uv run uvicorn app.main:app --port 8080 --reload
cd frontend && npm run dev -- --port 3001
```

### Issue D: Database Connection Error
**Fix**:
```bash
docker restart postgres
cd backend
uv run alembic current
```

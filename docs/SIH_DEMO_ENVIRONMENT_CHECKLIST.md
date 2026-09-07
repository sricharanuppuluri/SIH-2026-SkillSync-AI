# SkillSync_AI — Demo Environment Pre-Flight Checklist

> **Smart India Hackathon 2026 — Pre-Demo Operations & Rig Checklist**  
> **Platform Version**: `v1.0.0-RC` (Release Candidate, Commit: `e7fae90`)  
> **Status**: Run this checklist 30 minutes before every jury presentation.

---

## 1. Hardware & Physical Rig Check
- [ ] **Laptop Battery**: Charged to 100% and power mode set to "Best Performance".
- [ ] **Power Adapter**: Connected to live wall socket or high-capacity power bank.
- [ ] **Display Output**: HDMI / Type-C adapter tested on presentation projector / external monitor.
- [ ] **Screen Resolution**: Set to standard 1920×1080 (100% UI scaling).
- [ ] **Do Not Disturb Mode**: Enabled on Windows/macOS (Disable all WhatsApp, Slack, Teams, and email notifications).

---

## 2. Infrastructure & Local Services Status
- [ ] **Docker Engine**: Running and healthy (`docker ps`).
- [ ] **PostgreSQL 16 + pgvector**: Listening on `localhost:5432` (`docker ps | grep postgres`).
- [ ] **Redis 7**: Listening on `localhost:6379` (`docker ps | grep redis`).
- [ ] **Ollama Service**: Running on `localhost:11434` (`curl http://localhost:11434/api/tags`).
- [ ] **Backend Service (FastAPI)**: Running on `http://localhost:8000` (`curl http://localhost:8000/api/v1/health`).
- [ ] **Frontend Service (Next.js 15)**: Running on `http://localhost:3000` (`curl -I http://localhost:3000`).

---

## 3. Database & Demo Data State
- [ ] **Alembic Migration Head**: Verified at `0012_outcome_intelligence` (`uv run alembic current`).
- [ ] **Deterministic Data Reset**: Executed clean reset script:
  ```bash
  python scripts/run_demo.py --reset --check-only
  ```
- [ ] **Canonical Skills Verified**: Core tech taxonomy present (Python, FastAPI, pgvector, etc.).
- [ ] **Active Demo Jobs**: TechNova Solutions job posted with active Skill Contract.
- [ ] **Active Demo Courses**: SkillForge Institute course published with modular lessons.

---

## 4. Browser & UI Setup
- [ ] **Browser Window**: Clean Google Chrome or Microsoft Edge window with ZERO unrelated tabs.
- [ ] **Browser Zoom**: Exactly 100% (`Ctrl + 0`).
- [ ] **Browser Cache**: Cleared or application opened in fresh profiles.
- [ ] **Pre-Opened Tabs** (arranged in demo order):
  1. Tab 1: Employer Dashboard (`http://localhost:3000/employer/jobs`)
  2. Tab 2: Government Digital Twin (`http://localhost:3000/demand`)
  3. Tab 3: What-If Policy Simulator (`http://localhost:3000/simulator`)
  4. Tab 4: Training Provider Dashboard (`http://localhost:3000/training-provider/dashboard`)
  5. Tab 5: Candidate Skill Gap & Passport (`http://localhost:3000/candidate/dashboard`)
  6. Tab 6: Public Passport Verification (`http://localhost:3000/passport/share/demo-share-token-123`)
  7. Tab 7: Outcome Intelligence & PPI (`http://localhost:3000/training-provider/outcomes`)
  8. Tab 8: FastAPI Swagger Interactive Docs (`http://localhost:8000/docs`)

---

## 5. Offline Emergency Assets
- [ ] **Printed / Offline PDF of Slides**: `docs/SIH_FINAL_PRESENTATION.md` accessible offline.
- [ ] **Click-by-Click Script**: `docs/SIH_DEMO_RUNBOOK.md` printed or on second mobile device.
- [ ] **Architecture Diagram**: High-resolution image available in case of live server failure.
- [ ] **Failure Recovery Guide**: `docs/SIH_DEMO_FAILURE_RECOVERY.md` bookmarked.

---

## 6. Pre-Demo Cold-Boot Test Execution

Run the cold-boot verification one-liner in terminal:
```bash
python scripts/run_demo.py --reset --check-only
```

*When this displays `[+] Demo verification complete!`, your system is 100% ready for the SIH 2026 Evaluation Panel.*

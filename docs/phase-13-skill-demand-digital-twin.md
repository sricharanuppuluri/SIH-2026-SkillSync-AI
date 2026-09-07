# Phase 13 — Skill Demand Digital Twin

**Branch**: `feature/phase-13-skill-demand-digital-twin`  
**Commit**: `5b2f4d1`  
**Date**: September 2026

---

## Overview

Phase 13 transforms SkillSync AI's existing platform data (jobs, candidates, training courses) into a **Skill Demand Digital Twin** — a live, deterministic representation of workforce skill dynamics.

> **IMPORTANT**: All data is sourced exclusively from the SkillSync AI platform database.  
> This is **not** an authoritative external labor-market dataset (e.g. NSDC, EPFO, LinkedIn Insights).  
> No ML forecasting is used — demand is strictly historical/current aggregation of published active jobs.

---

## Core Concept

```
Employer Jobs (PUBLISHED + is_active)
        ↓
Required Canonical Skills (Skill.id)
        ↓
Demand Aggregation (SQL GROUP BY)
        ↓
Geographic / Industry / Skill Intelligence
        ↓
Candidate Verified Skill Supply (VerifiedSkill)
        ↓
Demand vs Supply (Deterministic ratio)
        ↓
Skill Demand Digital Twin
```

---

## Shortage Classification Formula

| Metric | Formula |
|--------|---------|
| Demand | COUNT(DISTINCT active PUBLISHED jobs requiring skill) |
| Verified Supply | COUNT(DISTINCT verified_skill records with VERIFIED status) |
| D/S Ratio | `demand / max(verified_supply, 1)` |

| Shortage Status | Condition |
|-----------------|-----------|
| `HIGH_SHORTAGE` | `demand >= 1 AND verified_supply == 0` OR `ratio >= 3.0` |
| `MODERATE_SHORTAGE` | `1.5 <= ratio < 3.0` |
| `BALANCED` | `0.5 <= ratio < 1.5` OR `demand == 0 AND supply == 0` |
| `SURPLUS` | `ratio < 0.5` |

---

## Architecture

### No New Database Tables

Phase 13 is purely analytical. It aggregates over existing operational tables:

| Source Table | Purpose |
|-------------|---------|
| `jobs` | Demand (PUBLISHED + is_active only) |
| `job_skills` | Skill → Job mapping |
| `skills` | Canonical skill catalog |
| `verified_skills` | Candidate verified supply |
| `employer_profiles` | Industry grouping |
| `courses` | Training availability |
| `course_skills` | Skill → Course mapping |
| `training_provider_profiles` | Provider count |

### No Alembic Migration Required

The Alembic head is at `0010_verified_skill_passport`. Phase 13 adds no new tables.

---

## Backend Implementation

### Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `backend/app/schemas/demand.py` | NEW | Pydantic response schemas |
| `backend/app/services/skill_demand_service.py` | NEW | Deterministic aggregation service |
| `backend/app/api/v1/endpoints/demand.py` | NEW | FastAPI router |
| `backend/app/api/v1/api.py` | MODIFIED | Mount router at `/api/v1/demand` |
| `backend/app/schemas/__init__.py` | MODIFIED | Export demand schemas |
| `backend/tests/test_skill_demand_digital_twin.py` | NEW | 28-test suite |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/demand/overview` | Public | Platform KPIs and leaderboards |
| `GET` | `/api/v1/demand/skills` | Required | Paginated demand leaderboard |
| `GET` | `/api/v1/demand/skills/{skill_id}` | Required | Full 360° skill detail |
| `GET` | `/api/v1/demand/skills/{skill_id}/trends` | Required | Historical monthly demand |
| `GET` | `/api/v1/demand/skills/{skill_id}/locations` | Required | Geographic demand breakdown |
| `GET` | `/api/v1/demand/skills/{skill_id}/industries` | Required | Industry demand breakdown |
| `GET` | `/api/v1/demand/skills/{skill_id}/supply` | Required | Aggregate supply stats (no PII) |
| `GET` | `/api/v1/demand/skills/{skill_id}/training` | Required | Published courses for skill |

### Query Filters (GET /api/v1/demand/skills)

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Skill name substring filter |
| `skill_type` | string | Filter by SkillType enum value |
| `industry` | string | Filter by employer industry |
| `location` | string | Filter by city/state substring |
| `shortage_status` | enum | Filter by shortage classification |
| `skip` | int | Pagination offset (default: 0) |
| `limit` | int | Page size (default: 50, max: 200) |

### RBAC

| Role | Overview | List | Detail | Sub-resources |
|------|---------|------|--------|---------------|
| CANDIDATE | ✅ | ✅ | ✅ | ✅ |
| EMPLOYER | ✅ | ✅ | ✅ | ✅ |
| TRAINING_PROVIDER | ✅ | ✅ | ✅ | ✅ |
| GOVERNMENT | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| Anonymous | ✅ (overview only) | ❌ | ❌ | ❌ |

### PII Policy

- Aggregate counts only in all endpoints
- No email, name, phone, or user IDs in any response
- No individual VerifiedSkill records exposed — only counts per status/method

---

## Frontend Implementation

### Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `frontend/src/types/demand.ts` | NEW | TypeScript demand types |
| `frontend/src/lib/demandApi.ts` | NEW | API client |
| `frontend/src/types/index.ts` | MODIFIED | Export demand types |
| `frontend/src/components/layout/Sidebar.tsx` | MODIFIED | Add Skill Demand Twin nav entry |
| `frontend/src/app/demand/page.tsx` | NEW | Dashboard page |
| `frontend/src/app/demand/skills/[skillId]/page.tsx` | NEW | Skill detail page |
| `frontend/src/app/demand/page.test.tsx` | NEW | Dashboard tests (10) |
| `frontend/src/app/demand/skills/[skillId]/page.test.tsx` | NEW | Detail tests (17) |

### Pages

#### `/demand` — Dashboard
- 5 KPI metric cards (active jobs, skills in demand, verified candidates, courses, shortages)
- Top Demanded Skills leaderboard
- Critical Skill Shortages leaderboard  
- Paginated skills table with D/S ratio bars and shortage status badges
- Filters: search, shortage_status, skill_type, sort direction
- Tabs: All Skills, Shortages, Top 10

#### `/demand/skills/[skillId]` — Skill 360° Detail
- Hero card with shortage status, D/S ratio, rank badge
- 6 stat cards: demand, demand share %, verified candidates, unverified, courses, providers
- Historical demand trend bar chart (no forecasting)
- Top industries breakdown with percentage bars
- Top locations with Remote badge
- Candidate supply breakdown with by-verification-method breakdown
- Related skills tag cloud
- PII-safety note in supply section

---

## Test Results

### Backend (pytest)

```
28 passed in 19.80s
```

Tests cover:
1. Overview is public (no auth)
2. KPIs reflect PUBLISHED jobs only
3. List requires auth (401 without token)
4. List returns paginated demand leaderboard
5. demand_count matches published active jobs
6. BALANCED when demand=0 and supply=0
7. HIGH_SHORTAGE when ratio ≥ 3.0
8. MODERATE_SHORTAGE when 1.5 ≤ ratio < 3.0
9. SURPLUS when supply >> demand
10. HIGH_SHORTAGE when demand ≥ 3 and supply = 0
11. demand_share_percentage proportional calculation
12. Rank ordering (highest demand first)
13. Filter by shortage_status
14. Filter by search substring
15. Skill detail 404 for unknown skill
16. Skill detail returns correct data
17. Trends returns monthly counts
18. Locations groups by city/state
19. Industries groups by employer industry
20. Supply exposes ZERO PII
21. Supply counts verified vs unverified correctly
22. Training returns only PUBLISHED active courses
23. CLOSED jobs excluded from demand
24. DRAFT jobs excluded from demand
25. GOVERNMENT role access
26. EMPLOYER role access
27. TRAINING_PROVIDER role access
28. ADMIN role all endpoint access

### Frontend (vitest)

```
27 passed (27)
```

Tests cover dashboard KPIs, skill table, leaderboards, filters, disclaimers, and all sections of the skill detail page.

---

## Exclusions (Future Phases)

The following are explicitly **NOT** implemented in Phase 13:

- ❌ Demand Forecasting (ML/time-series prediction)
- ❌ External labor market data (NSDC, EPFO, LinkedIn, etc.)
- ❌ Training Seat Optimizer
- ❌ Government What-if Simulator
- ❌ Outcome Intelligence
- ❌ Advanced analytics marketplace

These are scoped to Phase 14+ per the SIH 2026 implementation roadmap.

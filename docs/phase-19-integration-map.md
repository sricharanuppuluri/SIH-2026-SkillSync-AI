# SkillSync AI — Phase 19 End-to-End API Integration Map

This document provides a comprehensive audit of all platform service boundaries, API contracts, dependencies, and frontend touchpoints that form the closed-loop SkillSync AI ecosystem.

---

## 1. Ecosystem Integration Matrix

| Module | Primary API Endpoints | Consumes | Produces | Key Dependencies | Frontend Route | Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/register`<br>`GET /api/v1/auth/me` | User credentials, registration metadata | JWT access token, user role profile | PostgreSQL `users` table, Argon2 password hasher | `/login`<br>`/register` | `test_auth.py`<br>`E2E-01` to `16` |
| **Users & Profiles** | `GET/PUT /api/v1/candidate/profile`<br>`GET/PUT /api/v1/employer/profile`<br>`GET/PUT /api/v1/training-provider/profile` | Persona-specific profile attributes | Hydrated domain profile record | Auth JWT, PostgreSQL role tables | `/candidate/profile`<br>`/employer/profile`<br>`/training-provider/profile` | `test_candidate.py`<br>`test_training_provider_curriculum.py` |
| **Canonical Skills** | `GET/POST /api/v1/skills`<br>`GET /api/v1/skills/{id}`<br>`POST /api/v1/skills/{id}/aliases` | Skill metadata, aliases, relationships | Normalized canonical skill nodes | PostgreSQL `canonical_skills`, `skill_aliases` | `/admin/skills`<br>`/admin/skills/[id]` | `test_skill_intelligence.py`<br>`E2E-01` |
| **AI Skill Extraction** | `POST /api/v1/skills/extract`<br>`POST /api/v1/skills/normalize` | Unstructured text (JD, resume, syllabi) | Extracted skill tokens resolved to canonical IDs | Local Ollama (`llama3`), Regex fallback tokenizer | `/tools/skill-extractor` | `test_skill_extraction.py` |
| **Semantic Matching** | `POST /api/v1/matching/semantic-skills`<br>`POST /api/v1/matching/vector-search` | Raw skill terms, candidate vectors | Cosine similarity scores, semantic neighbors | pgvector embeddings, Ollama / Local embedding | `/tools/semantic-skill-match` | `test_embeddings_semantic_matching.py` |
| **Jobs Requisitions** | `POST /api/v1/jobs`<br>`GET /api/v1/jobs/{id}`<br>`PUT /api/v1/employer/jobs/{id}/publish` | Job requisitions, canonical skill tags | Published job postings, active demand nodes | Employer profile, canonical skills | `/jobs`<br>`/employer/jobs`<br>`/employer/jobs/new` | `test_jobs.py`<br>`E2E-01`, `E2E-03` |
| **Skill Contracts** | `POST /api/v1/contracts`<br>`POST /api/v1/contracts/{id}/activate`<br>`GET /api/v1/contracts/{id}/quality` | Verified skill requirements, proficiency thresholds | Active binding employer contract, quality index | Published job, canonical skills | `/employer/contracts`<br>`/employer/contracts/[id]` | `test_employer_skill_contract.py`<br>`E2E-02` |
| **Demand Digital Twin** | `GET /api/v1/demand/overview`<br>`GET /api/v1/demand/skills`<br>`GET /api/v1/demand/skills/{id}/supply` | Published job skills, verified candidate counts | Real-time demand counts, shortage ratio, zero-PII supply | Published jobs, `candidate_skills`, `verified_skills` | `/demand`<br>`/demand/skills/[skillId]` | `test_skill_demand_digital_twin.py`<br>`E2E-03`, `E2E-15` |
| **Demand Forecasting** | `GET /api/v1/demand/forecast`<br>`GET /api/v1/demand/skills/{id}/forecast` | Historical monthly platform demand, horizon (1–12) | Statistical projection, growth rates, confidence bands | Historical platform job data, forecasting service | `/demand`<br>`/demand/skills/[skillId]` | `test_demand_forecasting.py`<br>`E2E-04` |
| **What-If Simulator** | `POST /api/v1/simulator/skill`<br>`POST /api/v1/simulator/scenario` | Hypothetical demand shock, supply expansion | Projected demand, shortage category transitions | Stateless simulation engine, demand baselines | `/simulator` | `test_what_if_simulator.py`<br>`E2E-05`, `E2E-16` |
| **Candidate Portfolio** | `GET/POST /api/v1/candidate/skills`<br>`POST /api/v1/candidate/resume` | Self-declared skills, resume upload | Candidate skill records, resume text | Candidate profile, canonical catalog | `/candidate/skills`<br>`/candidate/experience` | `test_candidate.py`<br>`E2E-06` |
| **Skill Gap Engine** | `GET /api/v1/candidate/jobs/{job_id}/skill-gap` | Target job requirements, candidate skills | `MATCHED`, `PARTIAL`, `MISSING` breakdown, fit score | Job skills, candidate skills, verified passport | `/candidate/jobs/[jobId]/skill-gap` | `test_skill_gap.py`<br>`E2E-06` |
| **Curriculum & Learning** | `GET /api/v1/candidate/learning/courses`<br>`POST /api/v1/candidate/learning/courses/{id}/enroll` | Course curriculum, candidate enrollment | Active enrollment, progress tracking | Training provider courses, curriculum lessons | `/candidate/learning`<br>`/candidate/learning/[id]` | `test_training_provider_curriculum.py`<br>`E2E-07` |
| **Verified Skill Passport** | `GET /api/v1/candidate/passport`<br>`POST /api/v1/candidate/passport/recalculate`<br>`POST /api/v1/passport/share` | Course completions, institutional certifications | Deterministic verified skills, shareable public token | Completed enrollments, skill evidence | `/candidate/passport`<br>`/passport/share/[token]` | `test_verified_skill_passport.py`<br>`E2E-08`, `E2E-09` |
| **AI Job Matching** | `GET /api/v1/matching/jobs`<br>`GET /api/v1/matching/jobs/{id}/explain` | Candidate verified & declared skills, job requisitions | Ranked job recommendations, explainable match factors | Job catalog, candidate passport | `/matching`<br>`/candidate/dashboard` | `test_embeddings_semantic_matching.py`<br>`E2E-09` |
| **Applications Workflow** | `GET /api/v1/employer/applications`<br>`PUT /api/v1/employer/applications/{id}/status` | Application status update (`APPLIED` -> `HIRED`) | Updated applicant status, hiring progression | Candidate profile, employer job | `/employer/applications` | `test_employer.py`<br>`E2E-10` |
| **Outcome Intelligence** | `POST /api/v1/outcomes/placements`<br>`PUT /api/v1/outcomes/placements/{id}/retention` | Placement details, salary, retention milestone | Verified placement record, training attribution | Hired application, skill contract | `/employer/outcomes` | `test_outcome_intelligence.py`<br>`E2E-11`, `E2E-12`, `E2E-13` |
| **Provider Performance (PPI)** | `GET /api/v1/outcomes/providers/{id}/performance`<br>`GET /api/v1/outcomes/providers/leaderboard` | Provider enrollments, completions, placements, ratings | PPI score (0-100), quality tier (`TIER_1` to `TIER_4`) | Attribution records, employer satisfaction ratings | `/training-provider/outcomes`<br>`/training-provider/dashboard` | `test_outcome_intelligence.py`<br>`E2E-14` |
| **Macro Analytics & Feedback** | `GET /api/v1/outcomes/analytics/overview`<br>`GET /api/v1/outcomes/analytics/skills` | Aggregated placement records across platform | Conversion rates, wage premiums, shortage feedback | Outcome records (strictly zero candidate PII) | `/analytics` | `test_outcome_intelligence.py`<br>`E2E-15` |

---

## 2. Cross-Module Data Flow Verification

```
[Employer]
   │ Creates Job Requisition
   ▼
[Job Posting] (PUBLISHED)
   │ Formalizes Quality & Guarantees
   ▼
[Skill Contract] (ACTIVE)
   │ Published Skills Inject Into Digital Twin
   ▼
[Skill Demand Digital Twin] ────────► [Demand Forecast] ────────► [What-If Simulator]
   │ Highlights Shortage Gaps
   ▼
[Training Provider Course]
   │ Candidate Discovers & Enrolls
   ▼
[Candidate Curriculum Completion]
   │ Deterministic Verification Engine
   ▼
[Verified Skill Passport]
   │ Elevates Match Ranking
   ▼
[AI Job Matching & Application]
   │ Employer Reviews Verified Applicant
   ▼
[Hired Candidate]
   │ Converts to Verified Employment Record
   ▼
[Placement Outcome]
   │ Tracks 90-Day & 180-Day Retention + Employer Ratings
   ▼
[Provider Performance Index (PPI)]
   │ Ecosystem Feedback Closes the Loop
   ▼
[Macro Outcome Intelligence & Demand Policy Guidance]
```

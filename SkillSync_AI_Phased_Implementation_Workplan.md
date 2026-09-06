# SkillSync AI — Phased Implementation Workplan

## 1. Purpose

This document converts the SkillSync AI project concept into an implementation plan that the development team can execute phase by phase.

The plan is designed around these requirements:

- Dynamic website, not static pages
- Completely free/open-source development stack
- Local AI where possible
- Work divided into clear phases
- Every phase must be tested before merge
- Every completed phase must be pushed to GitHub
- Clear Git workflow
- Clear branch strategy
- Clear file/folder structure
- Backend and frontend developed together
- Database migrations tracked in Git
- AI modules integrated incrementally
- Each phase should leave the project in a runnable state

The product follows the original SkillSync AI concept:

**Industry Demand → Skill Intelligence → Training → Verified Competency → Employment → Outcome Feedback**

---

# 2. Development Philosophy

## 2.1 Build incrementally

Do not attempt to build the entire platform at once.

Each phase should produce a working increment.

```text
Plan
  ↓
Develop
  ↓
Run locally
  ↓
Test
  ↓
Fix
  ↓
Code review
  ↓
Commit
  ↓
Push to GitHub
  ↓
Merge
  ↓
Tag / release
  ↓
Start next phase
```

## 2.2 Dynamic-first approach

The website must be connected to the backend and database.

Avoid hard-coded dashboard values such as:

```text
Total Jobs = 500
Candidates = 1,200
Skill Gap = 32%
```

Instead:

```text
Frontend
   ↓
API
   ↓
PostgreSQL
   ↓
Live data
   ↓
Frontend dashboard
```

Demo seed data may be used, but it should be stored in the database and loaded dynamically.

---

# 3. Completely Free Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Leaflet
- OpenStreetMap

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- JWT authentication
- Role-Based Access Control

## Database

- PostgreSQL
- pgvector

## AI / NLP

- Ollama
- Open-source local LLM
- Sentence Transformers
- spaCy

## Machine Learning

- Python
- NumPy
- Pandas
- scikit-learn

## Cache

- Redis

## Development

- Git
- GitHub
- VS Code

## Container option

Use **Podman** if containerization is desired without depending on Docker.

Containerization is optional for the first local MVP.

---

# 4. Recommended Architecture

Use a **modular monolith** for the MVP.

Do not start with microservices.

```text
                        ┌──────────────────────┐
                        │      Next.js         │
                        │      Frontend        │
                        └──────────┬───────────┘
                                   │
                              REST / JSON
                                   │
                        ┌──────────▼───────────┐
                        │       FastAPI        │
                        │       Backend        │
                        └──────┬───────┬───────┘
                               │       │
                    ┌──────────┘       └───────────┐
                    ▼                              ▼
          ┌──────────────────┐             ┌─────────────┐
          │   PostgreSQL     │             │    Redis    │
          │   + pgvector     │             │   Cache     │
          └────────┬─────────┘             └─────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │   AI / ML Layer  │
          │                  │
          │ Ollama           │
          │ Embeddings       │
          │ Skill NLP        │
          │ Matching         │
          │ Forecasting      │
          └──────────────────┘
```

---

# 5. Complete Project File Structure

```text
skillsync-ai/
│
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── CONTRIBUTING.md
├── SECURITY.md
├── docker-compose.yml
├── podman-compose.yml
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── ai.md
│   ├── deployment.md
│   ├── testing.md
│   └── project-workflow.md
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   │
│   ├── public/
│   │   ├── images/
│   │   └── icons/
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   │
│       │   ├── login/
│       │   ├── register/
│       │   │
│       │   ├── dashboard/
│       │   │   ├── page.tsx
│       │   │   ├── government/
│       │   │   ├── employer/
│       │   │   ├── provider/
│       │   │   └── candidate/
│       │   │
│       │   ├── jobs/
│       │   ├── candidates/
│       │   ├── skills/
│       │   ├── courses/
│       │   ├── curriculum/
│       │   ├── demand/
│       │   ├── matching/
│       │   ├── copilot/
│       │   └── passport/
│       │
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── dashboard/
│       │   ├── charts/
│       │   ├── maps/
│       │   ├── jobs/
│       │   ├── skills/
│       │   ├── matching/
│       │   └── passport/
│       │
│       ├── lib/
│       │   ├── api.ts
│       │   ├── auth.ts
│       │   ├── constants.ts
│       │   └── utils.ts
│       │
│       ├── hooks/
│       ├── types/
│       └── stores/
│
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml
│   │
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── candidate.py
│   │   │   ├── employer.py
│   │   │   ├── provider.py
│   │   │   ├── job.py
│   │   │   ├── skill.py
│   │   │   ├── course.py
│   │   │   ├── contract.py
│   │   │   ├── passport.py
│   │   │   └── outcome.py
│   │   │
│   │   ├── schemas/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── candidates.py
│   │   │   ├── employers.py
│   │   │   ├── jobs.py
│   │   │   ├── skills.py
│   │   │   ├── courses.py
│   │   │   ├── demand.py
│   │   │   ├── matching.py
│   │   │   ├── copilot.py
│   │   │   ├── curriculum.py
│   │   │   ├── passport.py
│   │   │   └── outcomes.py
│   │   │
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── skill_service.py
│   │   │   ├── matching_service.py
│   │   │   ├── demand_service.py
│   │   │   ├── curriculum_service.py
│   │   │   ├── passport_service.py
│   │   │   └── outcome_service.py
│   │   │
│   │   ├── ai/
│   │   │   ├── ollama_client.py
│   │   │   ├── skill_extraction.py
│   │   │   ├── career_copilot.py
│   │   │   └── curriculum_ai.py
│   │   │
│   │   ├── ml/
│   │   │   ├── embeddings.py
│   │   │   ├── matching.py
│   │   │   └── forecasting.py
│   │   │
│   │   └── utils/
│   │
│   ├── migrations/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── api/
│
├── ml/
│   ├── models/
│   ├── notebooks/
│   ├── datasets/
│   ├── preprocessing/
│   ├── skill_extraction/
│   ├── embeddings/
│   ├── matching/
│   └── forecasting/
│
├── data/
│   ├── seed/
│   ├── demo/
│   └── schemas/
│
├── scripts/
│   ├── setup.sh
│   ├── seed_db.py
│   ├── reset_db.py
│   └── check_environment.py
│
└── .github/
    └── workflows/
        ├── frontend-ci.yml
        ├── backend-ci.yml
        └── full-ci.yml
```

---

# 6. GitHub Workflow

## Branch Strategy

Use:

```text
main
│
├── develop
│
├── feature/auth
├── feature/jobs
├── feature/skills
├── feature/matching
├── feature/copilot
└── feature/dashboard
```

## Rules

### `main`

Only contains tested and stable code.

### `develop`

Integration branch for completed features.

### `feature/*`

Every developer works on a feature branch.

Never directly develop on `main`.

---

# 7. Phase Completion Workflow

Every phase follows exactly this workflow:

```text
PHASE START
    ↓
Create / update task list
    ↓
Create feature branch
    ↓
Implement
    ↓
Local testing
    ↓
Integration testing
    ↓
UI testing
    ↓
Fix bugs
    ↓
Run full test suite
    ↓
Code review
    ↓
Commit
    ↓
Push feature branch
    ↓
Pull Request → develop
    ↓
CI checks
    ↓
Merge
    ↓
Test develop
    ↓
Merge develop → main
    ↓
Create Git tag
    ↓
Next phase
```

---

# 8. Commit Convention

Use clear commits.

```text
feat: add employer job creation
feat: implement skill extraction
feat: add candidate dashboard
fix: correct job matching score
fix: handle missing candidate skills
test: add matching service tests
refactor: simplify skill service
docs: update API documentation
chore: update dependencies
```

Example:

```bash
git add .
git commit -m "feat: add employer skill contract"
git push origin feature/employer-contract
```

---

# 9. Phase 0 — Project Setup

## Objective

Create the development foundation.

## Tasks

### Repository

- Create GitHub repository
- Create `main`
- Create `develop`
- Add README
- Add `.gitignore`
- Add `.env.example`
- Add contribution rules

### Frontend

Create Next.js application.

### Backend

Create FastAPI application.

### Database

Install PostgreSQL.

Enable pgvector.

### Local AI

Install Ollama.

Install an open-source local model.

### Development tools

Install:

- Python
- Node.js
- PostgreSQL
- Redis
- Git
- VS Code
- Ollama

## Deliverable

The following should work:

```text
Frontend → opens
Backend → /health returns OK
Database → connects
AI → responds locally
```

## Testing

```text
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

## Git

```bash
git checkout -b feature/project-setup

git add .
git commit -m "chore: initialize SkillSync project"

git push origin feature/project-setup
```

Merge after testing.

## Tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

---

# 10. Phase 1 — Application Shell and Dynamic UI

## Objective

Create the dynamic website structure.

## Frontend

Build:

- Landing page
- Login page
- Register page
- Navbar
- Sidebar
- Dashboard layout
- Responsive layout
- Role-based navigation
- Loading states
- Error states
- Empty states

## Dynamic requirement

The dashboard should consume API data.

Do not hard-code business statistics.

## Backend

Create:

```text
/api/health
/api/config
/api/users
```

## Testing

Verify:

- Desktop layout
- Mobile layout
- Navigation
- API connection
- Loading state
- Error state

## Git

```bash
git checkout -b feature/app-shell

git add .
git commit -m "feat: add dynamic application shell"

git push origin feature/app-shell
```

Merge and tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

---

# 11. Phase 2 — Authentication and RBAC

## Objective

Implement secure user accounts and roles.

## Roles

```text
ADMIN
GOVERNMENT
EMPLOYER
TRAINING_PROVIDER
CANDIDATE
```

## Backend

Implement:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
```

## Database

Create:

```text
users
roles
```

and role relationships.

## Security

- Password hashing
- JWT
- Access-token validation
- Role authorization
- Input validation

## Frontend

Build:

- Login
- Register
- Protected routes
- Role-specific navigation
- Logout
- Session handling

## Testing

Test:

```text
Valid login
Invalid password
Expired token
Unauthorized endpoint
Role-restricted endpoint
```

## Git

```bash
git checkout -b feature/auth-rbac

git add .
git commit -m "feat: implement authentication and role based access"

git push origin feature/auth-rbac
```

Merge only after all tests pass.

Tag:

```bash
git tag v0.3.0
git push origin v0.3.0
```

---

# 12. Phase 3 — Database Core

## Objective

Create the core SkillSync data model.

## Tables

```text
users
candidates
employers
training_providers
skills
jobs
job_skills
candidate_skills
courses
course_skills
skill_relationships
skill_contracts
employment_outcomes
```

## Tasks

- SQLAlchemy models
- Pydantic schemas
- Alembic migrations
- Foreign keys
- Indexes
- Constraints
- pgvector columns where required

## Seed Data

Create realistic demo data:

```text
10 employers
50 jobs
100 candidates
30 skills
20 courses
10 training providers
```

The exact numbers can change depending on demo requirements.

## Testing

Verify:

- Migration works
- Rollback works
- Foreign keys work
- Duplicate constraints work
- Seed script works
- Database reset works

## Git

```bash
git checkout -b feature/database-core

git add .
git commit -m "feat: add core database schema"

git push origin feature/database-core
```

Tag:

```bash
git tag v0.4.0
git push origin v0.4.0
```

---

# 13. Phase 4 — Employer Module

## Objective

Allow employers to create jobs and skill contracts.

## Features

### Employer dashboard

Display:

- Active jobs
- Applications
- Skill demand
- Contracts
- Candidate matches

### Job creation

Fields:

```text
Title
Description
Location
Salary
Experience
Employment Type
Required Skills
```

### Skill Contract

Fields:

```text
Role
Location
Required Candidates
Required Skills
Salary Range
Hiring Period
```

## APIs

```text
POST /api/jobs
GET /api/jobs
GET /api/jobs/{id}
PUT /api/jobs/{id}
DELETE /api/jobs/{id}

POST /api/contracts
GET /api/contracts
GET /api/contracts/{id}
```

## Dynamic behavior

After an employer creates a job:

```text
Database
   ↓
API
   ↓
Dashboard
```

The job must appear without refreshing hard-coded data.

## Testing

- Create job
- Edit job
- Delete job
- Create contract
- Validate required fields
- Test employer authorization

## Git

```bash
git checkout -b feature/employer-module

git add .
git commit -m "feat: add employer jobs and skill contracts"

git push origin feature/employer-module
```

Tag:

```bash
git tag v0.5.0
git push origin v0.5.0
```

---

# 14. Phase 5 — Skill Intelligence

## Objective

Build the central Skill Intelligence foundation.

## Tasks

Create:

- Skill taxonomy
- Skill categories
- Skill aliases
- Skill relationships
- Job-skill mapping
- Candidate-skill mapping
- Course-skill mapping

## Skill Graph

Represent relationships in PostgreSQL:

```text
Skill A
   │
   ├── related_to → Skill B
   ├── prerequisite_of → Skill C
   └── taught_by → Course
```

## APIs

```text
GET /api/skills
GET /api/skills/{id}
GET /api/skills/{id}/related
GET /api/skills/{id}/jobs
GET /api/skills/{id}/courses
```

## Testing

- Skill creation
- Duplicate prevention
- Relationships
- Skill lookup
- Job-to-skill relationship

## Git

```bash
git checkout -b feature/skill-intelligence

git add .
git commit -m "feat: add skill intelligence and skill graph"

git push origin feature/skill-intelligence
```

Tag:

```bash
git tag v0.6.0
git push origin v0.6.0
```

---

# 15. Phase 6 — Local AI Skill Extraction

## Objective

Use local AI to extract skills from job descriptions.

## Pipeline

```text
Job Description
       ↓
Ollama
       ↓
Structured JSON
       ↓
Skill Normalization
       ↓
Database
```

## Example

Input:

```text
Looking for a Data Analyst with Python,
SQL, Power BI and Statistics.
```

Output:

```json
{
  "role": "Data Analyst",
  "skills": [
    "Python",
    "SQL",
    "Power BI",
    "Statistics"
  ]
}
```

## AI Requirements

The model should produce structured output.

Do not blindly store free-form AI responses.

Validate the response using Pydantic.

## APIs

```text
POST /api/jobs/{id}/extract-skills
POST /api/ai/extract-skills
```

## Testing

Create test descriptions for:

- Data Analyst
- Software Developer
- Cloud Engineer
- Cybersecurity Analyst
- UI/UX Designer

Check:

- Valid JSON
- Skill normalization
- Unknown skills
- Duplicate skills
- Empty descriptions

## Git

```bash
git checkout -b feature/ai-skill-extraction

git add .
git commit -m "feat: add local AI skill extraction"

git push origin feature/ai-skill-extraction
```

Tag:

```bash
git tag v0.7.0
git push origin v0.7.0
```

---

# 16. Phase 7 — Candidate Module

## Objective

Create the candidate experience.

## Features

- Candidate profile
- Education
- Experience
- Location
- Skills
- Skill proficiency
- Target job
- Preferences
- Projects
- Evidence

## Dashboard

Show:

```text
Profile Completion
Current Skills
Target Role
Skill Gaps
Recommended Courses
Matched Jobs
Skill Passport
```

## APIs

```text
GET /api/candidates/me
PUT /api/candidates/me
POST /api/candidates/me/skills
DELETE /api/candidates/me/skills/{id}
```

## Testing

- Candidate registration
- Profile editing
- Skill addition
- Skill removal
- Unauthorized access
- Responsive UI

## Git

```bash
git checkout -b feature/candidate-module

git add .
git commit -m "feat: add candidate profile and dashboard"

git push origin feature/candidate-module
```

Tag:

```bash
git tag v0.8.0
git push origin v0.8.0
```

---

# 17. Phase 8 — Skill Gap Engine

## Objective

Compare candidate capabilities with target-job requirements.

## Logic

```text
Target Job Skills
       -
Candidate Skills
       ↓
Missing Skills
       ↓
Skill Gap
```

Example:

```text
Job:
Python ✓
SQL ✓
Power BI ✓
Statistics ✓

Candidate:
Python ✓
SQL ✓
Power BI ✗
Statistics ✗

Skill Gap:
Power BI
Statistics
```

## API

```text
GET /api/candidates/{id}/skill-gap
```

## Output

```json
{
  "match_percentage": 68,
  "covered_skills": [],
  "missing_skills": [],
  "recommended_skills": []
}
```

## Testing

Test:

- Full match
- Partial match
- No match
- Empty skills
- Unknown skills

## Git

```bash
git checkout -b feature/skill-gap

git add .
git commit -m "feat: implement candidate skill gap engine"

git push origin feature/skill-gap
```

Tag:

```bash
git tag v0.9.0
git push origin v0.9.0
```

---

# 18. Phase 9 — Embeddings and Semantic Matching

## Objective

Implement semantic similarity without paid APIs.

## Technology

Use:

- Sentence Transformers
- pgvector
- PostgreSQL

## Embeddings

Generate vectors for:

```text
Jobs
Candidates
Skills
Courses
Curricula
```

## Pipeline

```text
Text
 ↓
Sentence Transformer
 ↓
Embedding
 ↓
pgvector
 ↓
Similarity Search
```

## Matching

Combine semantic similarity with deterministic rules.

```text
Final Score =
50% Semantic Similarity
25% Skill Coverage
10% Experience
10% Location
5% Preferences
```

Weights should remain configurable.

## APIs

```text
POST /api/matching/job/{job_id}
POST /api/matching/candidate/{candidate_id}
```

## Testing

Use known candidate/job combinations.

Verify:

- Relevant candidate ranks higher
- Missing critical skills reduce score
- Location filtering works
- Salary preference works

## Git

```bash
git checkout -b feature/semantic-matching

git add .
git commit -m "feat: add semantic job matching"

git push origin feature/semantic-matching
```

Tag:

```bash
git tag v0.10.0
git push origin v0.10.0
```

---

# 19. Phase 10 — AI Career Copilot

## Objective

Provide personalized career pathways.

## Input

```text
Current Skills
Target Role
Experience
Education
Available Courses
```

## Output

```text
Existing Skills
Skill Gaps
Priority Skills
Learning Sequence
Projects
Interview Preparation
```

## Pipeline

```text
Candidate
   ↓
Skill Gap Engine
   ↓
Skill Graph
   ↓
Course Database
   ↓
Local LLM
   ↓
Personalized Pathway
```

## APIs

```text
POST /api/copilot/analyze
POST /api/copilot/pathway
```

## AI Safety

The AI should not invent courses that do not exist in the database.

The recommendation generator should work from retrieved system data.

## Testing

Test:

- Different target roles
- Candidates with different skills
- Empty course catalog
- Missing target role
- Invalid AI output

## Git

```bash
git checkout -b feature/career-copilot

git add .
git commit -m "feat: add AI career copilot"

git push origin feature/career-copilot
```

Tag:

```bash
git tag v0.11.0
git push origin v0.11.0
```

---

# 20. Phase 11 — Training Provider and Curriculum Module

## Objective

Allow training providers to manage courses and compare them with industry demand.

## Features

- Provider dashboard
- Course creation
- Course editing
- Training seats
- Course skills
- Curriculum upload/input
- Curriculum analysis

## APIs

```text
POST /api/courses
GET /api/courses
PUT /api/courses/{id}

POST /api/curriculum/analyze
POST /api/curriculum/recommend
```

## Curriculum Compiler

```text
Industry Skills
       +
Course Curriculum
       ↓
Skill Comparison
       ↓
Missing Skills
       ↓
Outdated Skills
       ↓
Recommended Modules
```

## Testing

- Course CRUD
- Curriculum submission
- Skill comparison
- Provider permissions
- Invalid curriculum input

## Git

```bash
git checkout -b feature/training-curriculum

git add .
git commit -m "feat: add training provider and curriculum intelligence"

git push origin feature/training-curriculum
```

Tag:

```bash
git tag v0.12.0
git push origin v0.12.0
```

---

# 21. Phase 12 — Skill Passport

## Objective

Build a dynamic, evidence-backed candidate Skill Passport.

## Passport Data

```text
Candidate
Skills
Proficiency
Verification
Evidence
Assessments
Projects
Certificates
Employer Evaluations
```

## Example

```text
PYTHON
Score: 92%
Verification:
✓ Assessment
✓ Project
✓ Training

SQL
Score: 84%
Verification:
✓ Assessment
✓ Training
```

## APIs

```text
GET /api/passport/{candidate_id}
POST /api/passport/evidence
PUT /api/passport/{id}
```

## Testing

- Add evidence
- Remove evidence
- Calculate proficiency
- Verify permissions
- Passport rendering
- Public/private visibility rules

## Git

```bash
git checkout -b feature/skill-passport

git add .
git commit -m "feat: add verified skill passport"

git push origin feature/skill-passport
```

Tag:

```bash
git tag v0.13.0
git push origin v0.13.0
```

---

# 22. Phase 13 — Skill Demand Digital Twin

## Objective

Create the demand intelligence dashboard.

## Data Sources for MVP

Use:

- Employer contracts
- Jobs stored in the system
- Demo/synthetic data clearly marked as demo data
- Training capacity
- Candidate skills

## Dashboard

Show:

```text
Total Job Demand
Top Skills
Skill Shortages
Skill Surplus
District Demand
Industry Demand
Training Capacity
Demand vs Supply
```

## Example

```text
Skill              Demand   Talent   Gap
-----------------------------------------
Cloud                 800      350    450
Cybersecurity         500      180    320
Data Analytics        900      700    200
Web Development       600      850   -250
```

## Map

Use:

- Leaflet
- OpenStreetMap

The map should load data dynamically.

## APIs

```text
GET /api/demand/skills
GET /api/demand/districts
GET /api/demand/industries
```

## Testing

- Filter by district
- Filter by industry
- Search skill
- Map interaction
- Chart data accuracy
- API/database consistency

## Git

```bash
git checkout -b feature/demand-digital-twin

git add .
git commit -m "feat: add dynamic skill demand digital twin"

git push origin feature/demand-digital-twin
```

Tag:

```bash
git tag v0.14.0
git push origin v0.14.0
```

---

# 23. Phase 14 — Demand Forecasting

## Objective

Add future demand prediction.

## MVP Approach

Use:

- Pandas
- NumPy
- scikit-learn

Avoid overcomplicating the first model.

## Pipeline

```text
Historical Demand
        ↓
Preprocessing
        ↓
Feature Engineering
        ↓
ML Model
        ↓
Forecast
        ↓
Dashboard
```

## Output

```text
Current Demand
Projected Demand
Confidence / Error Metrics
Trend
```

## Important

If real historical data is unavailable, use clearly labeled synthetic/demo data for the SIH demonstration.

Do not present synthetic predictions as real-world official forecasts.

## Testing

- Missing data
- Small datasets
- Outliers
- Forecast generation
- API output
- Model metric calculation

## Git

```bash
git checkout -b feature/demand-forecasting

git add .
git commit -m "feat: add skill demand forecasting"

git push origin feature/demand-forecasting
```

Tag:

```bash
git tag v0.15.0
git push origin v0.15.0
```

---

# 24. Phase 15 — Training Seat Optimizer

## Objective

Recommend training capacity based on skill demand and supply.

## Logic

```text
Demand
   +
Available Talent
   +
Current Seats
   ↓
Skill Gap
   ↓
Recommended Seats
```

## Dashboard

```text
Skill
Current Seats
Demand
Available Talent
Gap
Recommended Seats
```

## Testing

Test:

- High shortage
- Balanced demand
- Oversupply
- Zero demand
- Missing training capacity

## Git

```bash
git checkout -b feature/training-seat-optimizer

git add .
git commit -m "feat: add training seat optimizer"

git push origin feature/training-seat-optimizer
```

Tag:

```bash
git tag v0.16.0
git push origin v0.16.0
```

---

# 25. Phase 16 — Outcome Intelligence

## Objective

Close the feedback loop.

## Track

```text
Training
   ↓
Completion
   ↓
Assessment
   ↓
Placement
   ↓
Salary
   ↓
Retention
   ↓
Employer Satisfaction
```

## Dashboard

Display:

- Enrollment
- Completion
- Placement
- Average salary
- Retention
- Employer satisfaction
- Provider performance

## APIs

```text
POST /api/outcomes
GET /api/outcomes
GET /api/outcomes/providers
GET /api/outcomes/summary
```

## Testing

- Outcome creation
- Duplicate outcome prevention
- Salary validation
- Retention calculation
- Provider aggregation
- Dashboard totals

## Git

```bash
git checkout -b feature/outcome-intelligence

git add .
git commit -m "feat: add employment outcome intelligence"

git push origin feature/outcome-intelligence
```

Tag:

```bash
git tag v0.17.0
git push origin v0.17.0
```

---

# 26. Phase 17 — Government Dashboard and What-If Simulator

## Objective

Create the decision-support experience.

## Government Dashboard

Show:

```text
Skill Demand
Skill Shortage
Training Capacity
Provider Performance
Placement Rate
Salary
Retention
Emerging Skills
```

## What-If Simulator

Input:

```text
District
Skill
Additional Training Seats
```

Output:

```text
Current Gap
Additional Capacity
Projected Talent
Remaining Gap
Potential Impact
```

## Example

```text
Current Cloud Skill Gap:       3,000
Additional Seats:              1,000
Projected Qualified Talent:   3,000
Remaining Gap:                2,000
```

## Testing

- Different districts
- Different skills
- Different seat counts
- Zero seats
- Excess seats
- Invalid input

## Git

```bash
git checkout -b feature/government-dashboard

git add .
git commit -m "feat: add government intelligence dashboard and simulator"

git push origin feature/government-dashboard
```

Tag:

```bash
git tag v0.18.0
git push origin v0.18.0
```

---

# 27. Phase 18 — Complete End-to-End Integration

## Objective

Connect every major module.

## Required Flow

```text
Employer
   ↓
Skill Contract
   ↓
Job
   ↓
AI Skill Extraction
   ↓
Skill Demand
   ↓
Training Recommendation
   ↓
Candidate
   ↓
Skill Assessment
   ↓
Skill Gap
   ↓
Career Pathway
   ↓
Training
   ↓
Skill Passport
   ↓
Job Matching
   ↓
Employment
   ↓
Outcome Intelligence
   ↓
Demand Feedback
```

## Integration Test

Create one complete demo scenario.

### Employer

Creates:

```text
100 Data Analyst positions
Bengaluru
₹5–7 LPA
```

### AI

Extracts:

```text
Python
SQL
Power BI
Excel
Statistics
```

### Demand engine

Calculates shortage.

### Candidate

Has:

```text
Python
Excel
```

### Skill gap

Returns:

```text
SQL
Power BI
Statistics
```

### Copilot

Creates learning path.

### Passport

Updates verified skills.

### Matching

Candidate receives a match score.

### Outcome

Candidate gets placed.

### Government dashboard

Reflects the updated outcome.

---

# 28. Phase 19 — Testing and Quality Hardening

## Backend Tests

Use Python testing tools.

Test:

- Models
- Services
- APIs
- Authentication
- Authorization
- Matching
- AI parsing
- Forecasting

## Frontend Tests

Test:

- Components
- Forms
- Navigation
- API states
- Role-based pages
- Responsive behavior

## End-to-End Tests

Test:

```text
Register
→ Login
→ Create Job
→ Extract Skills
→ Create Candidate
→ Add Skills
→ Calculate Gap
→ Generate Pathway
→ Match Job
→ Record Outcome
```

## Security Testing

Check:

- Unauthorized endpoints
- Broken role restrictions
- Invalid tokens
- Input validation
- File validation
- SQL injection protection
- XSS-safe rendering

---

# 29. Phase 20 — Dynamic UI and UX Polish

The final website must feel like a real application.

## Requirements

### Loading states

Every API-driven page should have a loading state.

### Error states

Every API-driven page should handle failure.

### Empty states

Example:

```text
No jobs found.
Create your first job to get started.
```

### Toasts

Use notifications for:

- Save success
- Delete success
- AI processing
- API failure

### Responsive

Support:

```text
Mobile
Tablet
Laptop
Desktop
```

### Accessibility

Implement:

- Keyboard navigation
- Labels
- Semantic HTML
- Sufficient contrast
- Accessible forms

---

# 30. Phase 21 — CI/CD

## GitHub Actions

Every pull request should run:

```text
Frontend lint
Frontend tests
Backend lint
Backend tests
API tests
Build
```

## Workflow

```text
Developer pushes
      ↓
GitHub
      ↓
Pull Request
      ↓
CI
      ├── Frontend checks
      ├── Backend checks
      ├── Tests
      └── Build
      ↓
All green
      ↓
Review
      ↓
Merge
```

## Required Rule

**Do not merge a phase if CI is failing.**

---

# 31. Phase 22 — Final Demo Data

Create a controlled SIH demo dataset.

## Employers

Examples:

```text
ABC Technologies
TechNova
DataWorks
CloudSphere
SecureNet
```

## Roles

```text
Data Analyst
Software Developer
Cloud Engineer
Cybersecurity Analyst
AI Engineer
UI/UX Designer
```

## Skills

```text
Python
SQL
React
Node.js
Power BI
Cloud Computing
Cybersecurity
Statistics
Machine Learning
Generative AI
```

## Candidates

Create candidate profiles with different skill combinations.

## Training Providers

Create multiple providers with different:

- Courses
- Seats
- Skills
- Placement performance

## Important

Demo data should be explicitly identified as:

```text
Demo / Synthetic Data
```

when it is not sourced from an official dataset.

---

# 32. Final GitHub Release Workflow

Before final submission:

```text
Feature branches
      ↓
develop
      ↓
Full test
      ↓
main
      ↓
Release candidate
      ↓
Final testing
      ↓
Git tag
      ↓
SIH demo version
```

Suggested tag:

```bash
git tag v1.0.0-sih
git push origin v1.0.0-sih
```

---

# 33. Suggested GitHub Issues

Create issues by phase.

```text
#001 Project setup
#002 Frontend shell
#003 Authentication
#004 Database schema
#005 Employer module
#006 Skill graph
#007 AI skill extraction
#008 Candidate module
#009 Skill gap engine
#010 Semantic matching
#011 Career Copilot
#012 Training provider module
#013 Curriculum compiler
#014 Skill Passport
#015 Demand Digital Twin
#016 Forecasting
#017 Training Seat Optimizer
#018 Outcome Intelligence
#019 Government Dashboard
#020 What-If Simulator
#021 End-to-end integration
#022 Testing
#023 UI/UX polish
#024 CI/CD
#025 Final demo
```

---

# 34. Team Division

If the team has 4 developers:

## Developer 1 — Frontend

Own:

- Next.js
- UI
- Dashboards
- Candidate UI
- Employer UI
- Government UI
- Charts
- Maps

## Developer 2 — Backend

Own:

- FastAPI
- Authentication
- APIs
- Database
- RBAC
- Business logic

## Developer 3 — AI/ML

Own:

- Ollama
- Skill extraction
- Embeddings
- Matching
- Career Copilot
- Forecasting

## Developer 4 — Data / Integration / QA

Own:

- Seed data
- Database relationships
- Testing
- Integration
- CI
- Demo flow
- Documentation

All developers should use feature branches.

---

# 35. If Team Has Only 2 Developers

## Developer 1

```text
Frontend
+
Authentication
+
Dashboards
```

## Developer 2

```text
Backend
+
Database
+
AI/ML
```

Both collaborate on integration and testing after every phase.

---

# 36. Daily Development Workflow

Each developer should follow:

```text
1. Pull latest develop
2. Create/update feature branch
3. Implement one small feature
4. Run local tests
5. Run application
6. Test UI/API
7. Commit
8. Push
9. Open/update PR
10. Fix CI issues
```

Example:

```bash
git checkout develop
git pull origin develop

git checkout -b feature/skill-gap

# development

git add .
git commit -m "feat: implement skill gap calculation"

git push origin feature/skill-gap
```

---

# 37. Definition of Done

A task is **not complete** until all of these are true:

- Feature implemented
- Frontend connected to API
- Database integration completed
- Validation implemented
- Loading state implemented
- Error state implemented
- Unit tests written
- Integration test completed where applicable
- Manual UI test completed
- No critical console errors
- No failing CI checks
- Documentation updated
- PR reviewed
- Merged into `develop`
- `develop` tested
- Phase merged into `main`
- Git tag created

---

# 38. Definition of a Dynamic Feature

A feature is considered dynamic only if:

```text
User action
     ↓
Frontend request
     ↓
Backend API
     ↓
Database / AI / ML
     ↓
Response
     ↓
Frontend state update
     ↓
UI changes
```

For example, creating a job must immediately update the employer's job list after the API/database operation succeeds.

Avoid:

```text
Button
  ↓
Hard-coded JSON
  ↓
Fake dashboard update
```

---

# 39. AI Development Rules

## Rule 1 — AI is not the source of truth

Use database and deterministic business rules for factual platform data.

## Rule 2 — Validate AI output

Use structured schemas.

## Rule 3 — Ground recommendations

Career and curriculum recommendations should use actual system skills and courses.

## Rule 4 — Keep AI explainable

For matching:

```text
94% Match

Skill Coverage: 92%
Semantic Similarity: 95%
Experience: 90%
Location: 100%
```

## Rule 5 — Handle AI failure

If Ollama is unavailable:

```text
AI unavailable
Please try again.
```

The application should not crash.

---

# 40. Data Flow

## Employer

```text
Employer
 ↓
Job / Contract
 ↓
Skill Extraction
 ↓
Normalized Skills
 ↓
Demand Database
```

## Candidate

```text
Candidate
 ↓
Profile
 ↓
Skills
 ↓
Assessment
 ↓
Skill Gap
 ↓
Career Path
 ↓
Skill Passport
```

## Matching

```text
Candidate Embedding
       +
Job Embedding
       +
Skill Coverage
       +
Rules
       ↓
Match Score
```

## Outcomes

```text
Training
 ↓
Placement
 ↓
Salary
 ↓
Retention
 ↓
Employer Satisfaction
 ↓
Demand Intelligence
```

---

# 41. Final SIH Demo Sequence

The final presentation should demonstrate one continuous scenario.

### Scene 1 — Government Dashboard

Show:

```text
High demand:
Cloud
Cybersecurity
Data Analytics
```

### Scene 2 — Employer

Employer creates:

```text
100 Data Analyst positions
```

### Scene 3 — AI

AI extracts:

```text
Python
SQL
Power BI
Excel
Statistics
```

### Scene 4 — Demand Engine

Show:

```text
Demand: 100
Qualified Talent: 35
Gap: 65
```

### Scene 5 — Training

System recommends capacity.

### Scene 6 — Candidate

Candidate profile:

```text
Python ✓
Excel ✓
SQL ✗
Power BI ✗
Statistics ✗
```

### Scene 7 — Career Copilot

Generate:

```text
SQL
Statistics
Power BI
Project
Assessment
```

### Scene 8 — Skill Passport

Candidate completes training/assessment.

Passport updates.

### Scene 9 — Job Matching

Candidate gets:

```text
94% Match
```

### Scene 10 — Outcome

Record:

```text
Placed
Salary
Retention
Employer Satisfaction
```

### Scene 11 — Government Feedback

Dashboard updates with the new outcome.

This completes the closed loop.

---

# 42. Final Architecture

```text
                         SKILLSYNC AI
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
   EMPLOYER               CANDIDATE             GOVERNMENT
       │                      │                      │
       ▼                      ▼                      ▼
 Skill Contracts          Profile              Demand Dashboard
 Jobs                     Skills               Forecasting
 Hiring Demand            Assessment            Seat Optimizer
       │                      │                  What-If
       └──────────────┬───────┘
                      ▼
              SKILL INTELLIGENCE
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
      Skill Graph  Embeddings   Skill Gaps
          │           │            │
          └───────────┼────────────┘
                      ▼
                    AI/ML
                      │
       ┌──────────────┼───────────────┐
       ▼              ▼               ▼
 Skill Extraction  Copilot        Forecasting
       │              │               │
       └──────────────┼───────────────┘
                      ▼
                   TRAINING
                      │
                      ▼
               VERIFIED PASSPORT
                      │
                      ▼
                 JOB MATCHING
                      │
                      ▼
                  EMPLOYMENT
                      │
                      ▼
              OUTCOME INTELLIGENCE
                      │
                      └──────────────►
                         FEEDBACK
```

---

# 43. Final Project State

At `v1.0.0-sih`, the application should provide:

## Candidate

- Registration/login
- Profile
- Skills
- Skill gap
- Career pathway
- Job matching
- Skill Passport

## Employer

- Registration/login
- Company profile
- Job creation
- Skill contracts
- Required skills
- Candidate matching

## Training Provider

- Courses
- Skills
- Training seats
- Curriculum
- Curriculum gap analysis
- Outcomes

## Government

- Skill demand
- District dashboard
- Industry dashboard
- Skill shortages
- Training capacity
- Forecasting
- Seat optimization
- What-if simulator
- Outcomes

## AI

- Skill extraction
- Skill normalization
- Semantic matching
- Career recommendations
- Curriculum recommendations
- Forecasting

## Platform

- Dynamic data
- Role-based access
- PostgreSQL
- pgvector
- Local AI
- API-driven frontend
- Tests
- CI
- GitHub workflow
- Documentation

---

# 44. Final Principle

The most important implementation rule is:

> **Every phase must end with a working, tested, GitHub-pushed increment.**

Never allow the project to reach the final week with all modules existing only as partially implemented features.

The desired development progression is:

```text
v0.1  Project Foundation
  ↓
v0.2  Dynamic UI
  ↓
v0.3  Authentication
  ↓
v0.4  Database
  ↓
v0.5  Employer
  ↓
v0.6  Skills
  ↓
v0.7  AI Extraction
  ↓
v0.8  Candidate
  ↓
v0.9  Skill Gap
  ↓
v0.10 Semantic Matching
  ↓
v0.11 Career Copilot
  ↓
v0.12 Training + Curriculum
  ↓
v0.13 Skill Passport
  ↓
v0.14 Demand Digital Twin
  ↓
v0.15 Forecasting
  ↓
v0.16 Seat Optimizer
  ↓
v0.17 Outcomes
  ↓
v0.18 Government Dashboard
  ↓
v0.19 End-to-End Integration
  ↓
v0.20 Testing + Polish
  ↓
v1.0.0-sih
```

This structure keeps the SkillSync AI implementation aligned with the original project vision while making development manageable, testable, dynamic, and GitHub-driven.

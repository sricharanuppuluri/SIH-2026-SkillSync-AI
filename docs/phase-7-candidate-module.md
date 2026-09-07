# Phase 7 — Candidate Module Documentation

## 1. Overview & Architecture

Phase 7 implements a dynamic, comprehensive Candidate Module for SkillSync AI (SIH 2026). The Candidate Module empowers job seekers and students to manage their professional identity, maintain verified competencies backed by the Phase 5 Canonical Skill Catalog, track education and professional experience histories, maintain resume metadata, and view real-time deterministic profile completeness metrics.

### System Architecture Flow

```text
       Candidate User (JWT Authenticated)
                     │
                     ▼
          CandidateProfile (1:1 with User)
          ├── Profile Metadata (headline, bio, role, location, years_exp)
          ├── Resume Metadata (filename, size, uploaded_at, text)
          │
          ├── CandidateEducation (1:N)
          │   ├── Institution, Degree, Field of Study
          │   └── Start Year, End Year, Is Current, Grade
          │
          ├── CandidateExperience (1:N)
          │   ├── Company, Title, Employment Type, Location
          │   └── Start Date, End Date, Is Current, Description
          │
          └── CandidateSkill (1:N)
                     │
                     ▼ (FK Reference)
          Canonical Skill Catalog (Phase 5)
          ├── Canonical Skill (normalized_name, category, skill_type)
          └── Skill Proficiency (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
```

The database acts as the single source of truth. Arbitrary user strings cannot create new canonical skills directly; all candidate skills resolve to canonical skill records established in Phase 5.

---

## 2. Data Models & Database Schema

### Alembic Migration: `0006_candidate_module`
- **Parent Revision**: `0005_skill_intelligence`
- **Current Head**: `0006_candidate_module`

### Tables & Fields

1. **`candidate_profiles` (Extended)**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key to `users.id`, Unique, Cascade Delete)
   - `headline`: VARCHAR(255)
   - `bio`: TEXT
   - `current_role`: VARCHAR(100)
   - `experience_years`: NUMERIC(4, 1)
   - `education_level`: VARCHAR(100)
   - `location_city`: VARCHAR(100)
   - `location_state`: VARCHAR(100)
   - `resume_filename`: VARCHAR(255)
   - `resume_file_size`: INTEGER
   - `resume_uploaded_at`: TIMESTAMPTZ
   - `resume_text`: TEXT
   - `created_at` / `updated_at`: TIMESTAMPTZ

2. **`candidate_educations` (New Table)**:
   - `id`: UUID (Primary Key)
   - `candidate_id`: UUID (Foreign Key to `candidate_profiles.id`, Cascade Delete)
   - `institution`: VARCHAR(255), NOT NULL
   - `degree`: VARCHAR(150), NOT NULL
   - `field_of_study`: VARCHAR(150)
   - `start_year`: INTEGER, NOT NULL
   - `end_year`: INTEGER
   - `is_current`: BOOLEAN (Default: False)
   - `grade`: VARCHAR(50)
   - `description`: TEXT
   - `created_at` / `updated_at`: TIMESTAMPTZ
   - *Indexes*: `ix_candidate_educations_candidate_id`

3. **`candidate_experiences` (New Table)**:
   - `id`: UUID (Primary Key)
   - `candidate_id`: UUID (Foreign Key to `candidate_profiles.id`, Cascade Delete)
   - `company`: VARCHAR(255), NOT NULL
   - `title`: VARCHAR(150), NOT NULL
   - `employment_type`: VARCHAR(50)
   - `location`: VARCHAR(150)
   - `start_date`: VARCHAR(20), NOT NULL
   - `end_date`: VARCHAR(20)
   - `is_current`: BOOLEAN (Default: False)
   - `description`: TEXT
   - `created_at` / `updated_at`: TIMESTAMPTZ
   - *Indexes*: `ix_candidate_experiences_candidate_id`

4. **`candidate_skills` (Reused & Verified)**:
   - `id`: UUID (Primary Key)
   - `candidate_id`: UUID (Foreign Key to `candidate_profiles.id`, Cascade Delete)
   - `skill_id`: UUID (Foreign Key to `skills.id`, Cascade Delete)
   - `proficiency`: `proficiency_level` Enum (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
   - `years_of_experience`: NUMERIC(4, 1)
   - `source`: VARCHAR(50)
   - `is_verified`: BOOLEAN
   - *Unique Constraint*: `uq_candidate_skill (candidate_id, skill_id)`

---

## 3. Deterministic Profile Completeness Calculation

Profile completeness is calculated **100% deterministically** from stored database records without using any AI or LLMs.

### Exact Formula & Weighting Distribution

Total Score = $\sum (\text{Section Points})$, Max Score = 100%

| Section | Weight | Criteria for Completion |
| :--- | :---: | :--- |
| **Basic Information** | **20%** | Full name must be present AND at least one location attribute (`location_city` or `location_state`) is populated. |
| **Professional Summary** | **10%** | Bio must have a minimum length of $\ge 20$ characters OR a non-empty headline is set. |
| **Work Experience** | **20%** | Candidate has $\ge 1$ logged `CandidateExperience` record OR `experience_years > 0`. |
| **Education** | **15%** | Candidate has $\ge 1$ logged `CandidateEducation` record OR a legacy `education_level` is set. |
| **Canonical Skills** | **25%** | Candidate has $\ge 1$ attached `CandidateSkill` record from the canonical catalog. |
| **Resume** | **10%** | Candidate has uploaded a resume (`resume_filename` or `resume_text` present). |

### Output Contract (`ProfileCompletenessResponse`)
```json
{
  "percentage": 85,
  "completed_sections": [
    "Basic Information",
    "Professional Summary",
    "Experience",
    "Skills",
    "Resume"
  ],
  "missing_sections": [
    "Education"
  ],
  "section_scores": {
    "Basic Information": 20,
    "Professional Summary": 10,
    "Experience": 20,
    "Education": 0,
    "Skills": 25,
    "Resume": 10
  }
}
```

---

## 4. API Specification (`/api/v1/candidate/`)

All candidate endpoints enforce strict JWT authentication and role validation (`CANDIDATE` or `ADMIN`). Identities are derived directly from the authenticated JWT token—never from client query parameters.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/candidate/profile` | Retrieve authenticated candidate profile | `CANDIDATE`, `ADMIN` |
| `PUT` | `/api/v1/candidate/profile` | Update profile basic details, headline, bio, location | `CANDIDATE`, `ADMIN` |
| `GET` | `/api/v1/candidate/skills` | List all attached canonical skills | `CANDIDATE`, `ADMIN` |
| `POST` | `/api/v1/candidate/skills` | Attach a canonical skill with proficiency | `CANDIDATE`, `ADMIN` |
| `PUT` | `/api/v1/candidate/skills/{id}` | Update skill proficiency or years of experience | `CANDIDATE`, `ADMIN` |
| `DELETE` | `/api/v1/candidate/skills/{id}` | Remove skill attachment from profile | `CANDIDATE`, `ADMIN` |
| `GET` | `/api/v1/candidate/education` | List all education history records | `CANDIDATE`, `ADMIN` |
| `POST` | `/api/v1/candidate/education` | Add education entry | `CANDIDATE`, `ADMIN` |
| `PUT` | `/api/v1/candidate/education/{id}` | Update education entry | `CANDIDATE`, `ADMIN` |
| `DELETE` | `/api/v1/candidate/education/{id}`| Delete education entry | `CANDIDATE`, `ADMIN` |
| `GET` | `/api/v1/candidate/experience` | List all work experience records | `CANDIDATE`, `ADMIN` |
| `POST` | `/api/v1/candidate/experience` | Add work experience entry | `CANDIDATE`, `ADMIN` |
| `PUT` | `/api/v1/candidate/experience/{id}` | Update work experience entry | `CANDIDATE`, `ADMIN` |
| `DELETE` | `/api/v1/candidate/experience/{id}`| Delete work experience entry | `CANDIDATE`, `ADMIN` |
| `POST` | `/api/v1/candidate/resume` | Upload resume metadata / text content | `CANDIDATE`, `ADMIN` |
| `DELETE` | `/api/v1/candidate/resume` | Remove attached resume from profile | `CANDIDATE`, `ADMIN` |
| `GET` | `/api/v1/candidate/profile/completeness` | Compute deterministic completeness percentage | `CANDIDATE`, `ADMIN` |
| `GET` | `/api/v1/candidate/dashboard` | Aggregated dashboard metrics, completeness, recents | `CANDIDATE`, `ADMIN` |

---

## 5. Security & Isolation

1. **Identity Grounding**: The candidate's `CandidateProfile` is resolved via `current_user.id` extracted from the cryptographically verified JWT.
2. **Object-Level Authorization**: Direct Object Reference (IDOR) attacks are completely mitigated. When querying/modifying skills, education, experience, or resume records, the query binds both `record_id` AND `candidate_profile_id`. Access to another candidate's record produces a clean `404 Not Found`.
3. **Role-Based Access Control (RBAC)**: Candidate endpoints return `403 Forbidden` if accessed by `EMPLOYER`, `TRAINING_PROVIDER`, or `GOVERNMENT` tokens.
4. **Data Privacy**: No passwords, financial records, government IDs, or sensitive PII are collected or exposed.

---

## 6. Frontend Pages & Components

1. **Candidate Dashboard (`/candidate/dashboard`)**:
   - Live completeness progress bar with completed/missing section badges.
   - Competency counter and proficiency distribution pills (Beginner, Intermediate, Advanced, Expert).
   - Experience and Education recent highlights.
   - Quick action shortcuts (Add Skill, Add Experience, Add Education, View Jobs).

2. **Candidate Profile Page (`/candidate/profile`)**:
   - Basic info form (Full Name, Headline, Current Role, Experience Years, City, State, Bio).
   - Embedded Education section with Add/Edit/Delete modals.
   - Embedded Experience section with Add/Edit/Delete modals.
   - Embedded Resume metadata management (Upload/Replace/Delete resume).

3. **Candidate Skills Page (`/candidate/skills`)**:
   - Search filter across candidate's attached skills.
   - Modal skill selector leveraging canonical catalog (`/api/v1/skills/search`).
   - Proficiency selector & experience years field.
   - Live inline proficiency update and skill removal with delete confirmation.

4. **Dedicated Education & Experience Pages (`/candidate/education`, `/candidate/experience`)**:
   - Comprehensive CRUD interfaces with date order validation (`end_date >= start_date`, `is_current` handling).

---

## 7. Verification & Test Results

### Backend Validation (`pytest`)
- **Total Tests**: `86/86 PASSED`
- **Candidate Test Suite**: `tests/test_candidate_api.py` (Profile, Skills, Education, Experience, Resume, Completeness, Dashboard, RBAC Isolation).
- **Code Style & Formatting**:
  - `uv run ruff check .` -> PASS (0 errors)
  - `uv run ruff format --check .` -> PASS (74 files checked)
- **Database Migrations**:
  - `uv run alembic heads` -> `0006_candidate_module (head)`
  - `uv run alembic current` -> `0006_candidate_module (head)`
  - Linear chain preserved with 0 migration branches.

### Frontend Validation (`Vitest`, `ESLint`, `tsc`, `build`)
- **Vitest**: `18/18 test files PASSED` (65 unit and integration tests).
- **ESLint**: PASS (0 errors, 0 warnings with `$env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src`).
- **TypeScript**: `npx tsc --noEmit` -> PASS (0 type errors).
- **Next.js Production Build**: `npm run build` -> PASS (all 25 static & dynamic routes compiled successfully).

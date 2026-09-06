# SkillSync AI — API Documentation

## 1. Overview

SkillSync AI exposes a versioned RESTful API under `/api/v1/`.

- **Base URL**: `http://localhost:8000`
- **Prefix**: `/api/v1`
- **Swagger Documentation**: `/docs`
- **ReDoc Documentation**: `/redoc`

## 2. API Versioning & Roadmap

SkillSync AI structures its API endpoints as follows:

| Endpoint Module | Status | Description |
| --------------- | ------ | ----------- |
| `/api/v1/health` | **Phase 0 (Active)** | System diagnostic and health ping |
| `/api/v1/auth` | **Phase 2 (Active)** | User authentication, registration, JWT & RBAC |
| `/api/v1/admin/test` | **Phase 2 (Active)** | Protected test verification endpoint for ADMIN role |
| `/api/v1/employer/test` | **Phase 2 (Active)** | Protected test verification endpoint for EMPLOYER role |
| `/api/v1/candidate/test` | **Phase 2 (Active)** | Protected test verification endpoint for CANDIDATE role |
| `/api/v1/skills` | **Phase 3 (Active)** | Canonical skill taxonomy registry and retrieval |
| `/api/v1/jobs` | **Phase 3 (Active)** | Employer job postings and skill requirements |
| `/api/v1/courses` | **Phase 3 (Active)** | Training provider courses and taught skill curricula |
| `/api/v1/profiles` | **Phase 3 (Active)** | Role-specific profile management (Candidate, Employer, Provider, Govt) |
| `/api/v1/matching` | Phase 6 | Vector similarity matching engine |
| `/api/v1/copilot` | Phase 7 | Local LLM career advisory & gap guidance |
| `/api/v1/demand` | Phase 9 | District-level forecasting & demand signals |
| `/api/v1/passport` | Phase 10 | Verifiable skill passports & credentials |
| `/api/v1/outcomes` | Phase 11 | Employment outcome tracking & analytics |

---

## 3. System Endpoints

### 3.1 Health Check

Retrieves runtime connectivity and status across core foundation layers (FastAPI, PostgreSQL, Redis, Ollama).

- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Auth Required**: No

---

## 4. Authentication & RBAC (Phase 2)

### 4.1 Supported Roles
SkillSync AI defines 5 distinct RBAC roles:
- `CANDIDATE`: Job seekers, students, and workers accessing skill gap analysis and passports.
- `EMPLOYER`: Recruiters and hiring organizations managing job requisitions and candidate matches.
- `TRAINING_PROVIDER`: Institutions providing vocational curriculum and tracking course outcomes.
- `GOVERNMENT`: Public sector policy analysts and workforce planners monitoring aggregate data.
- `ADMIN`: Platform operators and system administrators.

### 4.2 Security Architecture & Admin Provisioning
- **Anti-Privilege Escalation**: Public registration strictly rejects attempts to register with `role="ADMIN"`, returning HTTP `403 Forbidden`. Administrative accounts cannot be self-provisioned via public APIs.
- **Admin Provisioning**: Administrative users must be created via automated backend database seed migrations, secure CLI tasks, or by existing verified administrators.
- **Password Security**: Passwords are encrypted using salted bcrypt (`bcrypt.hashpw` with standard cost factor) before database storage. Plaintext passwords and password hashes are never logged and never included in API responses.
- **JWT Tokens**: Signed using `HS256` with environment-configured secret (`JWT_SECRET_KEY`). Tokens encode `sub` (User UUID), `role`, and `exp` claims.

---

### 4.3 Endpoints

#### Register User
- **Method**: `POST`
- **Route**: `/api/v1/auth/register`
- **Auth Required**: No
- **Allowed Roles**: `CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT` (Attempting `ADMIN` returns `403 Forbidden`)

```json
// Request Body
{
  "email": "candidate@example.com",
  "password": "SecurePassword123!",
  "full_name": "Aarav Sharma",
  "role": "CANDIDATE"
}

// Response (201 Created)
{
  "id": "e6a2b8e3-4c91-44bb-b2d9-1c93a8d11002",
  "email": "candidate@example.com",
  "full_name": "Aarav Sharma",
  "role": "CANDIDATE",
  "is_active": true,
  "created_at": "2026-09-06T10:00:00Z",
  "updated_at": "2026-09-06T10:00:00Z"
}
```

#### Login
- **Method**: `POST`
- **Route**: `/api/v1/auth/login`
- **Auth Required**: No

```json
// Request Body
{
  "email": "candidate@example.com",
  "password": "SecurePassword123!"
}

// Response (200 OK)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "e6a2b8e3-4c91-44bb-b2d9-1c93a8d11002",
    "email": "candidate@example.com",
    "full_name": "Aarav Sharma",
    "role": "CANDIDATE",
    "is_active": true,
    "created_at": "2026-09-06T10:00:00Z",
    "updated_at": "2026-09-06T10:00:00Z"
  }
}
```

#### Get Current User Profile
- **Method**: `GET`
- **Route**: `/api/v1/auth/me`
- **Auth Required**: Yes (`Bearer <token>`)
- **Response**: `UserResponse` (200 OK)

#### Logout Session
- **Method**: `POST`
- **Route**: `/api/v1/auth/logout`
- **Auth Required**: Yes (`Bearer <token>`)
- **Response**: `{"message": "Successfully logged out. Please clear client-side token.", "user_id": "..."}`

---

### 4.4 Representative Protected RBAC Endpoints

| Method | Route | Allowed Roles | Forbidden Roles |
| ------ | ----- | ------------- | --------------- |
| `GET` | `/api/v1/admin/test` | `ADMIN` | `CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT` (403) |
| `GET` | `/api/v1/employer/test` | `EMPLOYER`, `ADMIN` | `CANDIDATE`, `TRAINING_PROVIDER`, `GOVERNMENT` (403) |
| `GET` | `/api/v1/candidate/test` | `CANDIDATE`, `ADMIN` | All unauthenticated or unauthorized roles (403) |
| `GET` | `/api/v1/training-provider/test` | `TRAINING_PROVIDER`, `ADMIN` | `CANDIDATE`, `EMPLOYER`, `GOVERNMENT` (403) |
| `GET` | `/api/v1/government/test` | `GOVERNMENT`, `ADMIN` | `CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER` (403) |

---

## 5. Core Domain Foundation Endpoints (Phase 3)

### 5.1 Skill Taxonomy Endpoints (`/api/v1/skills`)

- **List Skills**: `GET /api/v1/skills`
  - Query Params: `category` (optional), `search` (keyword search), `skip`, `limit`
  - Auth: Public / Optional
- **Get Skill**: `GET /api/v1/skills/{skill_id}`
  - Auth: Public / Optional
- **Create Skill**: `POST /api/v1/skills`
  - Payload: `{"name": str, "category": str, "description": str}`
  - Auth: `EMPLOYER`, `TRAINING_PROVIDER`, `ADMIN`
  - Conflict: HTTP 409 if normalized name already exists

### 5.2 Job Requisition Endpoints (`/api/v1/jobs`)

- **List Jobs**: `GET /api/v1/jobs`
  - Query Params: `employer_id` (optional), `is_active` (optional), `skip`, `limit`
  - Includes: Attached required skills list with weights and minimum proficiency levels
  - Auth: Public / Optional
- **Get Job**: `GET /api/v1/jobs/{job_id}`
  - Auth: Public / Optional
- **Post Job**: `POST /api/v1/jobs`
  - Payload: Job metadata + optional `skills: [{"skill_id": UUID, "is_required": bool, "minimum_proficiency": str, "weight": float}]`
  - Auth: `EMPLOYER`, `ADMIN`

### 5.3 Course Curriculum Endpoints (`/api/v1/courses`)

- **List Courses**: `GET /api/v1/courses`
  - Query Params: `provider_id` (optional), `is_active` (optional), `skip`, `limit`
  - Includes: Attached skills taught in curriculum
  - Auth: Public / Optional
- **Get Course**: `GET /api/v1/courses/{course_id}`
  - Auth: Public / Optional
- **Create Course**: `POST /api/v1/courses`
  - Payload: Course metadata + optional `skills: [{"skill_id": UUID}]`
  - Auth: `TRAINING_PROVIDER`, `ADMIN`

### 5.4 Role Profile Endpoints (`/api/v1/profiles`)

- **Get My Profile**: `GET /api/v1/profiles/me`
  - Returns authenticated user's role-appropriate profile
  - Auth: Authenticated (`Bearer <token>`)
- **Update Candidate Profile**: `PUT /api/v1/profiles/me/candidate`
  - Auth: `CANDIDATE`
- **Update Employer Profile**: `PUT /api/v1/profiles/me/employer`
  - Auth: `EMPLOYER`, `ADMIN`
- **Update Training Provider Profile**: `PUT /api/v1/profiles/me/training-provider`
  - Auth: `TRAINING_PROVIDER`, `ADMIN`
- **Update Government Profile**: `PUT /api/v1/profiles/me/government`
  - Auth: `GOVERNMENT`, `ADMIN`

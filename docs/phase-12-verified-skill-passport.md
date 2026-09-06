# Phase 12 — Verified Skill Passport

## 1. Executive Summary

Phase 12 delivers an authoritative, explainable, and deterministic **Verified Skill Passport** for the SkillSync AI ecosystem. The system bridges candidate profiles, course completions, external certifications, and self-declarations into a trustworthy competency record.

### Core Architectural Principle
> **Verified Skill is strictly deterministic and evidence-backed.**
> AI (LLMs or embeddings) can assist with extracting text or semantic matching, but **AI output is never the final verification authority**. Every verified skill in the passport is grounded in verifiable database evidence with an explainable reason.

---

## 2. Core Domain Data Model

```
                    ┌────────────────────────────┐
                    │      CandidateProfile      │
                    └─────────────┬──────────────┘
                                  │ 1..*
            ┌─────────────────────┼────────────────────┐
            │                     │                    │
            ▼                     ▼                    ▼
   ┌─────────────────┐   ┌─────────────────┐  ┌─────────────────────┐
   │  SkillEvidence  │   │  VerifiedSkill  │  │ SkillPassportShare  │
   └────────┬────────┘   └────────┬────────┘  └─────────────────────┘
            │                     │
            └──────────┬──────────┘
                       ▼
               ┌───────────────┐
               │     Skill     │ (Canonical Phase 5 Catalog)
               └───────────────┘
```

### 2.1 Domain Entities

1. **`SkillEvidence` (`skill_evidence`)**
   - Represents granular verifiable artifacts proving candidate engagement with a canonical skill.
   - **Fields**: `id` (UUID), `candidate_id` (FK), `skill_id` (FK), `evidence_type` (Enum), `source_id` (UUID nullable), `title` (str), `description` (text), `evidence_url` (str nullable), `issued_at` (timestamptz), `completed_at` (timestamptz), `meta` (JSONB), `status` (VALID, REVOKED, EXPIRED).
   - **Unique Constraint**: `uq_skill_evidence_source (candidate_id, skill_id, evidence_type, source_id)` ensures deduplication.

2. **`VerifiedSkill` (`verified_skills`)**
   - Canonical candidate-level competency record with explicit verification status and deterministic audit summary.
   - **Fields**: `id` (UUID), `candidate_id` (FK), `skill_id` (FK), `verification_status` (VERIFIED, UNVERIFIED, EXPIRED, REJECTED), `verification_method` (COURSE_COMPLETION, CERTIFICATION, ASSESSMENT, CANDIDATE_DECLARATION, RESUME_EXTRACTION, NONE), `verification_score` (float nullable), `verified_at` (timestamptz), `expires_at` (timestamptz), `verification_summary` (text).
   - **Unique Constraint**: `uq_candidate_verified_skill (candidate_id, skill_id)`.

3. **`SkillPassportShare` (`skill_passport_shares`)**
   - Manages secure, revocable token-based public sharing.
   - **Fields**: `id` (UUID), `candidate_id` (FK, unique), `share_token` (String(64), unique, indexed), `is_enabled` (Boolean).

---

## 3. Evidence Precedence & Deterministic Rules

The verification engine (`verified_skill_service.py`) evaluates evidence strictly in order of evidentiary authority:

```
1. CERTIFICATION / ASSESSMENT (Valid & Unexpired)  ──> VERIFIED (Method: CERTIFICATION/ASSESSMENT)
2. COURSE_COMPLETION (100% Finished + Published)    ──> VERIFIED (Method: COURSE_COMPLETION)
3. RESUME_EXTRACTION (AI Extracted from Resume)     ──> UNVERIFIED (Method: RESUME_EXTRACTION)
4. CANDIDATE_DECLARATION (Self-Reported Skill)      ──> UNVERIFIED (Method: CANDIDATE_DECLARATION)
```

### Deterministic Rule Definitions

* **Rule A — Course Completion**: Requires candidate enrollment in a `PUBLISHED` training course with all curriculum lessons completed (`100% progress` -> `EnrollmentStatus.COMPLETED`). All canonical skills associated with the course via `CourseSkill` receive `COURSE_COMPLETION` evidence and are marked `VERIFIED`.
* **Rule B — Candidate Declaration**: Self-reported skills in `CandidateSkill` appear in the passport with status `UNVERIFIED` and method `CANDIDATE_DECLARATION`. They are never upgraded without supporting evidence.
* **Rule C — Resume Extraction**: Skills extracted by AI parser are recorded as `RESUME_EXTRACTION` evidence with status `UNVERIFIED`.
* **Rule D — Certification**: Valid certifications produce `VERIFIED` status. Expired certifications (where `meta.expires_at < now`) produce `EXPIRED` status.
* **Rule E — Evidence Deletion / Revocation**: Deleting a certification or evidence item triggers instant deterministic recalculation, cleanly reverting the skill to unverified if no other verifying evidence exists.

---

## 4. API Endpoints

### Candidate Passport Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/candidate/passport` | Candidate, Admin | Get current candidate's full Verified Skill Passport |
| `POST` | `/api/v1/candidate/passport/recalculate` | Candidate, Admin | Idempotently recalculate verification across all evidence |
| `GET` | `/api/v1/candidate/passport/evidence` | Candidate, Admin | List all evidence items owned by candidate |
| `POST` | `/api/v1/candidate/passport/evidence` | Candidate, Admin | Submit manual evidence (e.g. external certification) |
| `DELETE` | `/api/v1/candidate/passport/evidence/{id}` | Candidate, Admin | Delete owned evidence item and recalculate passport |
| `GET` | `/api/v1/candidate/passport/share` | Candidate, Admin | Get public sharing token and toggle status |
| `POST` | `/api/v1/candidate/passport/share` | Candidate, Admin | Enable or disable public share link |

### Public & Employer Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/passport/share/{share_token}` | Public | Read-only view of passport via unguessable token (no UUIDs) |
| `GET` | `/api/v1/employer/candidates/{id}/passport` | Employer, Admin | Employer view of applicant passport (requires active application) |

---

## 5. Security & Authorization Architecture

1. **IDOR Prevention**:
   - All candidate endpoints resolve the candidate profile strictly from the authenticated JWT `current_user`.
   - Evidence deletion verifies `SkillEvidence.candidate_id == candidate_profile.id`.
2. **Employer Access Control**:
   - Employers can only view candidate passports if the candidate has submitted a formal `Application` to a job requisition owned by the employer. Unconnected employers receive `403 Forbidden`.
3. **Cryptographic Public Sharing**:
   - Public URLs use a high-entropy URL-safe token (`secrets.token_urlsafe(32)`).
   - Candidate internal UUIDs, emails, and private metadata are excluded from public responses.
   - When sharing is disabled, public requests immediately return `404 Not Found`.

---

## 6. Integrations

### 6.1 Career Copilot Integration (Phase 10)
`CareerContextService` queries `VerifiedSkill` directly from PostgreSQL and structures the context into two distinct sections:
```text
### CANDIDATE VERIFIED SKILLS (EVIDENCE-BACKED COMPETENCY)
- Python | Verified through completed course: Python Backend Development
- PostgreSQL | Verified through completed course: PostgreSQL for Backend Engineers

### CANDIDATE UNVERIFIED / SELF-DECLARED SKILLS
- Docker | Level: INTERMEDIATE | Experience: 1.0 yrs (Self-Declared / Unverified)
```
The LLM is prompted with these authoritative sections and cannot alter the verification classification.

### 6.2 Training Provider Curriculum (Phase 11)
When all lessons of a course are completed by an enrolled student, `EnrollmentStatus.COMPLETED` is recorded. The passport verification engine auto-harvests `COURSE_COMPLETION` evidence for all canonical skills taught in the course.

---

## 7. Verification & Testing

### Test Suite Execution
* **Backend (`pytest`)**: 136 tests passing (12 new Phase 12 tests + 124 regression tests).
* **Frontend (`vitest`)**: 90 unit/integration tests passing (25 test suites).
* **Code Quality**:
  - Ruff lint & format: 100% clean.
  - ESLint: 0 warnings, 0 errors.
  - TypeScript (`tsc --noEmit`): 0 errors.
  - Next.js Production Build: Successfully compiled and optimized.
* **Alembic Migration**: `0009_training_curriculum` -> `0010_verified_skill_passport` upgrade/downgrade/re-upgrade verified with 1 head.

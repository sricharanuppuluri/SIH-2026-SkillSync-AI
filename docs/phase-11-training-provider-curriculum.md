# Phase 11 — Training Provider & Curriculum Module Documentation

## 1. Overview & Objective
Phase 11 introduces the **Training Provider & Curriculum Module** of the SkillSync_AI platform. This module establishes a deterministic, skill-aligned vocational training ecosystem that connects:
$$\text{Training Provider} \longrightarrow \text{Course} \longrightarrow \text{Structured Curriculum} \longrightarrow \text{Canonical Skills} \longrightarrow \text{Candidate Enrollment} \longrightarrow \text{Progress Tracking} \longrightarrow \text{Course Completion} \longrightarrow \text{Skill Evidence}$$

Authorized training providers can manage vocational programs, align curricula to authoritative Phase 5 canonical skills, and publish courses. Candidates can discover published courses matching their skill gaps, enroll securely within seat capacity constraints, track lesson-by-lesson progress, and earn structured training evidence upon completion.

---

## 2. Core Architecture & Design Principles
1. **Authoritative Canonical Skill Intelligence**:
   - Courses must map strictly to canonical skills (`Skill` catalog from Phase 5). Providers cannot create arbitrary ad-hoc skills. Unknown or inactive skills are rejected at the API level with clear validation errors.
2. **Deterministic Curriculum & Progress**:
   - Curricula consist of ordered `CurriculumModule` and `CurriculumLesson` records with explicit `order_index`.
   - Candidate progress is calculated deterministically based on verified lesson completions ($P = \frac{\text{completed\_lessons}}{\text{total\_lessons}} \times 100$).
   - When all lessons are completed, enrollment automatically transitions to `COMPLETED`. No LLM is used for completion decisions.
3. **Transactional Seat Capacity Protection**:
   - Course capacity is locked server-side using PostgreSQL transactional row locking (`with_for_update()`) during enrollment to prevent race conditions and overbooking.
4. **Structured Training Evidence (Not Automatic Skill Verification)**:
   - Completing a course records verifiable training evidence and documents taught skills. It does not automatically elevate a candidate to "Expert" or issue unearned certifications, preserving integrity for the Phase 12 Skill Passport.
5. **Zero Paid AI Dependencies & Strict RBAC**:
   - The module is 100% deterministic and free/open-source.
   - Strict JWT-derived authentication and identity isolation prevent IDOR across providers and candidates.

---

## 3. Database Schema Changes (`0009_training_curriculum`)

### Extended Tables
- **`courses`**:
  - `status`: Enum (`DRAFT`, `PUBLISHED`, `CLOSED`)
  - `difficulty`: Enum (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
  - `category`: String (indexed)
  - `location_state`: String (nullable)
  - `start_date`, `end_date`, `enrollment_deadline`: Timestamps (nullable)
  - Constraint: `ck_courses_capacity_positive` (`capacity > 0`)
  - Indexes: `ix_courses_status`, `ix_courses_category`, `ix_courses_difficulty`, `ix_courses_delivery_mode`
- **`training_provider_profiles`**:
  - `description`: Text (nullable)

### New Tables
- **`curriculum_modules`**:
  - `id`: UUID (Primary Key)
  - `course_id`: UUID (Foreign Key `courses.id`, `ON DELETE CASCADE`)
  - `title`: String (not null)
  - `description`: Text (nullable)
  - `order_index`: Integer (not null, indexed)
  - `created_at`, `updated_at`: Timestamps
  - Constraint: `uq_curriculum_modules_course_order (course_id, order_index)`
- **`curriculum_lessons`**:
  - `id`: UUID (Primary Key)
  - `module_id`: UUID (Foreign Key `curriculum_modules.id`, `ON DELETE CASCADE`)
  - `title`: String (not null)
  - `description`: Text (nullable)
  - `content_reference`: String (nullable)
  - `order_index`: Integer (not null, indexed)
  - `duration_minutes`: Integer (default 30)
  - `created_at`, `updated_at`: Timestamps
  - Constraint: `uq_curriculum_lessons_module_order (module_id, order_index)`
- **`enrollment_lesson_progress`**:
  - `id`: UUID (Primary Key)
  - `enrollment_id`: UUID (Foreign Key `enrollments.id`, `ON DELETE CASCADE`)
  - `lesson_id`: UUID (Foreign Key `curriculum_lessons.id`, `ON DELETE CASCADE`)
  - `completed`: Boolean (default True)
  - `completed_at`: Timestamp (not null)
  - `created_at`: Timestamp
  - Constraint: `uq_enrollment_lesson_progress (enrollment_id, lesson_id)`

---

## 4. API Specification

### Training Provider Endpoints (`/api/v1/training-provider`)
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/profile` | `TRAINING_PROVIDER`, `ADMIN` | Get authenticated provider profile |
| `PUT` | `/profile` | `TRAINING_PROVIDER`, `ADMIN` | Update provider institution details |
| `GET` | `/dashboard` | `TRAINING_PROVIDER`, `ADMIN` | Get live aggregate metrics and recent records |
| `GET` | `/courses` | `TRAINING_PROVIDER`, `ADMIN` | List provider-owned courses with status filtering |
| `POST` | `/courses` | `TRAINING_PROVIDER`, `ADMIN` | Create new vocational course |
| `GET` | `/courses/{course_id}` | `TRAINING_PROVIDER`, `ADMIN` | Get course details, mapped skills, and curriculum |
| `PUT` | `/courses/{course_id}` | `TRAINING_PROVIDER`, `ADMIN` | Update course metadata |
| `POST` | `/courses/{course_id}/skills` | `TRAINING_PROVIDER`, `ADMIN` | Map canonical skills with catalog validation |
| `POST` | `/courses/{course_id}/publish` | `TRAINING_PROVIDER`, `ADMIN` | Validate and publish course |
| `POST` | `/courses/{course_id}/close` | `TRAINING_PROVIDER`, `ADMIN` | Soft-close course to halt new enrollments |
| `GET` | `/courses/{course_id}/enrollments` | `TRAINING_PROVIDER`, `ADMIN` | View candidate enrollments in owned course |
| `GET` | `/courses/{course_id}/curriculum` | `TRAINING_PROVIDER`, `ADMIN` | Get ordered curriculum modules & lessons |
| `POST` | `/courses/{course_id}/curriculum/modules` | `TRAINING_PROVIDER`, `ADMIN` | Add curriculum module |
| `PUT` | `/courses/{course_id}/curriculum/modules/{module_id}` | `TRAINING_PROVIDER`, `ADMIN` | Edit curriculum module |
| `DELETE` | `/courses/{course_id}/curriculum/modules/{module_id}` | `TRAINING_PROVIDER`, `ADMIN` | Delete module & cascading lessons |
| `PUT` | `/courses/{course_id}/curriculum/modules/reorder` | `TRAINING_PROVIDER`, `ADMIN` | Reorder curriculum modules |
| `POST` | `/courses/{course_id}/curriculum/modules/{module_id}/lessons` | `TRAINING_PROVIDER`, `ADMIN` | Add lesson to module |
| `PUT` | `/courses/{course_id}/curriculum/modules/{module_id}/lessons/{lesson_id}` | `TRAINING_PROVIDER`, `ADMIN` | Edit lesson details & duration |
| `DELETE` | `/courses/{course_id}/curriculum/modules/{module_id}/lessons/{lesson_id}` | `TRAINING_PROVIDER`, `ADMIN` | Delete lesson |
| `PUT` | `/courses/{course_id}/curriculum/modules/{module_id}/lessons/reorder` | `TRAINING_PROVIDER`, `ADMIN` | Reorder lessons within module |

### Candidate Learning Endpoints (`/api/v1/candidate/learning`)
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/courses` | `CANDIDATE`, `ADMIN` | Discover published courses (search, skill, difficulty, mode) |
| `GET` | `/courses/{course_id}` | `CANDIDATE`, `ADMIN` | View public course details and full curriculum |
| `POST` | `/courses/{course_id}/enroll` | `CANDIDATE`, `ADMIN` | Transactional course enrollment |
| `GET` | `/enrollments` | `CANDIDATE`, `ADMIN` | List candidate's enrolled courses with progress |
| `GET` | `/enrollments/{enrollment_id}/progress` | `CANDIDATE`, `ADMIN` | Get lesson-by-lesson progress state |
| `PUT` | `/enrollments/{enrollment_id}/lessons/{lesson_id}/progress` | `CANDIDATE`, `ADMIN` | Mark lesson completed / in-progress |

---

## 5. Security & IDOR Isolation
- **Authentication**: All endpoints require valid JWT bearer tokens.
- **Provider Ownership**: Every operation on a course, module, or lesson checks `course.provider_id == current_provider.id`. Attempts by unauthorized providers return `403 Forbidden` / `404 Not Found`.
- **Candidate Ownership**: Candidate enrollment progress and discovery only expose records belonging to `current_candidate.id`.
- **Course Draft Isolation**: Draft courses are strictly hidden from candidate discovery and public listings.

---

## 6. Frontend Architecture
- **Provider Experience**:
  - `/training-provider/dashboard`: Live KPI stat cards (Total Courses, Published, Active/Completed Enrollments, Capacity), recent courses, recent learner activity.
  - `/training-provider/courses`: Course catalog management with status tabs (All, Draft, Published, Closed) and search.
  - `/training-provider/courses/new`: Multi-section course creation form integrating canonical skill selection and curriculum builder.
  - `/training-provider/courses/[courseId]`: Tabbed workspace for metadata, canonical skill management, dynamic curriculum organizer, candidate preview, publish/close actions, and enrolled learners table.
  - `/training-provider/profile`: Institution profile and accreditation management.
- **Candidate Experience**:
  - `/candidate/learning`: Dual-tab Learning Hub ("My Enrolled Programs" with live progress bars & resume learning actions; "Explore Course Catalog" with search and filters).
  - `/candidate/learning/[courseId]`: Course detail overview, taught skills badges, curriculum breakdown, capacity status, and 1-click enroll.
  - `/candidate/learning/progress/[enrollmentId]`: Interactive lesson progress checklist, dynamic percentage calculation, and celebratory skill evidence completion banner.

---

## 7. Career Copilot Integration
The Phase 10 Career Copilot context builder (`career_context_service.py`) was extended to include:
1. Candidate's active and completed enrolled courses and their progress percentages.
2. Canonical course recommendations filtered strictly to `PUBLISHED` courses in the database.
3. Accurate answers regarding taught skills sourced directly from `CourseSkill` relationships without fabrication.

---

## 8. Verification & Test Summary
- **Backend Test Suite**: `124 passed in ~76s` across all phases.
- **Frontend Test Suite**: `84 passed in ~10s` (23 test suites).
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Linting**: `npm run lint` and `ruff check .` passed with 0 warnings/errors.
- **Formatting**: `ruff format --check .` passed (104 files verified).
- **Next.js Production Build**: `npm run build` compiled 32/32 routes successfully.
- **Alembic Migrations**: Verified full cycle: `upgrade head` $\rightarrow$ `downgrade 0008` $\rightarrow$ `upgrade head` (Single head: `0009_training_curriculum`).

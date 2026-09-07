# Phase 17 — Employment Outcome Intelligence & Provider Performance Index

## 1. Objective

Phase 17 completes the definitive outcome feedback loop for SkillSync_AI. By capturing verified post-training employment placements, monitoring longitudinal job retention milestones (30-day, 90-day, 180-day), collecting structured employer satisfaction feedback, and calculating a deterministic **Provider Performance Index (PPI)**, the platform converts downstream labor market results into actionable intelligence for job seekers, training providers, employers, and government policy makers.

---

## 2. Architecture & Feedback Loop

The core SkillSync_AI feedback lifecycle operates as follows:

```text
Industry Demand (Jobs & Contracts)
      ↓
Skill Intelligence & Digital Twin
      ↓
Training Curriculum & Enrollment
      ↓
Verified Competency & Skill Passport
      ↓
Employment & Placement Tracking
      ↓
Longitudinal Retention & Employer Feedback
      ↓
Provider Performance Index (PPI)
      ↓
Evidence-Based Training & Hiring Decisions
```

Outcome intelligence functions as a strictly downstream analytical layer. It aggregates and evaluates real-world labor outcomes without modifying or mutating upstream models (such as `CandidateSkill`, `VerifiedSkill`, `Job`, `Application`, `Course`, `Enrollment`, or `SkillContract`).

---

## 3. Database Models & Schema Design

Phase 17 adds three core entities in migration `0012_outcome_intelligence.py`:

```
+-------------------------------------------------------------------------------+
|                             placement_outcomes                                |
|-------------------------------------------------------------------------------|
| id: UUID (PK)                                                                 |
| application_id: UUID (FK -> applications.id, UNIQUE, ON DELETE CASCADE)       |
| candidate_id: UUID (FK -> candidate_profiles.id, ON DELETE CASCADE)           |
| employer_id: UUID (FK -> employer_profiles.id, ON DELETE CASCADE)             |
| job_id: UUID (FK -> jobs.id, ON DELETE CASCADE)                               |
| contract_id: UUID (FK -> skill_contracts.id, NULLABLE, ON DELETE SET NULL)   |
| placement_date: Date                                                          |
| starting_salary_annual: Float (Nullable)                                      |
| employment_type: ENUM (FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP)            |
| retention_status: ENUM (ACTIVE, LEFT_WITHIN_30D, RETAINED_90D, ...)           |
| contract_fulfillment_score: Float (0-100, Nullable)                           |
| employer_satisfaction_rating: Integer (1-5, Nullable)                         |
| employer_feedback_notes: Text (Nullable)                                      |
| verified_by_employer: Boolean (Default: True)                                 |
| created_at / updated_at: DateTime(UTC)                                        |
+-------------------------------------------------------------------------------+
                                      │ 1
                                      ▼ N
+-------------------------------------------------------------------------------+
|                       placement_training_attributions                         |
|-------------------------------------------------------------------------------|
| id: UUID (PK)                                                                 |
| placement_id: UUID (FK -> placement_outcomes.id, ON DELETE CASCADE)           |
| enrollment_id: UUID (FK -> enrollments.id, ON DELETE CASCADE)                 |
| course_id: UUID (FK -> courses.id, ON DELETE CASCADE)                         |
| provider_id: UUID (FK -> training_provider_profiles.id, ON DELETE CASCADE)    |
| completed_at: DateTime(UTC)                                                   |
| UNIQUE(placement_id, course_id)                                               |
+-------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------+
|                        provider_performance_snapshots                         |
|-------------------------------------------------------------------------------|
| id: UUID (PK)                                                                 |
| provider_id: UUID (FK -> training_provider_profiles.id, ON DELETE CASCADE)    |
| period_start: Date                                                            |
| period_end: Date                                                              |
| total_enrolled: Integer                                                       |
| total_completed: Integer                                                      |
| total_placed: Integer                                                         |
| completion_rate: Float (0-100)                                                |
| placement_rate: Float (0-100)                                                 |
| retention_rate_90d: Float (0-100)                                             |
| average_starting_salary: Float (Nullable)                                     |
| average_employer_rating: Float (Nullable)                                     |
| ppi_score: Float (0-100)                                                      |
| ppi_tier: ENUM (TIER_1_EXCELLENT, TIER_2_PROFICIENT, TIER_3, TIER_4)          |
| UNIQUE(provider_id, period_start, period_end)                                 |
+-------------------------------------------------------------------------------+
```

---

## 4. Multi-Course Training Attribution Strategy

A candidate can complete multiple training programs across different providers before securing an employment placement. Rather than creating a single fragile foreign key (`placement_outcomes.course_id`), Phase 17 implements a normalized junction entity `placement_training_attributions`.

### Key Attribution Principles:
1. **Multi-Course Association**: Every completed course (`EnrollmentStatus.COMPLETED`) of the candidate at the time of placement is automatically attributed.
2. **Exclusion of Incomplete Training**: In-progress or dropped enrollments are excluded from attribution.
3. **No Unwarranted Causal Claims**:
> *Training attribution indicates an association between completed training and an employment outcome; it does not establish causal proof that a particular course caused employment.*

---

## 5. Placement & Retention Lifecycle

### Placement Recording (`record_placement`):
1. Must be initiated by the hiring **EMPLOYER** (or **ADMIN**).
2. Application must exist and be in `ApplicationStatus.HIRED` state.
3. Application must belong to a job requisition owned by the calling employer.
4. Idempotent / Unique: Exactly one placement record per application (`application_id` unique).
5. Automatic association with active `SkillContract` if not explicitly specified.

### Retention Milestone Progression (`update_retention_and_feedback`):
1. Allowed retention transitions:
   - `ACTIVE` $\to$ `LEFT_WITHIN_30D`, `RETAINED_90D`, `TERMINATED`, `ACTIVE`
   - `RETAINED_90D` $\to$ `RETAINED_180D`, `TERMINATED`, `RETAINED_90D`
   - `RETAINED_180D` $\to$ `TERMINATED`, `RETAINED_180D`
   - `LEFT_WITHIN_30D` $\to$ `LEFT_WITHIN_30D`
   - `TERMINATED` $\to$ `TERMINATED`
2. Regressions (e.g. `TERMINATED` or `RETAINED_180D` $\to$ `ACTIVE`) are rejected with HTTP 400 Bad Request.

---

## 6. Deterministic Provider Performance Index (PPI)

The Provider Performance Index is computed deterministically without reliance on LLMs or nondeterministic heuristics.

### Mathematical Formula:

$$\text{PPI} = (0.25 \times \text{CompletionRate}) + (0.35 \times \text{PlacementRate}) + (0.20 \times \text{RetentionRate}_{90d}) + (0.20 \times \text{EmployerRatingNormalized})$$

Where:
$$\text{CompletionRate} = \frac{\text{Total Completed Enrollments}}{\text{Total Enrollments}} \times 100$$

$$\text{PlacementRate} = \min\left(100, \frac{\text{Attributed Placed Graduates}}{\text{Total Completed Enrollments}} \times 100\right)$$

$$\text{RetentionRate}_{90d} = \frac{\text{Placements Retained }\ge 90\text{ Days}}{\text{Total Attributed Placements}} \times 100$$

$$\text{EmployerRatingNormalized} = \begin{cases} \left(\frac{\text{Average Employer Rating}}{5.0}\right) \times 100 & \text{if ratings exist} \\ 0.0 & \text{otherwise} \end{cases}$$

---

## 7. Deterministic PPI Tiers

| Tier Name | Score Range | Description |
|---|---|---|
| `TIER_1_EXCELLENT` | $\text{PPI} \ge 85.0$ | Benchmark institutional conversion and high employer satisfaction |
| `TIER_2_PROFICIENT` | $70.0 \le \text{PPI} < 85.0$ | Consistently strong graduation and job placement performance |
| `TIER_3_DEVELOPING` | $50.0 \le \text{PPI} < 70.0$ | Moderate completion or placement velocity with growth potential |
| `TIER_4_NEEDS_IMPROVEMENT` | $\text{PPI} < 50.0$ | Low conversion or retention requiring curriculum intervention |

---

## 8. Missing-Data & Edge-Case Rules

1. **No enrollments**: `CompletionRate = 0.0`, `PPI = 0.0`, Tier = `TIER_4_NEEDS_IMPROVEMENT`.
2. **No completions**: `PlacementRate = 0.0`.
3. **No placements**: `RetentionRate_90d = 0.0`. Unknown outcomes are never assumed to be retained.
4. **No employer ratings**: `EmployerRatingNormalized = 0.0`. No synthetic ratings are fabricated.
5. **No salary data**: Salary averages evaluate to `null` (`None`) rather than defaulting to zero.

---

## 9. API Specifications

| Method | Endpoint | Authorized Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/outcomes/placements` | `EMPLOYER`, `ADMIN` | Record verified candidate employment placement |
| `GET` | `/api/v1/outcomes/placements` | All Authenticated | List authorized placements (scoped by caller role) |
| `GET` | `/api/v1/outcomes/placements/{id}` | Authorized Caller | Get single placement outcome details & attribution |
| `PUT` | `/api/v1/outcomes/placements/{id}/retention` | `EMPLOYER`, `ADMIN` | Update post-hire retention status & employer rating |
| `GET` | `/api/v1/outcomes/providers/{id}/performance` | All Authenticated | Get real-time institutional PPI and sub-score metrics |
| `GET` | `/api/v1/outcomes/providers/leaderboard` | All Authenticated | Deterministically ranked provider leaderboard |
| `GET` | `/api/v1/outcomes/analytics/overview` | All Authenticated | Macro-level ecosystem outcome KPIs (Zero PII) |
| `GET` | `/api/v1/outcomes/analytics/skills` | All Authenticated | Canonical skill placement & wage conversion stats |

---

## 10. RBAC, IDOR & Privacy Protections

### Role-Based Access Control (RBAC):
- **Candidate**: Can view own placement outcomes. Cannot record placements, submit retention updates, or view employer feedback ratings.
- **Employer**: Can record placements for candidates hired into owned jobs. Can update retention milestones and satisfaction ratings for own hires. Cannot access other employers' placements.
- **Training Provider**: Can inspect institutional PPI, sub-score breakdown, and anonymized graduate outcomes. Cannot modify retention or view private candidate PII.
- **Government / Admin**: Can inspect macro ecosystem analytics, district benchmarks, provider leaderboard, and skill conversion rates.

### IDOR Protection:
All endpoints query and verify tenancy relationships at the database layer before returning or mutating placement records.

### Zero PII Policy:
Macro overview endpoints (`/outcomes/analytics/overview`, `/outcomes/analytics/skills`) and training provider views never expose candidate emails, phone numbers, addresses, or resumes.

---

## 11. Verification & Regression Validation

- **Backend Pytest**: 212 tests passing across all suites (`tests/test_outcome_intelligence.py` + all regression suites).
- **Backend Lint & Formatting**: `uv run ruff check .` and `uv run ruff format --check .` (0 warnings, 0 errors).
- **Alembic Migrations**: Single head `0012_outcome_intelligence` with verified upgrade, downgrade, and re-upgrade.
- **Frontend Vitest**: 131 tests passing across 32 test suites (`OutcomeComponents.test.tsx`, `AnalyticsPage.test.tsx`, etc.).
- **Frontend Lint**: `npm run lint` passing with 0 warnings / 0 errors.
- **Frontend Type Check**: `npx tsc --noEmit` passing with 0 errors.
- **Frontend Build**: `npm run build` compiling 38 static and dynamic routes.

---

## 12. Known Limitations & Future Improvements

1. **Longitudinal Verification**: Multi-year (1-3 year) career progression tracking will be expanded in future versions.
2. **Tax / Payroll API Verification**: Current verification relies on employer confirmation and employment contracts; future phases can integrate third-party payroll verification APIs.

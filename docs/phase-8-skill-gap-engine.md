# Phase 8 — Skill Gap Engine Documentation

## 1. Purpose & Objective

The **Skill Gap Engine** is a deterministic, explainable subsystem in SkillSync AI (SIH 2026). It evaluates candidate competencies against job requisition requirements to determine:
1. What canonical skills the candidate currently possesses.
2. What competencies the target job requires and at what minimum proficiency levels.
3. Where the candidate's skill deficits exist (`MATCHED`, `PARTIAL`, or `MISSING`).
4. The severity of each skill deficit (`LOW`, `MEDIUM`, or `HIGH`).
5. A deterministic, explainable **Skill Alignment Score** (0–100%).
6. Deterministic, human-readable explanations derived directly from database records.

> [!IMPORTANT]
> The Skill Gap Engine is **100% deterministic and rule-based**. It does NOT use LLMs, Ollama, pgvector embeddings, probabilistic inference, or stochastic AI recommendation systems.

---

## 2. Architecture & Data Sources

### Architectural Flow

```text
  Authenticated Candidate (JWT)                Target Job Requisition
                │                                         │
                ▼                                         ▼
   CandidateProfile + CandidateSkill             Job + JobSkill Junction
   (UUID, Canonical skill_id, Proficiency)       (UUID, Canonical skill_id, Minimum Proficiency)
                │                                         │
                └───────────────────┬─────────────────────┘
                                    │
                                    ▼
                         Canonical Skill Catalog
                         (Normalized Taxonomy Entities)
                                    │
                                    ▼
                      Deterministic Skill Gap Engine
                      ├── Proficiency Ordinal Mapping (1 to 4)
                      ├── Match Status Classification (MATCHED / PARTIAL / MISSING)
                      ├── Deficit Severity Evaluation (MEDIUM / HIGH)
                      ├── Explainable Alignment Score (0.0 – 100.0%)
                      └── Deterministic Text Explanations
                                    │
                                    ▼
                             SkillGapReport
                                    ├── Summary (total, matched, partial, missing)
                                    ├── Itemized Gap Records with Explanations
                                    └── Overall Skill Alignment Score
```

### Data Sources
1. **Candidate Competencies**: `candidate_skills` table (`candidate_id`, `skill_id`, `proficiency`, `years_experience`).
2. **Job Requirements**: `job_skills` table (`job_id`, `skill_id`, `minimum_proficiency`, `is_required`, `weight`).
3. **Canonical Skill Catalog**: `skills` table (`id`, `name`, `normalized_name`, `category`, `skill_type`).

---

## 3. Mathematical Formulations & Rules

### 1. Proficiency Ordinal Mapping

Proficiency levels are mapped to fixed ordinal integers:
```text
BEGINNER     = 1
INTERMEDIATE = 2
ADVANCED     = 3
EXPERT       = 4
```

Let:
- $P_{\text{req}} = \text{rank}(\text{job\_skill.minimum\_proficiency})$
- $P_{\text{cand}} = \text{rank}(\text{candidate\_skill.proficiency})$

---

### 2. Status Classification Rules

For each unique canonical skill required by the target job:

1. **`MATCHED`**: Candidate possesses the canonical skill AND $P_{\text{cand}} \ge P_{\text{req}}$.
2. **`PARTIAL`**: Candidate possesses the canonical skill AND $P_{\text{cand}} < P_{\text{req}}$.
3. **`MISSING`**: Candidate does not possess the canonical skill in their verified profile.

---

### 3. Deficit Severity Rules

- **`MATCHED`**: $\text{Severity} = \text{None}$ (no gap exists).
- **`MISSING`**: $\text{Severity} = \text{HIGH}$ (critical competency deficit).
- **`PARTIAL`**:
  - Let $\Delta = P_{\text{req}} - P_{\text{cand}}$
  - If $\Delta == 1 \implies \text{Severity} = \textbf{MEDIUM}$ (1 level below requirement).
  - If $\Delta \ge 2 \implies \text{Severity} = \textbf{HIGH}$ ($\ge 2$ levels below requirement).

---

### 4. Skill Alignment Score Formula

Let:
- $N = \text{total\_required\_skills}$
- $N_{\text{matched}} = \text{count of MATCHED skills}$
- $N_{\text{partial}} = \text{count of PARTIAL skills}$
- $N_{\text{missing}} = \text{count of MISSING skills}$

#### Mathematical Definition:
- If $N == 0 \implies \text{Score} = 100.0$
- If $N > 0$:
$$\text{Skill Alignment Score} = \text{round}\left( \frac{N_{\text{matched}} \times 1.0 + N_{\text{partial}} \times 0.5 + N_{\text{missing}} \times 0.0}{N} \times 100, 1 \right)$$

The score represents strictly the **skill requirement coverage** between the candidate's profile and the job posting. It is never presented as an AI hiring probability.

---

### 5. Deterministic Explanations

All explanations are generated deterministically using template formatting:
- **`MATCHED`**: `"Candidate has {skill_name} at {candidate_proficiency}, meeting the required {required_proficiency} proficiency."`
- **`PARTIAL`**: `"Candidate has {skill_name} at {candidate_proficiency} while the job requires {required_proficiency}."`
- **`MISSING`**: `"Candidate does not currently list {skill_name} as a skill."`

---

## 4. Worked Example

### Job Requirements:
1. **Python**: `ADVANCED` ($P_{\text{req}} = 3$)
2. **React**: `INTERMEDIATE` ($P_{\text{req}} = 2$)
3. **Docker**: `INTERMEDIATE` ($P_{\text{req}} = 2$)

### Candidate Profile Competencies:
1. **Python**: `INTERMEDIATE` ($P_{\text{cand}} = 2$)
2. **React**: `ADVANCED` ($P_{\text{cand}} = 3$)
3. (Docker is absent)

### Step-by-Step Evaluation:
1. **Python**:
   - $P_{\text{cand}} (2) < P_{\text{req}} (3) \implies$ **`PARTIAL`**
   - $\Delta = 3 - 2 = 1 \implies$ **`MEDIUM`** Severity
   - Explanation: `"Candidate has Python at INTERMEDIATE while the job requires ADVANCED."`
   - Contribution: $0.5$
2. **React**:
   - $P_{\text{cand}} (3) \ge P_{\text{req}} (2) \implies$ **`MATCHED`**
   - $\Delta = 0 \implies$ Severity: $\text{None}$
   - Explanation: `"Candidate has React at ADVANCED, meeting the required INTERMEDIATE proficiency."`
   - Contribution: $1.0$
3. **Docker**:
   - Absent $\implies$ **`MISSING`**
   - $\Delta = 2 \implies$ **`HIGH`** Severity
   - Explanation: `"Candidate does not currently list Docker as a skill."`
   - Contribution: $0.0$

### Final Score:
$$\text{Score} = \frac{1.0 + 0.5 + 0.0}{3} \times 100 = \frac{1.5}{3} \times 100 = 50.0\%$$

---

## 5. API Specification

### Endpoint: `GET /api/v1/candidate/jobs/{job_id}/skill-gap`

- **Authentication**: Bearer JWT required.
- **Authorization**: `CANDIDATE`, `ADMIN` (Employers/Training Providers/Government rejected with `403 Forbidden`).
- **Identity Isolation**: Candidate profile is resolved authoritatively from the caller's JWT subject (`current_user.id`). Direct client injection of arbitrary `candidate_id` is prevented.
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid JWT.
  - `403 Forbidden`: Authenticated user role is not `CANDIDATE` or `ADMIN`.
  - `404 Not Found`: Target `job_id` does not exist in the database.

#### Example Response Body (`SkillGapReport`):
```json
{
  "job_id": "8a329d60-0a2b-4e11-9a74-b5f7b8d8102a",
  "job_title": "Lead Backend Architect",
  "employer_name": "Vertex Labs",
  "candidate_id": "e963b651-41e2-4113-a442-f81504d603ec",
  "skill_alignment_score": 60.0,
  "summary": {
    "total_required_skills": 5,
    "matched_skills": 2,
    "partial_skills": 2,
    "missing_skills": 1
  },
  "gaps": [
    {
      "skill_id": "71337c76-d183-4a14-87cf-aa5c8c5c76eb",
      "skill_name": "Python",
      "skill_type": "TECHNICAL",
      "category": "Programming",
      "status": "MATCHED",
      "required_proficiency": "ADVANCED",
      "candidate_proficiency": "EXPERT",
      "candidate_years_experience": 5.0,
      "is_required": true,
      "weight": 1.0,
      "severity": null,
      "proficiency_delta": 0,
      "explanation": "Candidate has Python at EXPERT, meeting the required ADVANCED proficiency."
    },
    {
      "skill_id": "3bb87920-8025-4c07-b2eb-d27a421b8b88",
      "skill_name": "Docker",
      "skill_type": "TOOL",
      "category": "DevOps",
      "status": "PARTIAL",
      "required_proficiency": "ADVANCED",
      "candidate_proficiency": "INTERMEDIATE",
      "candidate_years_experience": 1.5,
      "is_required": true,
      "weight": 1.0,
      "severity": "MEDIUM",
      "proficiency_delta": 1,
      "explanation": "Candidate has Docker at INTERMEDIATE while the job requires ADVANCED."
    },
    {
      "skill_id": "d04e578c-02cf-4b7b-99f5-74ba81f62365",
      "skill_name": "React",
      "skill_type": "TECHNICAL",
      "category": "Framework",
      "status": "MISSING",
      "required_proficiency": "INTERMEDIATE",
      "candidate_proficiency": null,
      "candidate_years_experience": null,
      "is_required": true,
      "weight": 1.0,
      "severity": "HIGH",
      "proficiency_delta": 2,
      "explanation": "Candidate does not currently list React as a skill."
    }
  ]
}
```

---

## 6. Frontend Implementation

1. **Skill Gap Analysis Page (`/candidate/jobs/[jobId]/skill-gap`)**:
   - Dynamic Next.js route with responsive layout.
   - Prominent **Skill Alignment Score Meter** with tier feedback (High $\ge 80\%$, Moderate $\ge 50\%$, Significant Gap $< 50\%$).
   - High-level metric summary cards for Matched, Partial, and Missing counts.
   - Interactive status filter tabs (`All`, `Matched`, `Partial`, `Missing`).
   - Detailed itemized gap cards with category badges, required vs current proficiency indicators, severity badges, and explanations.
   - Contextual actions: "+ Add Skill" or "Upgrade" linking to `/candidate/skills`, "AI Extractor", and "Browse Jobs".
2. **Job Listings Integration (`/jobs`)**:
   - Each job card includes a direct "Analyze Skill Gap" CTA for candidates.

---

## 7. Verification & Validation Summary

### Backend Validation:
- **Pytest**: `92/92 PASS` (100% test pass rate across all 11 test modules, including `test_skill_gap.py`).
- **Ruff Check**: `All checks passed!` (0 errors across 77 Python files).
- **Ruff Format**: `77 files already formatted` (0 formatting discrepancies).
- **Database Migrations**: `0006_candidate_module (head)` (Zero unnecessary migrations created; single linear chain).

### Frontend Validation:
- **Vitest**: `19/19 test files PASS` (69 unit and component tests passing, including `skill-gap/page.test.tsx`).
- **ESLint**: `0 errors, 0 warnings` (via `$env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src`).
- **TypeScript**: `0 errors` (via `npx tsc --noEmit`).
- **Production Build**: `25/25 routes compiled successfully` (optimized production build).

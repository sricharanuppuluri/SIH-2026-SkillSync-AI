# SkillSync_AI — Live Demo Master Runbook

> **Smart India Hackathon 2026 — Click-by-Click Live Evaluation Script**  
> **Duration**: 3–5 Minutes  
> **Platform Version**: `v1.0.0-RC` (Release Candidate, Commit: `10fffe4`)  
> **Target Closed Loop**: Employer Job ➔ Skill Contract ➔ Demand Intelligence ➔ Forecast ➔ Candidate Skill Gap ➔ Training Course ➔ Verified Passport ➔ Semantic Match ➔ Hiring ➔ 90-Day Retention ➔ Provider PPI

---

## 1. Demo Credentials & Quick Switch Reference

| Persona | Email | Password | Role Badge | Initial URL |
| :--- | :--- | :--- | :--- | :--- |
| **Government Admin** | `dev.gov@skillsync.internal` | `DevPassword123!` | `GOVERNMENT` | `http://localhost:3000/demand` |
| **Enterprise Employer** | `dev.employer@skillsync.internal` | `DevPassword123!` | `EMPLOYER` | `http://localhost:3000/employer/jobs` |
| **Job Seeker Candidate**| `dev.candidate@skillsync.internal` | `DevPassword123!` | `CANDIDATE` | `http://localhost:3000/candidate/dashboard` |
| **Training Provider** | `dev.provider@skillsync.internal` | `DevPassword123!` | `TRAINING_PROVIDER` | `http://localhost:3000/training-provider/dashboard` |

---

## 2. Click-by-Click Live Demonstration Sequence

### STEP 1: Setting the Stage — The Employer Need & Skill Contract
- **Screen**: `http://localhost:3000/employer/jobs`
- **Persona**: Enterprise Employer (`dev.employer@skillsync.internal`)
- **Action**:
  1. Log in as Employer.
  2. Click on the job posting: **"Senior Cloud & AI Engineer"** at TechNova Solutions.
  3. Point out the structured skill requirements: `Python`, `FastAPI`, `PostgreSQL`, `Machine Learning`.
  4. Click the **"View Skill Contract"** button.
- **What the Judge Sees**:
  - Employer Jobs list with status badge `ACTIVE`.
  - Skill Contract panel showing versioned requirements:
    - Required competencies with proficiency levels (`ADVANCED`, `INTERMEDIATE`).
    - Requirement importance tags (`CRITICAL`, `HIGH`).
    - Verifiable evidence prerequisites (`VERIFIED_SKILL`, `COURSE_COMPLETION`).
- **What to Say**:
  > *"We begin with the employer, TechNova Solutions. Instead of publishing an unstructured text wishlist, TechNova defines structured competency standards through a versioned Skill Contract. They specify required proficiency levels, importance weights, and the exact evidence types expected from qualified applicants."*
- **Expected Result**: Job and Skill Contract load immediately with structured requirement cards.
- **Fallback**: If not logged in, log in with `dev.employer@skillsync.internal` / `DevPassword123!`.

---

### STEP 2: Macro Workforce Intelligence — Government Digital Twin
- **Screen**: `http://localhost:3000/demand`
- **Persona**: Government Admin (`dev.gov@skillsync.internal`)
- **Action**:
  1. Open a new tab or switch account to Government Admin.
  2. Navigate to `/demand`.
  3. Show the **"Skill Demand Digital Twin"** header and live regional metrics:
     - Total Skill Signals, High-Shortage Skills, Regional Supply Ratio.
  4. Click on the skill card for **"Python"** or **"Cloud Architecture"**.
- **What the Judge Sees**:
  - Live demand density metrics calculated across active job postings.
  - Shortage severity indicator (`CRITICAL` or `ELEVATED`).
  - Candidate supply vs. Employer demand ratio gauge.
- **What to Say**:
  > *"Now let's switch to the workforce planning perspective. TechNova's job creation doesn't remain in an isolated silo. It immediately updates our Skill Demand Digital Twin. Planners observe live demand signals and regional supply-to-demand ratios across specific competency areas."*
- **Expected Result**: Real-time KPI cards and top demanded skills list render cleanly.
- **Fallback**: Direct URL: `http://localhost:3000/demand`.

---

### STEP 3: Predictive Forecasting & What-If Policy Simulation
- **Screen**: `http://localhost:3000/simulator`
- **Persona**: Government Admin
- **Action**:
  1. Click **"What-If Simulator"** in the sidebar navigation.
  2. Select the **"AI & Deep Learning"** sector preset.
  3. Adjust the policy shock slider: Set **"FDI & R&D Tech Inflow"** to `+25%`.
  4. Click **"Run Non-Destructive Simulation"**.
- **What the Judge Sees**:
  - Side-by-side comparison chart: *Actual Baseline* vs. *Simulated Policy Scenario*.
  - Projected skill shortage expansion over 30, 60, and 90-day horizons.
  - Non-destructive badge: *"Simulation runs in memory without modifying live labor registries."*
- **What to Say**:
  > *"Workforce planners need predictive tools. Our forecasting service uses Holt linear exponential smoothing and linear trend models to project demand forward with backtested Mean Absolute Error (MAE) validation. In the What-If Simulator, planners can test policy shock scenarios—such as an R&D subsidy—completely in memory without altering live database records."*
- **Expected Result**: Simulation completes within 500ms, displaying side-by-side projection graphs.
- **Fallback**: Click the pre-configured preset button "Demand Surge Scenario".

---

### STEP 4: Training Supply — Accredited Curriculum
- **Screen**: `http://localhost:3000/training-provider/courses`
- **Persona**: Training Provider (`dev.provider@skillsync.internal`)
- **Action**:
  1. Switch to Training Provider account.
  2. Open the course: **"Advanced Cloud & Microservices Engineering"**.
  3. Show the modular curriculum: Module 1 (FastAPI Architecture), Module 2 (PostgreSQL & Vector Search).
- **What the Judge Sees**:
  - Course curriculum structure with competencies mapped directly to canonical skill taxonomy nodes.
  - Enrolled learners count, lesson progress, and completion criteria (100% curriculum completion requirement).
- **What to Say**:
  > *"Training providers respond directly to this demand. SkillForge Institute offers an accredited course mapped to the canonical skills demanded by TechNova's Skill Contract. Notice every lesson is linked directly to our canonical skill taxonomy."*
- **Expected Result**: Course syllabus and lesson progress cards render without lag.
- **Fallback**: Direct URL: `http://localhost:3000/training-provider/courses`.

---

### STEP 5: Candidate Experience — Skill Gap Analysis
- **Screen**: `http://localhost:3000/candidate/jobs`
- **Persona**: Job Seeker Candidate (`dev.candidate@skillsync.internal`)
- **Action**:
  1. Switch to Candidate account.
  2. Click on the **"Senior Cloud & AI Engineer"** job posting.
  3. Click **"Analyze Skill Gap"**.
- **What the Judge Sees**:
  - The **Skill Gap Analysis Engine**:
    - Current Skill Alignment Score (deterministic score based on matched and partial competencies).
    - Categorized gaps: Critical Gaps, Secondary Gaps, and Matched Skills.
    - Recommended training course with a 1-click **"Enroll to Close Gap"** button.
- **What to Say**:
  > *"From the candidate's perspective, our Skill Gap Engine removes guesswork. It compares the candidate's verified and declared skills against the job contract, computes an exact alignment score, highlights missing competencies, and maps directly to SkillForge's training course."*
- **Expected Result**: Skill gap breakdown renders with visual score gauge and categorized skill cards.
- **Fallback**: Direct URL: `http://localhost:3000/candidate/jobs/1/skill-gap`.

---

### STEP 6: Competency Verification — Verified Skill Passport
- **Screen**: `http://localhost:3000/candidate/passport`
- **Persona**: Candidate
- **Action**:
  1. Navigate to **"Verified Passport"** in the sidebar.
  2. Click **"View Public Shareable Link"** (or open in Incognito window: `http://localhost:3000/passport/share/[token]`).
  3. Highlight the verification badges: `Python (Verified - Course Completion)`.
  4. Point out the **cryptographically secure public share token** (`secrets.token_urlsafe(32)`).
- **What the Judge Sees**:
  - Publicly accessible, read-only Skill Passport page.
  - Verification badges displaying evidence origin (`COURSE_COMPLETION`, `CERTIFICATION`, `ASSESSMENT`).
  - Accessible without login for external recruiter verification.
- **What to Say**:
  > *"When the candidate completes the curriculum, the platform recalculates their passport. Self-declarations remain strictly unverified, while completed courses and verified assessments award Verified status. The candidate can share this public link via a secure token with any recruiter or evaluator without requiring a login."*
- **Expected Result**: Public passport page opens instantly, displaying candidate credentials and green verification badges.
- **Fallback**: Click on the local passport tab if external navigation is restricted.

---

### STEP 7: Semantic Matching & Hiring
- **Screen**: `http://localhost:3000/employer/applications`
- **Persona**: Employer (`dev.employer@skillsync.internal`)
- **Action**:
  1. Switch back to Employer account.
  2. Navigate to **"Applications"**.
  3. Locate the candidate application for **"Senior Cloud & AI Engineer"**.
  4. Point out the **Semantic Match Score** (illustrative demo score: ~94%) with verified passport badge.
  5. Click **"Issue Offer / Hire Candidate"**.
- **What the Judge Sees**:
  - Applicant list ranked by semantic vector match.
  - Verified Skill Passport badge with credential inspection.
  - Action button transitions candidate status from `APPLICATION_SUBMITTED` to `HIRED`.
- **What to Say**:
  > *"Because the candidate's skills are verified, our pgvector semantic matching engine ranks them at the top of TechNova's applicant pool. The employer reviews their verified evidence and extends an offer. The hiring milestone is completed."*
- **Expected Result**: Candidate status updates to `HIRED` with instantaneous UI confirmation.
- **Fallback**: Filter applications by "Pending Review" if list is paginated.

---

### STEP 8: The Closed Loop — Retention & Provider Performance Index (PPI)
- **Screen**: `http://localhost:3000/training-provider/outcomes`
- **Persona**: Training Provider or Government Admin
- **Action**:
  1. Navigate to `/training-provider/outcomes` or `/analytics`.
  2. Show the **"Post-Placement Retention Metrics"**:
     - 30-Day, 60-Day, and 90-Day Retention Milestones.
  3. Show the **Employer Competency Feedback Rating** (e.g., 4.8 / 5.0 Stars in demo data).
  4. Show the **Provider Performance Index (PPI)** Leaderboard:
     - Formula: $\text{PPI} = 0.25\,\text{Completion} + 0.35\,\text{Placement} + 0.20\,\text{Retention}_{90\text{d}} + 0.20\,\text{EmployerRating}$.
- **What the Judge Sees**:
  - Retention tracking analytics across time intervals.
  - Feedback scores highlighting curriculum relevance.
  - Provider Performance Index calculated via the authentic 4-factor formula.
- **What to Say**:
  > *"Here is the critical distinction of SkillSync_AI. Instead of ending at the hire, the platform tracks 30, 60, and 90-day retention and captures structured employer appraisals. These feed into our Provider Performance Index: 25% completion, 35% placement, 20% 90-day retention, and 20% employer rating. High-performing training providers earn higher ratings, creating an accountable, feedback-driven talent ecosystem."*
- **Expected Result**: Outcome KPIs and PPI Leaderboard display verified quantitative scores.
- **Fallback**: Open macro analytics tab at `http://localhost:3000/analytics`.

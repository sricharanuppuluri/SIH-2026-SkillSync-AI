# SkillSync_AI — Live Demo Master Runbook

> **Smart India Hackathon 2026 — Click-by-Click Live Evaluation Script**  
> **Duration**: 3–5 Minutes  
> **Platform Version**: `v1.0.0-RC` (Release Candidate)  
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

### STEP 1: Setting the Stage — The Employer Need
- **Screen**: `http://localhost:3000/employer/jobs`
- **Persona**: Enterprise Employer (`dev.employer@skillsync.internal`)
- **Action**:
  1. Log in as Employer.
  2. Click on the job posting: **"Senior Cloud & AI Engineer"** at TechNova Solutions.
  3. Point out the structured skill requirements: `Python`, `FastAPI`, `PostgreSQL`, `Machine Learning`.
  4. Click the **"View Skill Contract"** button.
- **What the Judge Sees**:
  - Employer Jobs list with status badge `ACTIVE`.
  - Skill Contract panel showing legal SLA: *"Guaranteed Technical Interview for candidates achieving ≥80% verified score"*, with SLA turnaround of 5 business days.
- **What to Say**:
  > *"We begin with the employer, TechNova Solutions. Instead of posting an ambiguous text wishlist on a job board, TechNova defines structured competency standards and activates a legally binding Skill Contract. They guarantee interviews to any candidate who holds verified credentials above an 80% threshold."*
- **Expected Result**: Job and Skill Contract load immediately with clear terms and SLA parameters.
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
  - Live demand density metrics calculated across real active postings.
  - Shortage severity indicator (`CRITICAL` or `ELEVATED`).
  - Candidate supply vs. Employer demand disparity gauge.
- **What to Say**:
  > *"Now let's switch to the Ministry of Labor or State Workforce Planner. TechNova's job creation didn't stay locked in an employer silo. It instantly updated our national Skill Demand Digital Twin. Government planners immediately see real-time skill shortage heatmaps and can observe supply deficits across regions."*
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
  - Projected skill shortage expansion over the next 90 days.
  - Non-destructive badge: *"Simulation runs in memory without modifying live labor registries."*
- **What to Say**:
  > *"Governments don't just need to know what is happening today—they need predictive foresight. Our What-If Simulator uses Holt-Winters time-series algorithms to forecast demand over 30, 60, and 90 days. Here, the planner tests a 25% R&D subsidy. The engine predicts a 42% surge in Python and cloud competencies, allowing state education boards to fund training before the shortage paralyzes industry."*
- **Expected Result**: Simulation completes within 500ms, displaying side-by-side projection graphs.
- **Fallback**: If slider interaction is slow, click the pre-configured preset button "Demand Surge Scenario".

---

### STEP 4: Training Supply — Accredited Curriculum
- **Screen**: `http://localhost:3000/training-provider/courses`
- **Persona**: Training Provider (`dev.provider@skillsync.internal`)
- **Action**:
  1. Switch to Training Provider account.
  2. Open the course: **"Advanced Cloud & Microservices Engineering"**.
  3. Show the modular curriculum: Module 1 (FastAPI Architecture), Module 2 (PostgreSQL & Vector Search).
- **What the Judge Sees**:
  - Course curriculum structure with competencies clearly mapped to canonical skill taxonomy nodes.
  - Enrolled learners count, completion requirements, and assessment criteria (70% pass threshold).
- **What to Say**:
  > *"Next, training institutes respond to this demand. Here, SkillForge Institute offers an accredited course specifically engineered around the competencies demanded by TechNova's Skill Contract. Notice every lesson is tied directly to our canonical skill taxonomy."*
- **Expected Result**: Course syllabus and lesson progress cards render without lag.
- **Fallback**: Direct URL: `http://localhost:3000/training-provider/courses`.

---

### STEP 5: The Candidate Experience — Instant Skill Gap Analysis
- **Screen**: `http://localhost:3000/candidate/jobs`
- **Persona**: Job Seeker Candidate (`dev.candidate@skillsync.internal`)
- **Action**:
  1. Switch to Candidate account.
  2. Click on the **"Senior Cloud & AI Engineer"** job posting.
  3. Click **"Analyze Skill Gap"**.
- **What the Judge Sees**:
  - The **Skill Gap Analysis Engine**:
    - Current Match Score (e.g., 68%).
    - Missing Competencies classified into **Critical Gaps** (`pgvector`, `Microservices Architecture`) and **Secondary Gaps**.
    - Recommended training course with a 1-click **"Enroll to Close Gap"** button.
- **What to Say**:
  > *"Now let's view this from the student or job seeker's perspective. The candidate views TechNova's opening and clicks 'Analyze Skill Gap'. Instead of guessing why their resume was rejected, our engine pinpoints their exact deficiencies. It highlights their missing competencies and offers a direct link to SkillForge's accredited training course."*
- **Expected Result**: Skill gap breakdown renders with visual score gauge and categorized skill cards.
- **Fallback**: Direct URL: `http://localhost:3000/candidate/jobs/1/skill-gap`.

---

### STEP 6: Competency Verification — The Cryptographic Skill Passport
- **Screen**: `http://localhost:3000/candidate/passport`
- **Persona**: Candidate
- **Action**:
  1. Navigate to **"Verified Passport"** in the sidebar.
  2. Click **"View Public Shareable Link"** (or open in Incognito window: `http://localhost:3000/passport/share/[token]`).
  3. Highlight the verification badges: `Python (Level 4 - Verified)`, `FastAPI (Level 3 - Verified)`.
  4. Point out the **SHA-256 cryptographic verification hash** and QR code.
- **What the Judge Sees**:
  - Publicly accessible, tamper-evident Skill Passport page.
  - Cryptographic verification badge, issuance date, assessing provider, and hash chaining signature.
  - Requires zero login for external third-party verification.
- **What to Say**:
  > *"The candidate enrolls, completes the modules, and passes the assessment. What happens next? They don't just receive a decorative PDF certificate. SkillSync_AI issues a Cryptographically Verified Skill Passport. Each skill is anchored using SHA-256 hash chaining. Anyone—including judges or recruiters—can open this public link without logging in and verify genuine competency in seconds."*
- **Expected Result**: Public passport page opens instantly, displaying candidate credentials and green verification badges.
- **Fallback**: Click on the local passport tab if external navigation is restricted.

---

### STEP 7: AI Semantic Matching & Hiring
- **Screen**: `http://localhost:3000/employer/applications`
- **Persona**: Employer (`dev.employer@skillsync.internal`)
- **Action**:
  1. Switch back to Employer account.
  2. Navigate to **"Applications"**.
  3. Locate the candidate application for **"Senior Cloud & AI Engineer"**.
  4. Point out the **94% Semantic Match Score** with verified passport badge.
  5. Click **"Issue Offer / Hire Candidate"**.
- **What the Judge Sees**:
  - Applicant list ranked by semantic vector match.
  - Verified Skill Passport badge with 1-click credential inspection.
  - Action button transitions candidate status from `APPLICATION_SUBMITTED` to `HIRED`.
- **What to Say**:
  > *"Because the candidate's skills are now verified, our pgvector semantic matching engine ranks them at the top of TechNova's applicant pool with a 94% match. TechNova knows this candidate satisfies their Skill Contract benchmarks. The hiring manager reviews the verified badge and extends an offer. The hiring milestone is completed."*
- **Expected Result**: Candidate status updates to `HIRED` with instantaneous UI confirmation.
- **Fallback**: Filter applications by "Pending Review" if list is paginated.

---

### STEP 8: The Closed Loop Complete — Retention, Feedback & Provider PPI
- **Screen**: `http://localhost:3000/training-provider/outcomes`
- **Persona**: Training Provider or Government Admin
- **Action**:
  1. Navigate to `/training-provider/outcomes` or `/analytics`.
  2. Show the **"Post-Placement Retention Metrics"**:
     - 30-Day, 60-Day, and 90-Day Retention Milestones.
  3. Show the **Employer Competency Feedback Rating** (4.8 / 5.0 Stars).
  4. Show the **Provider Performance Index (PPI)** Leaderboard:
     - SkillForge Institute ranked at Top Tier (PPI: 91.2).
- **What the Judge Sees**:
  - Real-world retention tracking analytics.
  - Feedback scores highlighting specific curriculum strengths.
  - Provider Performance Index calculated via formula: $0.40P + 0.35R + 0.25S$.
  - System note: *"PPI scores dynamically update government training subsidy eligibility and course ranking weights."*
- **What to Say**:
  > *"Here is the most critical differentiator of SkillSync_AI. Most platforms end when someone clicks 'Apply'. SkillSync_AI continues tracking the candidate at 30, 60, and 90 days of employment. The employer submits structured competency feedback.
  >
  > These real-world outcomes feed into our Provider Performance Index (PPI). Because SkillForge's graduate was retained for 90 days with high employer praise, SkillForge's PPI increases. Government funding algorithms reward high-performing institutes, and training curricula automatically self-align with market demand.
  >
  > The loop is closed. The skill economy is now self-correcting."*
- **Expected Result**: Outcome KPIs and PPI Leaderboard display verified quantitative scores.
- **Fallback**: Open macro analytics tab at `http://localhost:3000/analytics`.

---

## 3. Demo Persona Switching Cheat Sheet

| To Switch To | Quick Action | URL |
| :--- | :--- | :--- |
| **Employer** | Click Header Profile ➔ Logout ➔ Login as `dev.employer@skillsync.internal` | `/employer/jobs` |
| **Government** | Click Header Profile ➔ Logout ➔ Login as `dev.gov@skillsync.internal` | `/demand` |
| **Candidate** | Click Header Profile ➔ Logout ➔ Login as `dev.candidate@skillsync.internal` | `/candidate/dashboard` |
| **Provider** | Click Header Profile ➔ Logout ➔ Login as `dev.provider@skillsync.internal` | `/training-provider/dashboard` |
| **Public Passport** | Open any new tab (no auth needed) | `/passport/share/demo-share-token-123` |

# SkillSync AI — SIH 2026 Grand Finale Live Demo Script (3–5 Minutes)

> **Evaluator & Judge Demonstration Script**  
> *Objective*: Prove that SkillSync AI is a complete, closed-loop, verifiable skill intelligence ecosystem within a rapid 3–5 minute live presentation.

---

## Pitch Outline & Time Allocation

| Segment | Timing | Persona / Screen | Core Value Demonstrated |
| :--- | :---: | :--- | :--- |
| **1. The Problem** | 0:00 – 0:40 | Introduction / Slide | Disconnected labor market silos, resume inflation, lack of verification |
| **2. Demand & Simulation** | 0:40 – 1:30 | Government (`/demand`, `/simulator`) | Real-time Digital Twin, shortage ratio, 6-mo forecast, stateless simulation |
| **3. Job & Skill Contract** | 1:30 – 2:10 | Employer (`/employer/jobs`, `/contracts`) | Contract Quality Score (>=50), canonical skill specifications |
| **4. Gap, Training & Passport**| 2:10 – 3:10 | Candidate (`/skill-gap`, `/passport`) | Explainable gap diagnosis, curriculum completion, tamper-resistant passport |
| **5. Hiring & Outcomes** | 3:10 – 4:00 | Employer & Provider (`/outcomes`) | Verified match, hiring, 90D retention, Provider Performance Index (PPI) |
| **6. The Feedback Loop** | 4:00 – 4:30 | Macro Analytics (`/analytics`) | Closed loop: retention data informs future government training policy |

---

## Minute-by-Minute Demonstration Script

### [0:00 – 0:40] The Problem Statement
> *"Respected Judges, India's labor market suffers from four disconnected silos: employers cannot verify candidate resumes, training providers teach outdated curricula, job seekers face opaque hiring barriers, and governments allocate workforce subsidies without retention data.*
> 
> *SkillSync AI solves this by creating a unified, deterministic, closed-loop ecosystem where industry demand directly shapes training, training generates cryptographic skill passports, and employment retention benchmarks validate institutional training quality."*

---

### [0:40 – 1:30] Government: Skill Demand Digital Twin & What-If Simulation
- **Action**: Log in as `dev.gov@skillsync.internal` and navigate to `/demand`.
- **Narration**:
  > *"We begin with the Government Labor Intelligence Portal. Here, real-time demand signals from published employer job requisitions aggregate into the Skill Demand Digital Twin.*
  > 
  > *Notice the critical shortage detected in Cloud Infrastructure and FastAPI Backend development. Moving into the Skill 360 view, we observe historical trendlines, geographic demand in Bengaluru and Hyderabad, and a statistical 6-month forecast projecting 28% demand growth.*
  > 
  > *Notice that candidate supply strictly exposes zero PII—only verified vs. declared counts.*
  > 
  > *Next, opening the **What-If Simulator**, policymakers can test hypothetical interventions—such as expanding state training capacity by 100 seats. The simulator projects an immediate 18% reduction in the shortage ratio—completely statelessly, without mutating production records."*

---

### [1:30 – 2:10] Employer: Requisitions & Employer Skill Contracts
- **Action**: Switch to Employer `dev.employer@skillsync.internal` at `/employer/jobs` and `/employer/contracts`.
- **Narration**:
  > *"Now let us look at the employer side. TechNova Digital Solutions has published a requisition for a 'Lead Cloud Infrastructure Engineer'.*
  > 
  > *Instead of a vague prose description, the employer formalizes this demand through a binding **Employer Skill Contract**. Every requirement links to a normalized canonical skill node with explicit proficiency tiers.*
  > 
  > *Notice the **Contract Quality Score of 78/100**—the system algorithmically audits the contract to ensure clear, high-fidelity hiring requirements before activation."*

---

### [2:10 – 3:10] Candidate: Skill Gap, Curriculum, & Verified Skill Passport
- **Action**: Switch to Candidate `dev.candidate@skillsync.internal` at `/candidate/jobs/[id]/skill-gap` and `/candidate/passport`.
- **Narration**:
  > *"Now we view the ecosystem through the job seeker's lens. Our demo candidate evaluates TechNova's job opening.*
  > 
  > *The **Skill Gap Engine** instantly categorizes competencies into MATCHED (Python), PARTIAL, and MISSING (Cloud Infrastructure), with an overall alignment score of 72%.*
  > 
  > *Crucially, the engine does not just highlight gaps—it prescribes training. The candidate enrolls in SkillForge Training Institute's accredited Bootcamp, completes the curriculum modules, and triggers passport recalculation.*
  > 
  > *Now look at the **Verified Skill Passport**: Cloud Infrastructure is no longer a self-declared resume claim. It is cryptographically tagged as **VERIFIED**, backed by verified course completion evidence and shareable via an authenticated public token."*

---

### [3:10 – 4:00] Hiring, Retention & Provider Performance Index (PPI)
- **Action**: Employer advances application to `HIRED` at `/employer/applications`, records outcome at `/employer/outcomes`, then view `/training-provider/outcomes`.
- **Narration**:
  > *"Because the candidate holds verified competencies, the pgvector semantic matching algorithm elevates their ranking. TechNova reviews the verified credentials and transitions the candidate to **HIRED**.*
  > 
  > *Under Phase 17 Outcome Intelligence, a verified employment placement is recorded at ₹12,00,000 starting salary. At the 90-day milestone, the employer logs verified retention with a 5-star satisfaction rating.*
  > 
  > *Now, let us switch to the Training Provider portal: SkillForge Training Institute's **Provider Performance Index (PPI)** score deterministically updates to **89.4 (Tier 1 Excellent)**. Institutions are held accountable not by how many certificates they print, but by how many graduates stay employed."*

---

### [4:00 – 4:30] The Closed Ecosystem Feedback Loop
- **Action**: Navigate to `/analytics` (Macro Analytics).
- **Narration**:
  > *"Finally, macro employment outcomes and wage premiums loop back into the Government Digital Twin, closing the ecosystem loop.*
  > 
  > *SkillSync AI is not a prototype mockup—it is powered by 244 passing backend tests, 131 frontend Vitest tests, local Ollama LLM extraction with zero cloud dependencies, and a single clean Alembic migration head.*
  > 
  > *Thank you. We welcome your questions."*

---

## Fast Reset Instructions for Next Demo
Between judging rounds, reset the environment in 3 seconds:
```bash
python scripts/run_demo.py --reset --check-only
```
This resets all demo transactional entities while keeping canonical skill taxonomies intact.

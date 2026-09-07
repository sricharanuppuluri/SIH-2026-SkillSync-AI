# SkillSync AI — SIH 2026 Grand Finale Presentation Flow

---

## Slide 1: Problem Statement — The Disconnected Labor Market
- **The Core Crisis**: Industry demand and workforce training operate in disconnected silos.
- **Resume Inflation & Noise**: Self-declared candidate resumes lack verifiable authenticity, creating hiring delays and high recruitment friction.
- **Static Curriculum**: Educational and training providers update curricula reactively without real-time labor market signals.
- **Blind Policy Planning**: Governments allocate skills and employment subsidies based on lagging census indicators rather than real-time platform intelligence.

---

## Slide 2: The Solution — SkillSync AI Closed-Loop Ecosystem
SkillSync AI is India's first unified, deterministic Skill Intelligence, Verification, and Outcome Platform. It connects **Employers**, **Candidates**, **Training Providers**, and **Government Administrators** into an interconnected feedback loop where demand directly drives training, verification drives hiring, and employment outcomes validate training quality.

```
Employer Job Demand ──► Digital Twin ──► Training Curricula ──► Verified Passport ──► Verified Hire ──► Outcome & PPI Feedback
```

---

## Slide 3: Key Technical Innovations & Differentiators

1. **Canonical Skill Intelligence**: Over 50+ curated canonical skills with aliases, taxonomy, and graph relationships preventing duplicate or rogue skill terms.
2. **Local AI Skill Extraction**: Zero cloud dependency; local Ollama extraction with deterministic regex fallback for fast, secure processing of raw job descriptions and syllabi.
3. **Semantic Skill Matching**: High-dimensional vector space powered by `pgvector`, computing cosine similarity between candidate profiles and job requirements.
4. **Skill Gap Intelligence Engine**: Analyzes candidate profiles against target job requisitions, producing explainable `MATCHED`, `PARTIAL`, and `MISSING` classifications with actionable training pathways.
5. **Verified Skill Passport**: Distinguishes self-declared claims from cryptographically verified skills backed by course completions, institutional certifications, and tamper-resistant share tokens.
6. **Employer Skill Contracts**: Formalizes job requirements with quality scoring (>=50 threshold) ensuring clear hiring criteria.
7. **Skill Demand Digital Twin**: Aggregates published jobs and candidate supply in real time to compute shortage ratios and identify regional/industry talent deficits.
8. **Demand Forecasting Engine**: Statistical 1-to-12-month horizon projection modeling expected skill demand growth and trajectory.
9. **Stateless What-If Simulator**: Empowers government policy makers to simulate hypothetical supply interventions, training capacity expansions, or demand shocks without mutating production records.
10. **Outcome Intelligence & PPI**: Tracks post-placement milestones (90-day/180-day retention) and calculates the Provider Performance Index (PPI) across deterministic tiers.

---

## Slide 4: Canonical SIH Live Demonstration Scenario
**Storyline**: *"AI & Full-Stack Cloud Shortage → Targeted Training → Verified Hiring → Retention Feedback"*

| Step | Persona / Screen | Action Demonstrated | Value Proven |
| :--- | :--- | :--- | :--- |
| **1** | **Government Dashboard** (`/demand`) | Views real-time Skill Demand Digital Twin. Observes critical shortage in cloud/backend engineering. | Real-time macro visibility |
| **2** | **Skill Detail & Forecast** (`/demand/skills/[id]`) | Examines 3-month forecast showing expected growth. Inspects Zero-PII candidate supply breakdown. | Forward-looking labor planning |
| **3** | **What-If Simulator** (`/simulator`) | Runs simulation modeling +50 verified supply & +100 training seats; observes shortage ratio drop. | Safe policy sandbox |
| **4** | **Employer Dashboard** (`/employer/jobs`) | TechNova Digital Solutions publishes job for "Lead Cloud Infrastructure Engineer". | Real-time demand injection |
| **5** | **Skill Contract** (`/employer/contracts`) | Defines contract with required verified skills, activates it after passing quality check. | Quality-assured hiring terms |
| **6** | **Candidate Dashboard** (`/candidate/dashboard`) | Demo candidate evaluates job via Skill Gap Engine. Detects missing skill. | Instant personalized gap diagnosis |
| **7** | **Learning & Enrollment** (`/candidate/learning`) | Discovers SkillForge Training Institute course matching missing skill, enrolls and finishes curriculum. | Direct gap remediation |
| **8** | **Verified Passport** (`/candidate/passport`) | Recalculates passport; skill converts from declared to VERIFIED with course completion evidence. | Verifiable digital credential |
| **9** | **Matching & Application** (`/employer/applications`) | Candidate matches at higher ranking, submits application; employer reviews verified credentials and marks HIRED. | High-trust, low-friction hiring |
| **10** | **Outcome & Retention** (`/employer/outcomes`) | Verified placement recorded at ₹12 LPA. Employer updates 90-day retention and grants 5-star rating. | Tangible employment outcome |
| **11** | **Provider PPI** (`/training-provider/outcomes`) | SkillForge Training Institute's PPI updates to Tier 1 Excellent based on verified placement and retention. | Institutional accountability |
| **12** | **Macro Analytics** (`/analytics`) | Government dashboard reflects updated placement rate and wage data, closing the ecosystem loop. | Complete closed-loop validation |

---

## Slide 5: Technical Architecture & System Boundaries

```
      Next.js 15 App Router Frontend (Tailored Responsive UI, Vanilla CSS Tokens)
                                     │
                             RESTful APIs / JWT
                                     ▼
                    FastAPI 0.115 Backend Application
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
PostgreSQL 16 Engine         pgvector Extension            Local Ollama LLM
 (Relational Core,           (1536-dim Embeddings,        (Fast Local Skill Extraction
  Alembic Migrations)         Vector Cosine Matching)       & Graceful Offline Fallback)
```

---

## Slide 6: Real-World Impact & Measurable Outcomes
- **Zero PII Leakage**: Aggregated government and digital twin analytics enforce strict anonymization and privacy compliance.
- **Evidence-Backed Transparency**: Eliminates credential fraud by distinguishing self-declared claims from verified competencies.
- **Stateless Non-Destructive Simulation**: Allows testing of state and national skill interventions with zero risk to production data.
- **Outcome-Based Accountability**: Links training funding to verified post-hire employment retention rather than mere attendance.

# SkillSync AI — End-to-End System Architecture

## 1. Ecosystem Overview

SkillSync AI connects the four core labor-market stakeholders into a unified, deterministic, closed-loop skill intelligence ecosystem.

```mermaid
flowchart TD
    subgraph Stakeholders ["Ecosystem Personas"]
        GOV["🏛️ Government / Policy Makers"]
        EMP["🏢 Employers & Enterprises"]
        CAN["🎓 Candidates & Job Seekers"]
        TP["🏫 Training Providers & Universities"]
    end

    subgraph SkillIntelligenceEngine ["Skill Intelligence Layer"]
        RAW["Unstructured Text Input<br>(JDs, Resumes, Syllabi)"]
        OLLAMA["Local AI / Ollama Extractor<br>(Deterministic Fallback)"]
        CANONICAL["Canonical Skill Catalog<br>(50+ Master Skills, Aliases, Graph)"]
        RAW --> OLLAMA
        OLLAMA --> CANONICAL
    end

    subgraph DemandDigitalTwin ["Demand Intelligence & Simulation"]
        JOBS["Published Jobs Requisitions"]
        CONTRACTS["Employer Skill Contracts<br>(Quality Score >= 50)"]
        DEMAND_TWIN["Skill Demand Digital Twin<br>(Demand/Supply Shortage Ratio)"]
        FORECAST["Demand Forecasting Engine<br>(1–12 Month Horizon Projections)"]
        SIMULATOR["What-If Scenario Simulator<br>(Stateless Non-Mutating Engine)"]

        EMP --> JOBS
        EMP --> CONTRACTS
        JOBS --> DEMAND_TWIN
        CONTRACTS --> DEMAND_TWIN
        DEMAND_TWIN --> FORECAST
        DEMAND_TWIN --> SIMULATOR
        FORECAST --> SIMULATOR
        GOV -. Monitors & Simulates .-> DEMAND_TWIN
        GOV -. Scenario Planning .-> SIMULATOR
    end

    subgraph SupplyAndLearning ["Training Supply & Verification Engine"]
        COURSES["Published Training Courses<br>(Curricula, Modules, Lessons)"]
        ENROLL["Candidate Enrollment & Lesson Progress"]
        EVIDENCE["Completion Evidence Engine<br>(Deterministic Idempotent Verification)"]
        PASSPORT["Verified Skill Passport<br>(Tamper-Resistant Digital Credentials)"]

        TP --> COURSES
        CAN --> ENROLL
        COURSES --> ENROLL
        ENROLL --> EVIDENCE
        EVIDENCE --> PASSPORT
    end

    subgraph MatchingAndHiring ["Skill Gap & Talent Placement"]
        GAP["Skill Gap Intelligence Engine<br>(MATCHED / PARTIAL / MISSING)"]
        MATCH["AI Semantic Job Matching<br>(pgvector Cosine Similarity + Passport Weights)"]
        APP["Application Progression<br>(APPLIED -> SHORTLISTED -> HIRED)"]
        HIRE["Employment Placement"]

        CAN --> GAP
        JOBS --> GAP
        GAP -. Recommends Training .-> COURSES
        PASSPORT --> MATCH
        JOBS --> MATCH
        CAN --> APP
        EMP --> APP
        APP --> HIRE
    end

    subgraph OutcomeAndFeedbackLoop ["Outcome Intelligence & Ecosystem Feedback"]
        OUTCOME["Verified Placement Outcomes<br>(Salaries, Contracts, Attribution)"]
        RETENTION["Retention Milestones<br>(90-Day & 180-Day Benchmarks)"]
        FEEDBACK["Employer Feedback Ratings<br>(Satisfaction & Fulfillment Scores)"]
        PPI["Provider Performance Index (PPI)<br>(Deterministic Quality Tiers 1-4)"]
        MACRO["Macro Labor Market Intelligence<br>(Zero-PII Aggregates & Policy Insights)"]

        HIRE --> OUTCOME
        OUTCOME --> RETENTION
        RETENTION --> FEEDBACK
        FEEDBACK --> PPI
        OUTCOME --> PPI
        PPI --> MACRO
        MACRO -. Closes Ecosystem Feedback Loop .-> DEMAND_TWIN
        GOV -. Policy Interventions .-> DEMAND_TWIN
    end

    classDef gov fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef emp fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef can fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef tp fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;

    class GOV gov;
    class EMP emp;
    class CAN can;
    class TP tp;
```

---

## 2. Technical Stack & Infrastructure Boundaries

```mermaid
flowchart LR
    subgraph Client ["Frontend Client (Next.js 15 App Router)"]
        PAGES["App Pages & Role Shells<br>(Vanilla CSS + Rich Aesthetic Tokens)"]
        STATE["Client Auth & State Providers"]
        API_CLIENT["Type-Safe Fetch API Client"]
        PAGES --> STATE
        STATE --> API_CLIENT
    end

    subgraph Server ["Backend API Gateway (FastAPI 0.115)"]
        ROUTERS["API v1 Routers<br>(Auth, Skills, Jobs, Demand, Passport, Outcomes)"]
        DEPS["Dependency Injection & Role RBAC"]
        SERVICES["Domain Business Services"]
        ROUTERS --> DEPS
        DEPS --> SERVICES
    end

    subgraph DataStore ["Data & Vector Persistence Layer"]
        PG["PostgreSQL 16 Engine"]
        PGV["pgvector Extension<br>(1536-dim Semantic Embeddings)"]
        ALEMBIC["Alembic Migrations<br>(Current Head: 0012_outcome_intelligence)"]
        PG --- PGV
        PG --- ALEMBIC
    end

    subgraph LocalAI ["Local Intelligence (Ollama)"]
        LLM["Llama 3 / Mistral LLM<br>(Fast Local Skill Extraction)"]
        FALLBACK["Regex & Canonical Alias Fallback<br>(Graceful Offline Operation)"]
    end

    API_CLIENT -->|HTTP/REST + JWT| ROUTERS
    SERVICES -->|Async SQLAlchemy ORM| PG
    SERVICES -->|Vector Cosine Queries| PGV
    SERVICES -->|JSON Prompt Pipeline| LLM
    LLM -. Offline Fallback .-> FALLBACK
```

---

## 3. Closed-Loop Architectural Feedback

1. **Demand Signal Ingestion**: Employers publish jobs with required/preferred skills. These immediately feed into the Skill Demand Digital Twin.
2. **Shortage Identification**: The Digital Twin categorizes shortages using the ratio of active job demand to verified candidate supply.
3. **Curriculum Alignment**: Training providers observe demand shortages and publish accredited curricula with matched canonical skills.
4. **Candidate Verification**: Candidates close their identified skill gaps through course completion, generating tamper-proof evidence in their Verified Skill Passport.
5. **Verified Hiring**: Employers match and hire candidates possessing verified skills under binding Skill Contracts.
6. **Performance & Policy Feedback**: 90-day/180-day employment retention and employer ratings update the Provider Performance Index (PPI). Macro employment metrics inform government policy interventions and calibrate ongoing training incentives, closing the loop.

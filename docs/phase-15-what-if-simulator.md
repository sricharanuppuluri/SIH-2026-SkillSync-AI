# Phase 15 — What-If Skill Demand Simulator

## 1. Executive Summary & Purpose

The **What-If Skill Demand Simulator** enables policymakers, employers, training providers, candidates, and administrators to model hypothetical interventions across the skill ecosystem without modifying live platform records.

> **CRITICAL GUARANTEE**: What-If scenarios are strictly hypothetical and stateless. They **DO NOT** modify live job requisitions, candidate profiles, verified credentials, training courses, enrollments, forecasts, or demand history.

---

## 2. Concept & Architecture Flow

```text
Current Platform Data (Phase 13 / Phase 14)
                   ↓
   Baseline Retrieval (Actual or Forecast)
                   ↓
       User What-If Scenario Input
                   ↓
       Deterministic Transformations
                   ↓
              ┌─────────┴─────────┐
              ↓                   ↓
       Projected Demand    Projected Supply & Capacity
              └─────────┬─────────┘
                        ↓
             Projected Shortage Ratio
                        ↓
            Shortage Classification
                        ↓
        Deterministic Explanation Summary
```

### Core Architecture Components

1. **`app/schemas/simulator.py`**: Pydantic models with strict validation enforcing bounds on demand changes (-100% to +500%), non-negative supply/capacity additions, and forecast horizons (1–12 months).
2. **`app/services/what_if_simulator_service.py`**: Pure Python stateless computation engine calculating baseline metrics, projected values, shortage transitions, impact deltas, deterministic explanations, and catalog graph relationship context.
3. **`app/api/v1/endpoints/simulator.py`**: RESTful endpoints (`POST /api/v1/simulator/skill` and `POST /api/v1/simulator/scenario`) requiring authenticated role-based access.
4. **`frontend/src/app/simulator/page.tsx`**: Dynamic Next.js user interface featuring interactive parameter controls, scenario presets, side-by-side comparison tables, impact metric cards, baseline vs. projected visual charts, and multi-skill portfolio batch modeling.

---

## 3. Scenario Inputs & Mathematical Formulas

### A. Supported Controls

| Parameter | Type | Validation Bounds | Description |
| :--- | :--- | :--- | :--- |
| `skill_id` | `UUID` | Valid Canonical Skill | Authoritative skill identifier from Phase 5 taxonomy. |
| `baseline_type` | `Enum` | `ACTUAL` \| `FORECAST` | Selects current live platform data or Phase 14 forecast baseline. |
| `forecast_horizon` | `int` | `1` to `12` | Horizon in months if `baseline_type == FORECAST`. |
| `demand_change_percent` | `float` | `-100.0%` to `+500.0%` | Hypothetical change in hiring demand. |
| `additional_verified_supply` | `int` | `0` to `1,000,000` | Hypothetical additions to verified talent supply. |
| `additional_training_capacity` | `int` | `0` to `1,000,000` | Hypothetical additions to training course seat capacity. |

### B. Mathematical Formulas

#### Projected Demand
$$\text{projected\_demand} = \max\left(0, \operatorname{round}\left(\text{baseline\_demand} \times \left(1 + \frac{\text{demand\_change\_percent}}{100}\right)\right)\right)$$
*Note: A change of $-100\%$ reduces projected demand to $0$. Demand is strictly non-negative.*

#### Projected Verified Supply
$$\text{projected\_verified\_supply} = \max\left(0, \text{baseline\_verified\_supply} + \text{additional\_verified\_supply}\right)$$

#### Projected Training Course Capacity
$$\text{projected\_training\_capacity} = \max\left(0, \text{baseline\_training\_capacity} + \text{additional\_training\_capacity}\right)$$

#### Projected Shortage Ratio & Classification
$$\text{ratio} = \frac{\text{projected\_demand}}{\max(\text{projected\_verified\_supply}, 1)}$$

Classification rules follow Phase 13 thresholds:
- $\text{ratio} \ge 3.0 \lor (\text{projected\_demand} \ge 3 \land \text{projected\_verified\_supply} == 0) \implies \mathbf{HIGH\_SHORTAGE}$
- $1.5 \le \text{ratio} < 3.0 \implies \mathbf{MODERATE\_SHORTAGE}$
- $0.7 \le \text{ratio} < 1.5 \implies \mathbf{BALANCED}$
- $\text{ratio} < 0.7 \implies \mathbf{SURPLUS}$
- $(\text{projected\_demand} == 0 \land \text{projected\_verified\_supply} == 0) \implies \mathbf{BALANCED}$

---

## 4. Key Distinction: Training Capacity vs. Verified Supply

```text
Training Capacity (Learning Seats)  ≠  Verified Skill Supply (Certified Candidates)
```

The simulator explicitly highlights this distinction:
- Adding $+100$ training seats represents learning infrastructure and potential pipeline capacity.
- It **does not** automatically assume that 100 students immediately graduate and pass verification.
- Output explanations transparently state this caveat to prevent misleading causal assumptions.

---

## 5. API Reference & Examples

### Single-Skill Simulation (`POST /api/v1/simulator/skill`)

#### Request (Forecast Baseline)
```json
{
  "skill_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "baseline_type": "FORECAST",
  "forecast_horizon": 6,
  "demand_change_percent": 25.0,
  "additional_verified_supply": 20,
  "additional_training_capacity": 50
}
```

#### Response
```json
{
  "skill_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "skill_name": "Python",
  "category": "Programming",
  "skill_type": "TECHNICAL",
  "baseline": {
    "demand": 40,
    "verified_supply": 10,
    "training_capacity": 60,
    "shortage_ratio": 4.0,
    "shortage_category": "HIGH_SHORTAGE",
    "baseline_type": "FORECAST",
    "forecast_horizon": 6
  },
  "scenario": {
    "skill_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "baseline_type": "FORECAST",
    "forecast_horizon": 6,
    "demand_change_percent": 25.0,
    "additional_verified_supply": 20,
    "additional_training_capacity": 50
  },
  "projected": {
    "demand": 50,
    "verified_supply": 30,
    "training_capacity": 110,
    "shortage_ratio": 1.67,
    "shortage_category": "MODERATE_SHORTAGE"
  },
  "impact": {
    "demand_change": 10,
    "demand_change_percent": 25.0,
    "supply_change": 20,
    "supply_change_percent": 200.0,
    "training_capacity_change": 50,
    "training_capacity_change_percent": 83.3,
    "shortage_ratio_change": -2.33,
    "category_changed": true,
    "previous_category": "HIGH_SHORTAGE",
    "new_category": "MODERATE_SHORTAGE"
  },
  "explanation": "Simulation for Python evaluated against Phase 14 forecast baseline (6M horizon). Demand increases by 25.0%, shifting projected demand from 40 to 50. Adding 20 verified candidates expands verified supply from 10 to 30. Adding 50 training seats increases course capacity from 60 to 110 seats (potential future talent pipeline). The demand-to-supply shortage ratio decreases from 4.00 to 1.67. Shortage classification transitions from HIGH_SHORTAGE to MODERATE_SHORTAGE. Note: Training capacity expansion represents learning infrastructure and does not directly convert 1:1 into immediate verified candidate supply.",
  "related_skills": ["FastAPI", "Django", "PostgreSQL"]
}
```

### Multi-Skill Batch Simulation (`POST /api/v1/simulator/scenario`)

Simulates a portfolio of canonical skills concurrently with summary aggregations (`categories_improved_count`, `categories_worsened_count`, `categories_unchanged_count`).

---

## 6. Security, RBAC & Privacy Guarantee

- **Authentication**: JWT bearer token required.
- **RBAC**: Permitted for all authenticated roles (`CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT`, `ADMIN`).
- **PII Protection**: Absolutely zero candidate names, emails, phones, resumes, or employer-specific private records are exposed. All inputs and outputs operate strictly on aggregate counts and canonical catalog taxonomy identifiers.
- **Strict Non-Mutation**: Unit and integration tests verify zero modifications to database tables before and after execution.

---

## 7. Limitations & Boundaries

1. **Deterministic Scenario Modeling**: The simulator models mathematical consequences of hypothetical user parameters; it does not claim to make empirical causal predictions about real-world economic markets.
2. **No LLM Calculation Dependencies**: All calculations and summaries are generated through deterministic Python arithmetic.
3. **No External Paid Services**: Operates 100% locally and freely without third-party API dependencies.

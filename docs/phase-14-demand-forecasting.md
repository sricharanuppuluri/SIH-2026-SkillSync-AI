# Phase 14 — Skill Demand Forecasting

> **Mandatory Architectural Notice**: Forecasts are statistical estimates and are not guarantees of future job demand. Actual demand calculated from real platform data remains the immutable source of truth.

---

## 1. Executive Summary

**Phase 14 — Skill Demand Forecasting** introduces an open-source, local, deterministic statistical forecasting engine for **SkillSync AI**. Built directly atop the Phase 13 Skill Demand Digital Twin, Phase 14 generates multi-month forward-looking skill demand projections, expected growth trajectories, 95% confidence bands, and forecasted shortage ratios without modifying underlying platform activity or rewriting historical facts.

### Core Architectural Separation:
```text
┌────────────────────────────────────────────────────────┐
│                   ACTUAL DEMAND (Phase 13)             │
│  - Observed platform job postings                      │
│  - Historical monthly frequency (last 6–12 months)     │
│  - Actual verified candidate supply                    │
│  - Current shortage status (HIGH/MODERATE/BALANCED/...) │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ (Read-Only)
┌────────────────────────────────────────────────────────┐
│                  FORECAST DEMAND (Phase 14)            │
│  - Deterministic statistical projections (1–12 months) │
│  - Holt Exponential Smoothing / Linear Trend / Fallback│
│  - 95% confidence bounds [lower_bound, upper_bound]    │
│  - Projected growth % & trend classification           │
│  - Forecasted shortage status                          │
│  - Backtested MAE evaluation score                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Forecasting Philosophy & Technology Stack

The forecasting engine strictly complies with the SkillSync AI design philosophy:

* **100% Free & Open-Source**: Uses `statsmodels` (v0.15.0) and `pandas` (v3.0.5) under Python 3.14.
* **No Paid / External Cloud APIs**: Completely independent of OpenAI, AWS Forecast, Google Vertex AI, or external paid labor feeds.
* **Local & Deterministic**: Model fitting and simulation occur entirely within the backend process on demand.
* **No LLM for Numerical Forecasting**: LLMs are never used to compute predictions, horizons, confidence intervals, or growth percentages.
* **Zero Database Migrations**: Operates directly on PostgreSQL `jobs`, `job_skills`, `skills`, `verified_skills`, and `training_courses` tables.

---

## 3. Forecasting Methodology & Model Selection

### 3.1 Model Hierarchy
For every skill evaluated across a requested forecast horizon $H \in [1, 12]$:

| Historical Observations ($N$) | Data Characteristics | Model Selected | Description |
| :--- | :--- | :--- | :--- |
| **$N \ge 6$** | Non-zero variance across history | `Holt Exponential Smoothing` (`holt`) | Additive trend model via `statsmodels.tsa.api.Holt` with optimized smoothing level ($\alpha$) and smoothing trend ($\beta$). |
| **$3 \le N < 6$** | Or $N \ge 6$ with zero variance | `Linear Trend Regression` (`linear_trend`) | Ordinary Least Squares linear trend over time indices $t = 0, \dots, N-1$. |
| **$N < 3$** | Insufficient history / constant 0 | `Baseline Fallback` (`baseline_fallback`) | Recent moving average / last observed monthly demand baseline. |

### 3.2 Non-Negative Bounding & Confidence Bounds
Demand represents count metrics and must never be negative:
1. **Predicted Value**:
   $$\hat{y}_{t+h} = \max(0, \operatorname{round}(y_{\text{raw}}))$$
2. **Confidence Bounds (95% / $\pm 2\sigma$)**:
   $$\text{lower\_bound} = \max(0, \operatorname{round}(\hat{y}_{t+h} - 1.96 \cdot \hat{\sigma}_h))$$
   $$\text{upper\_bound} = \max(\hat{y}_{t+h}, \operatorname{round}(\hat{y}_{t+h} + 1.96 \cdot \hat{\sigma}_h))$$
   $$\text{Ensuring: } 0 \le \text{lower\_bound} \le \hat{y}_{t+h} \le \text{upper\_bound}$$

### 3.3 Expected Growth & Trend Classification
Growth percentage over horizon $H$:
$$\text{Growth \%} = \frac{\hat{y}_{t+H} - y_t}{\max(y_t, 1)} \times 100$$

Deterministic trend classification:
* $\text{Growth \%} \ge +10\% \implies \mathbf{INCREASING}$
* $\text{Growth \%} \le -10\% \implies \mathbf{DECLINING}$
* $\text{Otherwise} \implies \mathbf{STABLE}$

### 3.4 Forecasted Shortage vs. Current Shortage
Phase 14 introduces **Forecasted Shortage** without overwriting Current Shortage:
$$\text{Forecasted D/S Ratio} = \frac{\hat{y}_{t+H}}{\max(\text{verified\_supply}, 1)}$$

* $\text{Ratio} \ge 3.0 \text{ or } (\hat{y}_{t+H} \ge 3 \text{ and } \text{supply} = 0) \implies \mathbf{HIGH\_SHORTAGE}$
* $1.5 \le \text{Ratio} < 3.0 \implies \mathbf{MODERATE\_SHORTAGE}$
* $0.7 \le \text{Ratio} < 1.5 \implies \mathbf{BALANCED}$
* $\text{Ratio} < 0.7 \implies \mathbf{SURPLUS}$

---

## 4. Backtesting & Accuracy Evaluation

When $N \ge 4$ monthly observations exist, the forecasting service computes a walk-forward Mean Absolute Error (**MAE**):
1. Splits series into train ($N - 2$) and test ($2$) observations.
2. Fits model on train set and predicts 2 steps ahead.
3. Computes:
   $$\text{MAE} = \frac{1}{K} \sum_{k=1}^K |y_k - \hat{y}_k|$$
4. Exposes `evaluation_mae` transparently in the API and UI.

---

## 5. Backend REST API

All forecast endpoints reside under `/api/v1/demand/*` with strict RBAC:

### 5.1 Global Forecast Overview & Leaderboard
`GET /api/v1/demand/forecast`

* **Query Parameters**:
  * `horizon` (int, default 3, valid range 1–12)
  * `industry` (string, optional filter)
  * `location` (string, optional filter)
  * `limit` (int, default 20)
* **Response Schema**:
```json
{
  "horizon_months": 3,
  "total_current_demand": 142,
  "total_forecasted_demand": 178,
  "overall_growth_percentage": 25.4,
  "top_growing_skills": [
    {
      "skill_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "skill_name": "Python",
      "category": "Programming",
      "current_demand": 18,
      "forecasted_demand": 24,
      "growth_percentage": 33.3,
      "growth_trend": "INCREASING",
      "current_shortage_status": "HIGH_SHORTAGE",
      "forecasted_shortage_status": "HIGH_SHORTAGE",
      "model_used": "holt",
      "lower_bound": 20,
      "upper_bound": 28
    }
  ],
  "top_declining_skills": [],
  "high_forecast_shortage_skills": [...],
  "forecast_items": [...]
}
```

### 5.2 Skill 360° Detailed Statistical Forecast
`GET /api/v1/demand/skills/{skill_id}/forecast`

* **Path Parameters**: `skill_id` (UUID)
* **Query Parameters**: `horizon` (int, 1–12, default 3)
* **Response Schema**:
```json
{
  "skill_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "skill_name": "Python",
  "category": "Programming",
  "current_actual_demand": 18,
  "latest_actual_month": "2026-08",
  "forecast_horizon_months": 3,
  "model_used": "holt",
  "historical_observations_count": 6,
  "confidence_level": 0.95,
  "forecasted_demand_end": 24,
  "expected_growth_percentage": 33.3,
  "growth_trend": "INCREASING",
  "growth_interpretation": "Demand is projected to increase significantly over the next 3 months (+33%).",
  "current_verified_supply": 4,
  "current_shortage_status": "HIGH_SHORTAGE",
  "forecasted_demand_supply_ratio": 6.0,
  "forecasted_shortage_status": "HIGH_SHORTAGE",
  "available_training_courses_count": 5,
  "training_insight": "Demand expected to increase with critical shortage — training capacity expansion recommended",
  "evaluation_mae": 1.15,
  "monthly_forecasts": [
    {
      "forecast_month": "2026-09",
      "forecast_month_date": "2026-09-01",
      "predicted_demand": 20,
      "lower_bound": 18,
      "upper_bound": 22,
      "confidence_level": 0.95
    }
  ],
  "combined_series": [
    {
      "month": "2026-07",
      "month_date": "2026-07-01",
      "actual_demand": 14,
      "predicted_demand": null,
      "lower_bound": null,
      "upper_bound": null,
      "data_type": "ACTUAL"
    },
    {
      "month": "2026-09",
      "month_date": "2026-09-01",
      "actual_demand": null,
      "predicted_demand": 20,
      "lower_bound": 18,
      "upper_bound": 22,
      "data_type": "FORECAST"
    }
  ]
}
```

---

## 6. Frontend User Interface

### 6.1 Demand Dashboard (`/demand`)
* **Forecast Horizon Selector**: 1M, 3M, 6M, 12M interactive horizon buttons.
* **Forecast KPI Overview**: Projected Total Demand, Top Growing Skill, Forecasted Shortage Skills.
* **Forecast Leaderboard**: Interactive table comparing Actual Demand vs. Forecast Demand with Growth %, Confidence Interval, Forecasted Shortage status, and Model used.
* **Platform Disclaimer Banner**: Prominently informs users that predictions are statistical estimates.

### 6.2 Skill Detail Page (`/demand/skills/[skillId]`)
* **Dual Shortage Badges**: Displays **Current Shortage** alongside **Forecast Shortage** for clear side-by-side comparison.
* **Actual vs. Forecast Demand Progression Chart**: Visual time series comparing observed monthly bars (purple) against forecasted future bars (pink) with confidence range tooltips.
* **Model Metadata Card**: Transparently exposes Model Used, Historical Months, Confidence Level (95%), and Backtest MAE.
* **Training Supply Insight Card**: Integrates Phase 11 course catalog counts with Phase 12 verified candidate supply and Phase 14 projected demand.

---

## 7. Security, Privacy & Performance

* **Zero PII Exposure**: Endpoints and UI calculate and expose aggregate platform counts only. Candidate names, emails, resumes, and employer PII are strictly excluded.
* **IDOR & RBAC Protection**: Available to all authenticated roles (`CANDIDATE`, `EMPLOYER`, `TRAINING_PROVIDER`, `GOVERNMENT`, `ADMIN`). Unauthenticated requests are rejected.
* **Batch Historical Aggregation**: Historical demand is retrieved in a single batched SQL query (`GROUP BY skill_id, date_trunc('month', created_at)`) avoiding N+1 queries.
* **In-Memory Fitting**: Forecasting computations execute in sub-millisecond memory routines without database persistence overhead.

---

## 8. Verification & Test Summary

* **Backend Test Suite**: 184 passing tests across the entire platform, including 20 dedicated tests in `backend/tests/test_demand_forecasting.py`.
* **Frontend Test Suite**: 113 passing tests across 27 test files in Vitest.
* **Static Analysis**: `ruff check` (0 errors), `ruff format` (118 files formatted), `npm run lint` (0 warnings), `npx tsc --noEmit` (0 errors).
* **Production Build**: Next.js 15 build successful across all 34 routes.
* **Database State**: Alembic head maintained at single revision `0010_verified_skill_passport`.

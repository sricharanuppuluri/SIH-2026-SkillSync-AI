import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: () => "/demand/skills/test-skill-uuid-1234",
  useParams: () => ({ skillId: "test-skill-uuid-1234" }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/demandApi", () => ({
  getSkillDemandDetail: vi.fn().mockResolvedValue({
    skill_id: "test-skill-uuid-1234",
    skill_name: "Machine Learning",
    category: "Data Science",
    skill_type: "TECHNICAL",
    description: "Statistical algorithms and predictive modeling.",
    demand_count: 14,
    demand_share_percentage: 33.3,
    rank: 2,
    supply: {
      verified_candidates: 3,
      unverified_candidates: 7,
      total_candidates: 10,
      by_verification_method: {
        COURSE_COMPLETION: 2,
        CERTIFICATION: 1,
      },
    },
    demand_supply_ratio: 4.67,
    shortage_status: "HIGH_SHORTAGE",
    published_courses_count: 5,
    training_providers_count: 3,
    top_industries: [
      { industry: "Technology", demand_count: 8, demand_share_percentage: 57.1 },
      { industry: "Healthcare", demand_count: 4, demand_share_percentage: 28.6 },
    ],
    top_locations: [
      { city: "Bengaluru", state: "Karnataka", is_remote: false, demand_count: 7, demand_share_percentage: 50.0 },
      { city: "Remote", state: null, is_remote: true, demand_count: 5, demand_share_percentage: 35.7 },
    ],
    historical_trends: [
      { period: "July 2026", period_date: "2026-07-01", demand_count: 8 },
      { period: "August 2026", period_date: "2026-08-01", demand_count: 14 },
    ],
    related_skills: ["Deep Learning", "TensorFlow", "PyTorch"],
  }),
  getSkillDemandForecast: vi.fn().mockResolvedValue({
    skill_id: "test-skill-uuid-1234",
    skill_name: "Machine Learning",
    category: "Data Science",
    skill_type: "TECHNICAL",
    current_actual_demand: 14,
    latest_actual_month: "2026-08",
    forecast_horizon_months: 3,
    model_used: "holt",
    historical_observations_count: 6,
    confidence_level: 0.95,
    forecasted_demand_end: 18,
    expected_growth_percentage: 28.6,
    growth_trend: "INCREASING",
    growth_interpretation: "Demand is projected to increase significantly over the next 3 months (+29%).",
    current_verified_supply: 3,
    current_shortage_status: "HIGH_SHORTAGE",
    forecasted_demand_supply_ratio: 6.0,
    forecasted_shortage_status: "HIGH_SHORTAGE",
    available_training_courses_count: 5,
    training_insight: "Demand expected to increase — training expansion recommended",
    evaluation_mae: 1.25,
    monthly_forecasts: [
      {
        forecast_month: "2026-09",
        forecast_month_date: "2026-09-01",
        predicted_demand: 15,
        lower_bound: 13,
        upper_bound: 17,
        confidence_level: 0.95,
      },
      {
        forecast_month: "2026-10",
        forecast_month_date: "2026-10-01",
        predicted_demand: 17,
        lower_bound: 14,
        upper_bound: 20,
        confidence_level: 0.95,
      },
      {
        forecast_month: "2026-11",
        forecast_month_date: "2026-11-01",
        predicted_demand: 18,
        lower_bound: 15,
        upper_bound: 21,
        confidence_level: 0.95,
      },
    ],
    combined_series: [
      {
        month: "2026-07",
        month_date: "2026-07-01",
        actual_demand: 8,
        predicted_demand: null,
        lower_bound: null,
        upper_bound: null,
        data_type: "ACTUAL",
      },
      {
        month: "2026-08",
        month_date: "2026-08-01",
        actual_demand: 14,
        predicted_demand: null,
        lower_bound: null,
        upper_bound: null,
        data_type: "ACTUAL",
      },
      {
        month: "2026-09",
        month_date: "2026-09-01",
        actual_demand: null,
        predicted_demand: 15,
        lower_bound: 13,
        upper_bound: 17,
        data_type: "FORECAST",
      },
      {
        month: "2026-10",
        month_date: "2026-10-01",
        actual_demand: null,
        predicted_demand: 17,
        lower_bound: 14,
        upper_bound: 20,
        data_type: "FORECAST",
      },
      {
        month: "2026-11",
        month_date: "2026-11-01",
        actual_demand: null,
        predicted_demand: 18,
        lower_bound: 15,
        upper_bound: 21,
        data_type: "FORECAST",
      },
    ],
  }),
}));

// ── Import page using @/ alias ─────────────────────────────────────────────────
import SkillDetailPage from "@/app/demand/skills/[skillId]/page";

describe("Skill Demand Detail Page — Phase 13 & Phase 14", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the skill name as hero heading", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Machine Learning")).toBeDefined();
  });

  it("renders back link to demand overview", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Back to Skill Demand Twin")).toBeDefined();
  });

  it("renders the skill rank badge", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Rank #2")).toBeDefined();
  });

  it("renders Current Shortage and Forecast Shortage separated", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Current Shortage")).toBeDefined();
    expect(screen.getByText("Forecast Shortage")).toBeDefined();
  });

  it("renders Phase 14 Forecast section and horizon switcher", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText(/Skill Demand Forecast/i)).toBeDefined();
    expect(screen.getByText("1M")).toBeDefined();
    expect(screen.getByText("3M")).toBeDefined();
    expect(screen.getByText("6M")).toBeDefined();
    expect(screen.getByText("12M")).toBeDefined();
  });

  it("renders Actual vs Forecast demand numbers and growth trend", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Current Actual Demand")).toBeDefined();
    expect(screen.getByText("Forecast Demand (3M)")).toBeDefined();
    expect(screen.getByText("+29%")).toBeDefined();
    expect(screen.getByText("INCREASING")).toBeDefined();
  });

  it("renders deterministic trend interpretation text", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(
      screen.getByText(/Demand is projected to increase significantly over the next 3 months/i)
    ).toBeDefined();
  });

  it("renders Actual vs. Forecast Demand Progression chart header", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Actual vs. Forecast Demand Progression")).toBeDefined();
    expect(screen.getByText("Actual Demand (Observed)")).toBeDefined();
    expect(screen.getByText("Forecast Demand (Predicted)")).toBeDefined();
  });

  it("renders forecasting model metadata and backtesting MAE", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Holt Exponential Smoothing")).toBeDefined();
    expect(screen.getByText("6 months")).toBeDefined();
    expect(screen.getByText("95% (±2σ)")).toBeDefined();
    expect(screen.getByText("1.25")).toBeDefined();
  });

  it("renders training supply insight section", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Training Supply Insight")).toBeDefined();
    expect(screen.getByText("5 courses")).toBeDefined();
    expect(
      screen.getByText(/Demand expected to increase — training expansion recommended/i)
    ).toBeDefined();
  });

  it("renders candidate supply breakdown section", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Candidate Supply Breakdown")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
    expect(screen.getByText("Unverified (declared)")).toBeDefined();
  });

  it("renders PII-safety note", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Aggregate counts only — no personal data exposed")).toBeDefined();
  });
});

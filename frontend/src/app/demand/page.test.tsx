import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: () => "/demand",
  useParams: () => ({ skillId: "test-skill-uuid-1234" }),
}));

// ── Mock next/link ────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock demandApi — using inline factory ──────────────────────────────────────
vi.mock("@/lib/demandApi", () => ({
  getDemandOverview: vi.fn().mockResolvedValue({
    kpis: {
      total_active_jobs: 42,
      unique_skills_in_demand: 15,
      verified_candidate_supply: 87,
      published_training_courses: 20,
      skills_in_shortage: 5,
    },
    top_demanded_skills: [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        category: "Programming",
        skill_type: "TECHNICAL",
        demand_count: 18,
        demand_share_percentage: 42.8,
        rank: 1,
        verified_supply_count: 5,
        demand_supply_ratio: 3.6,
        shortage_status: "HIGH_SHORTAGE",
        training_courses_count: 3,
      },
    ],
    highest_shortage_skills: [
      {
        skill_id: "skill-2",
        skill_name: "Kubernetes",
        category: "DevOps",
        skill_type: "TOOL",
        demand_count: 9,
        demand_share_percentage: 21.4,
        rank: 2,
        verified_supply_count: 2,
        demand_supply_ratio: 4.5,
        shortage_status: "HIGH_SHORTAGE",
        training_courses_count: 1,
      },
    ],
  }),
  listSkillDemand: vi.fn().mockResolvedValue([
    {
      skill_id: "skill-1",
      skill_name: "Python",
      category: "Programming",
      skill_type: "TECHNICAL",
      demand_count: 18,
      demand_share_percentage: 42.8,
      rank: 1,
      verified_supply_count: 5,
      demand_supply_ratio: 3.6,
      shortage_status: "HIGH_SHORTAGE",
      training_courses_count: 3,
    },
    {
      skill_id: "skill-2",
      skill_name: "Kubernetes",
      category: "DevOps",
      skill_type: "TOOL",
      demand_count: 9,
      demand_share_percentage: 21.4,
      rank: 2,
      verified_supply_count: 2,
      demand_supply_ratio: 4.5,
      shortage_status: "HIGH_SHORTAGE",
      training_courses_count: 1,
    },
  ]),
  getDemandForecastOverview: vi.fn().mockResolvedValue({
    horizon_months: 3,
    total_current_demand: 27,
    total_forecasted_demand: 32,
    overall_growth_percentage: 18.5,
    top_growing_skills: [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        category: "Programming",
        skill_type: "TECHNICAL",
        current_demand: 18,
        forecasted_demand: 22,
        growth_percentage: 22.2,
        growth_trend: "INCREASING",
        current_shortage_status: "HIGH_SHORTAGE",
        forecasted_shortage_status: "HIGH_SHORTAGE",
        model_used: "holt",
        lower_bound: 19,
        upper_bound: 25,
      },
    ],
    top_declining_skills: [],
    high_forecast_shortage_skills: [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        category: "Programming",
        skill_type: "TECHNICAL",
        current_demand: 18,
        forecasted_demand: 22,
        growth_percentage: 22.2,
        growth_trend: "INCREASING",
        current_shortage_status: "HIGH_SHORTAGE",
        forecasted_shortage_status: "HIGH_SHORTAGE",
        model_used: "holt",
        lower_bound: 19,
        upper_bound: 25,
      },
      {
        skill_id: "skill-2",
        skill_name: "Kubernetes",
        category: "DevOps",
        skill_type: "TOOL",
        current_demand: 9,
        forecasted_demand: 10,
        growth_percentage: 11.1,
        growth_trend: "INCREASING",
        current_shortage_status: "HIGH_SHORTAGE",
        forecasted_shortage_status: "HIGH_SHORTAGE",
        model_used: "linear_trend",
        lower_bound: 8,
        upper_bound: 12,
      },
    ],
    forecast_items: [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        category: "Programming",
        skill_type: "TECHNICAL",
        current_demand: 18,
        forecasted_demand: 22,
        growth_percentage: 22.2,
        growth_trend: "INCREASING",
        current_shortage_status: "HIGH_SHORTAGE",
        forecasted_shortage_status: "HIGH_SHORTAGE",
        model_used: "holt",
        lower_bound: 19,
        upper_bound: 25,
      },
      {
        skill_id: "skill-2",
        skill_name: "Kubernetes",
        category: "DevOps",
        skill_type: "TOOL",
        current_demand: 9,
        forecasted_demand: 10,
        growth_percentage: 11.1,
        growth_trend: "INCREASING",
        current_shortage_status: "HIGH_SHORTAGE",
        forecasted_shortage_status: "HIGH_SHORTAGE",
        model_used: "linear_trend",
        lower_bound: 8,
        upper_bound: 12,
      },
    ],
  }),
}));

// ── Import page after mocks ───────────────────────────────────────────────────
import DemandDashboardPage from "./page";

describe("Demand Dashboard Page — Phase 13 & Phase 14", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Digital Twin page heading", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText(/Skill Demand Digital Twin/i)).toBeDefined();
  });

  it("renders KPI card labels after data loads", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("Active Published Jobs")).toBeDefined();
    expect(screen.getByText("Skills In Demand")).toBeDefined();
    expect(screen.getByText("Verified Candidates")).toBeDefined();
    expect(screen.getByText("Training Courses")).toBeDefined();
    expect(screen.getByText("Skills in Shortage")).toBeDefined();
  });

  it("renders KPI numeric values correctly", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("42")).toBeDefined(); // total_active_jobs
    expect(screen.getByText("15")).toBeDefined(); // unique_skills_in_demand
    expect(screen.getByText("87")).toBeDefined(); // verified_candidate_supply
  });

  it("renders Phase 14 Skill Demand Forecast section", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("Skill Demand Forecast")).toBeDefined();
    expect(screen.getByText("Total Projected Demand")).toBeDefined();
    expect(screen.getByText("32")).toBeDefined();
    expect(screen.getByText("Top Growing Skill")).toBeDefined();
  });

  it("renders forecast horizon buttons", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("1M")).toBeDefined();
    expect(screen.getByText("3M")).toBeDefined();
    expect(screen.getByText("6M")).toBeDefined();
    expect(screen.getByText("12M")).toBeDefined();
  });

  it("renders forecast growth badges and models", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("+22%")).toBeDefined();
    expect(screen.getByText("Holt ES")).toBeDefined();
    expect(screen.getByText("Linear Trend")).toBeDefined();
  });

  it("renders top demanded skills section", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText(/Most Demanded Skills/i)).toBeDefined();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
  });

  it("renders critical skill shortages section", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText(/Critical Skill Shortages/i)).toBeDefined();
    expect(screen.getAllByText("Kubernetes").length).toBeGreaterThan(0);
  });

  it("renders skills table column headers", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getAllByText("Demand").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supply").length).toBeGreaterThan(0);
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("renders tab filters", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("All Skills")).toBeDefined();
    expect(screen.getByText("Shortages")).toBeDefined();
    expect(screen.getByText("Top 10")).toBeDefined();
  });

  it("renders platform data disclaimer and forecast disclaimer", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    const disclaimers = screen.getAllByText((content) =>
      content.includes("Actual demand") || content.includes("statistical") || content.includes("platform data")
    );
    expect(disclaimers.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import SimulatorPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/simulator",
  useParams: () => ({}),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock demandApi & simulatorApi
vi.mock("@/lib/demandApi", () => ({
  listSkillDemand: vi.fn().mockResolvedValue([
    {
      skill_id: "skill-python-1",
      skill_name: "Python",
      category: "Programming",
      skill_type: "TECHNICAL",
      demand_count: 10,
      demand_share_percentage: 25.0,
      rank: 1,
      verified_supply_count: 2,
      demand_supply_ratio: 5.0,
      shortage_status: "HIGH_SHORTAGE",
      training_courses_count: 2,
    },
    {
      skill_id: "skill-fastapi-2",
      skill_name: "FastAPI",
      category: "Frameworks",
      skill_type: "TECHNICAL",
      demand_count: 5,
      demand_share_percentage: 12.5,
      rank: 2,
      verified_supply_count: 4,
      demand_supply_ratio: 1.25,
      shortage_status: "BALANCED",
      training_courses_count: 1,
    },
  ]),
}));

vi.mock("@/lib/simulatorApi", () => ({
  simulateSkillScenario: vi.fn().mockResolvedValue({
    skill_id: "skill-python-1",
    skill_name: "Python",
    category: "Programming",
    skill_type: "TECHNICAL",
    baseline: {
      demand: 10,
      verified_supply: 2,
      training_capacity: 50,
      shortage_ratio: 5.0,
      shortage_category: "HIGH_SHORTAGE",
      baseline_type: "ACTUAL",
      forecast_horizon: null,
    },
    scenario: {
      skill_id: "skill-python-1",
      baseline_type: "ACTUAL",
      demand_change_percent: 20,
      additional_verified_supply: 5,
      additional_training_capacity: 20,
    },
    projected: {
      demand: 12,
      verified_supply: 7,
      training_capacity: 70,
      shortage_ratio: 1.71,
      shortage_category: "MODERATE_SHORTAGE",
    },
    impact: {
      demand_change: 2,
      demand_change_percent: 20.0,
      supply_change: 5,
      supply_change_percent: 250.0,
      training_capacity_change: 20,
      training_capacity_change_percent: 40.0,
      shortage_ratio_change: -3.29,
      category_changed: true,
      previous_category: "HIGH_SHORTAGE",
      new_category: "MODERATE_SHORTAGE",
    },
    explanation:
      "Simulation for Python evaluated against actual platform baseline. Demand increases by 20.0%, shifting projected demand from 10 to 12. Adding 5 verified candidates expands verified supply from 2 to 7. The shortage ratio decreases from 5.00 to 1.71. Shortage classification transitions from HIGH_SHORTAGE to MODERATE_SHORTAGE.",
    related_skills: ["FastAPI", "Django", "PostgreSQL"],
  }),
  simulateMultiSkillScenario: vi.fn().mockResolvedValue({
    total_skills: 1,
    categories_improved_count: 1,
    categories_worsened_count: 0,
    categories_unchanged_count: 0,
    results: [
      {
        skill_id: "skill-python-1",
        skill_name: "Python",
        category: "Programming",
        skill_type: "TECHNICAL",
        baseline: {
          demand: 10,
          verified_supply: 2,
          training_capacity: 50,
          shortage_ratio: 5.0,
          shortage_category: "HIGH_SHORTAGE",
          baseline_type: "ACTUAL",
        },
        scenario: {
          skill_id: "skill-python-1",
          baseline_type: "ACTUAL",
          demand_change_percent: 20,
          additional_verified_supply: 5,
          additional_training_capacity: 20,
        },
        projected: {
          demand: 12,
          verified_supply: 7,
          training_capacity: 70,
          shortage_ratio: 1.71,
          shortage_category: "MODERATE_SHORTAGE",
        },
        impact: {
          demand_change: 2,
          demand_change_percent: 20.0,
          supply_change: 5,
          supply_change_percent: 250.0,
          training_capacity_change: 20,
          training_capacity_change_percent: 40.0,
          shortage_ratio_change: -3.29,
          category_changed: true,
          previous_category: "HIGH_SHORTAGE",
          new_category: "MODERATE_SHORTAGE",
        },
        explanation: "Portfolio simulation for Python.",
        related_skills: [],
      },
    ],
  }),
}));

describe("What-If Simulator Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header, non-destructive guarantee, and scenario controls", async () => {
    await act(async () => {
      render(<SimulatorPage />);
    });

    expect(screen.getByText("What-If Skill Demand Simulator")).toBeDefined();
    expect(screen.getByText(/Non-Destructive Simulation Engine:/i)).toBeDefined();
    expect(screen.getByText("Scenario Configuration")).toBeDefined();
    expect(screen.getByText("Run What-If Simulation")).toBeDefined();
  });

  it("renders side-by-side metrics and explanation once simulation completes", async () => {
    await act(async () => {
      render(<SimulatorPage />);
    });

    // Check baseline and projected metrics rendered
    expect(screen.getByText("Simulation Outcome")).toBeDefined();
    expect(screen.getByText(/Deterministic Impact Explanation/i)).toBeDefined();
    expect(screen.getByText(/Simulation for Python evaluated against actual platform baseline/i)).toBeDefined();
    expect(screen.getByText("Visual Comparison (Baseline vs Projected)")).toBeDefined();
    expect(screen.getAllByText("What-If Projected").length).toBeGreaterThanOrEqual(1);
  });

  it("supports toggling between Actual and Forecast baselines", async () => {
    await act(async () => {
      render(<SimulatorPage />);
    });

    const forecastBtn = screen.getByRole("button", { name: /Forecast Baseline/i });
    await act(async () => {
      fireEvent.click(forecastBtn);
    });

    expect(screen.getByText(/Forecast Horizon \(Months\)/i)).toBeDefined();
    expect(screen.getByText("3M")).toBeDefined();
    expect(screen.getByText("6M")).toBeDefined();
  });

  it("supports applying presets like Demand Surge and Talent Surge", async () => {
    await act(async () => {
      render(<SimulatorPage />);
    });

    const surgePreset = screen.getByText("🚀 Demand Surge");
    await act(async () => {
      fireEvent.click(surgePreset);
    });

    expect(screen.getByText("+30%")).toBeDefined();
  });

  it("supports switching to Multi-Skill Batch Mode", async () => {
    await act(async () => {
      render(<SimulatorPage />);
    });

    const batchModeBtn = screen.getByRole("button", { name: /Multi-Skill Batch/i });
    await act(async () => {
      fireEvent.click(batchModeBtn);
    });

    expect(screen.getByText(/Multi-Skill Portfolio Scenario/i)).toBeDefined();
    expect(screen.getByText(/Add Canonical Skill/i)).toBeDefined();
  });
});

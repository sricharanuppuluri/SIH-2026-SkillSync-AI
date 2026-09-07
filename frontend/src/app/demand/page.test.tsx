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

// ── Mock demandApi — using inline factory (no top-level variables referenced) ──
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
}));

// ── Import page after mocks ───────────────────────────────────────────────────
import DemandDashboardPage from "./page";

describe("Demand Dashboard Page — Phase 13", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Digital Twin page heading", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("Skill Demand Digital Twin")).toBeDefined();
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

  it("renders top demanded skills section", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("Most Demanded Skills")).toBeDefined();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
  });

  it("renders critical skill shortages section", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getByText("Critical Skill Shortages")).toBeDefined();
    expect(screen.getAllByText("Kubernetes").length).toBeGreaterThan(0);
  });

  it("renders skills table column headers", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    // "Demand" appears in both column header and stat card labels
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

  it("renders platform data disclaimer note", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    const disclaimers = screen.getAllByText((content) =>
      content.includes("platform jobs") || content.includes("not an external")
    );
    expect(disclaimers.length).toBeGreaterThan(0);
  });

  it("renders skill rows from API response", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kubernetes").length).toBeGreaterThan(0);
  });

  it("renders High Shortage status badges", async () => {
    await act(async () => {
      render(<DemandDashboardPage />);
    });
    const highBadges = screen.getAllByText("High Shortage");
    expect(highBadges.length).toBeGreaterThan(0);
  });
});

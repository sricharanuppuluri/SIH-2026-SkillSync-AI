import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AnalyticsPage from "./page";
import { outcomeAPI } from "@/lib/outcomeApi";
import {
  OutcomeAnalytics,
  ProviderLeaderboardItem,
  SkillPlacementRateInsight,
} from "@/types";

vi.mock("@/lib/outcomeApi", () => ({
  outcomeAPI: {
    getOverviewAnalytics: vi.fn(),
    getProviderLeaderboard: vi.fn(),
    getSkillAnalytics: vi.fn(),
  },
}));

describe("AnalyticsPage Component (Phase 17)", () => {
  const mockOverview: OutcomeAnalytics = {
    total_placements: 230,
    placement_rate: 82.5,
    average_retention_90d: 94.0,
    average_starting_salary: 890000,
    average_employer_satisfaction: 4.8,
    total_tracked_candidates: 280,
    placement_by_employment_type: { FULL_TIME: 200, CONTRACT: 30 },
    retention_distribution: { ACTIVE: 40, RETAINED_90D: 120, RETAINED_180D: 70 },
    district_benchmarks: [
      {
        district: "Bengaluru Urban",
        state: "Karnataka",
        total_placements: 110,
        average_salary: 950000,
        retention_rate_90d: 95.5,
      },
    ],
  };

  const mockLeaderboard: ProviderLeaderboardItem[] = [
    {
      rank: 1,
      provider_id: "tp-101",
      provider_name: "Apex Technical Institute",
      ppi_score: 93.5,
      ppi_tier: "TIER_1_EXCELLENT",
      completion_rate: 96.0,
      placement_rate: 91.0,
      retention_rate_90d: 97.0,
      average_starting_salary: 910000,
      average_employer_rating: 4.9,
      total_graduates: 200,
      total_placed: 182,
    },
  ];

  const mockSkills: SkillPlacementRateInsight[] = [
    {
      skill_id: "s-fastapi",
      skill_name: "FastAPI Development",
      category: "Backend",
      placement_count: 55,
      placement_rate: 90.0,
      average_salary: 980000,
      retention_rate_90d: 96.0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(outcomeAPI.getOverviewAnalytics).mockResolvedValue(mockOverview);
    vi.mocked(outcomeAPI.getProviderLeaderboard).mockResolvedValue(mockLeaderboard);
    vi.mocked(outcomeAPI.getSkillAnalytics).mockResolvedValue(mockSkills);
  });

  it("renders page title and fetches macro outcome intelligence", async () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/Employment Outcome Intelligence/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Macro Ecosystem Outcomes")).toBeDefined();
      expect(screen.getByText("230")).toBeDefined();
      expect(screen.getByText("82.5%")).toBeDefined();
      expect(screen.getByText("Apex Technical Institute")).toBeDefined();
      expect(screen.getByText("FastAPI Development")).toBeDefined();
      expect(screen.getByText("Bengaluru Urban")).toBeDefined();
    });
  });

  it("renders error state when overview API fails", async () => {
    vi.mocked(outcomeAPI.getOverviewAnalytics).mockRejectedValueOnce(
      new Error("Database offline")
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Database offline/i)).toBeDefined();
    });
  });
});

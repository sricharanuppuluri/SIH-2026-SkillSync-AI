import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OutcomeKPIsCard } from "./OutcomeKPIsCard";
import { ProviderPerformanceBadge } from "./ProviderPerformanceBadge";
import { PlacementRecordTable } from "./PlacementRecordTable";
import { ProviderLeaderboardTable } from "./ProviderLeaderboardTable";
import { SkillConversionChart } from "./SkillConversionChart";
import {
  OutcomeAnalytics,
  PlacementOutcomeSummary,
  ProviderLeaderboardItem,
  SkillPlacementRateInsight,
} from "@/types";

describe("Phase 17 Outcome Intelligence UI Components", () => {
  it("renders OutcomeKPIsCard with macro ecosystem outcomes", () => {
    const mockAnalytics: OutcomeAnalytics = {
      total_placements: 142,
      placement_rate: 78.5,
      average_retention_90d: 91.2,
      average_starting_salary: 850000,
      average_employer_satisfaction: 4.8,
      total_tracked_candidates: 210,
      placement_by_employment_type: { FULL_TIME: 120, CONTRACT: 22 },
      retention_distribution: { ACTIVE: 30, RETAINED_90D: 80, RETAINED_180D: 32 },
      district_benchmarks: [
        {
          district: "Bengaluru",
          state: "Karnataka",
          total_placements: 65,
          average_salary: 920000,
          retention_rate_90d: 93.0,
        },
      ],
    };

    render(<OutcomeKPIsCard analytics={mockAnalytics} />);

    expect(screen.getByText("Total Placements")).toBeDefined();
    expect(screen.getByText("142")).toBeDefined();
    expect(screen.getByText("Placement Rate")).toBeDefined();
    expect(screen.getByText("78.5%")).toBeDefined();
    expect(screen.getByText("90-Day Retention")).toBeDefined();
    expect(screen.getByText("91.2%")).toBeDefined();
    expect(screen.getByText("4.8 / 5.0")).toBeDefined();
  });

  it("renders ProviderPerformanceBadge with score and deterministic tier", () => {
    render(
      <ProviderPerformanceBadge
        score={88.5}
        tier="TIER_1_EXCELLENT"
        showDetails={true}
      />
    );

    expect(screen.getByText("88.5")).toBeDefined();
    expect(screen.getByText(/Tier 1: Excellent/i)).toBeDefined();
    expect(screen.getByText(/Benchmark performance exceeding 85 PPI/i)).toBeDefined();
  });

  it("renders PlacementRecordTable with items, status badges, and actions", () => {
    const mockPlacements: PlacementOutcomeSummary[] = [
      {
        id: "p-1",
        application_id: "app-1",
        candidate_id: "cand-1",
        candidate_name: "Aarav Sharma",
        employer_company_name: "Tech Mahindra",
        job_title: "Full Stack Engineer",
        placement_date: "2026-09-01",
        employment_type: "FULL_TIME",
        retention_status: "RETAINED_90D",
        starting_salary_annual: 800000,
        employer_satisfaction_rating: 5,
        has_training_attribution: true,
        created_at: "2026-09-01T00:00:00Z",
      },
    ];

    const onSelect = vi.fn();
    render(
      <PlacementRecordTable
        placements={mockPlacements}
        canEdit={true}
        onSelectPlacement={onSelect}
      />
    );

    expect(screen.getByText("Aarav Sharma")).toBeDefined();
    expect(screen.getByText("Full Stack Engineer")).toBeDefined();
    expect(screen.getByText("Tech Mahindra")).toBeDefined();
    expect(screen.getByText("Retained (90D)")).toBeDefined();
    expect(screen.getByText("Pathway Linked")).toBeDefined();
    expect(screen.getByText("Update")).toBeDefined();
  });

  it("renders ProviderLeaderboardTable with deterministic ranks and stats", () => {
    const mockLeaderboard: ProviderLeaderboardItem[] = [
      {
        rank: 1,
        provider_id: "tp-1",
        provider_name: "National Institute of Skill Development",
        ppi_score: 92.0,
        ppi_tier: "TIER_1_EXCELLENT",
        completion_rate: 94.0,
        placement_rate: 89.0,
        retention_rate_90d: 96.0,
        average_starting_salary: 820000,
        average_employer_rating: 4.9,
        total_graduates: 150,
        total_placed: 134,
      },
    ];

    render(<ProviderLeaderboardTable items={mockLeaderboard} />);

    expect(screen.getByText("#1")).toBeDefined();
    expect(
      screen.getByText("National Institute of Skill Development")
    ).toBeDefined();
    expect(screen.getByText("92.0")).toBeDefined();
    expect(screen.getByText("94.0%")).toBeDefined();
    expect(screen.getByText("89.0%")).toBeDefined();
    expect(screen.getByText("134")).toBeDefined();
  });

  it("renders SkillConversionChart with canonical skill bars and wage metrics", () => {
    const mockSkills: SkillPlacementRateInsight[] = [
      {
        skill_id: "s-py",
        skill_name: "Python Programming",
        category: "Programming",
        placement_count: 45,
        placement_rate: 88.0,
        average_salary: 950000,
        retention_rate_90d: 94.0,
      },
      {
        skill_id: "s-fast",
        skill_name: "FastAPI",
        category: "Web Framework",
        placement_count: 32,
        placement_rate: 85.0,
        average_salary: 920000,
        retention_rate_90d: 92.0,
      },
    ];

    render(<SkillConversionChart insights={mockSkills} />);

    expect(screen.getByText("Python Programming")).toBeDefined();
    expect(screen.getByText("FastAPI")).toBeDefined();
    expect(screen.getByText("45 Placed")).toBeDefined();
    expect(screen.getByText("32 Placed")).toBeDefined();
    expect(screen.getByText("2 Tracked Skills")).toBeDefined();
  });
});

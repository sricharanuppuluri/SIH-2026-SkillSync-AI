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
}));

// ── Import page using @/ alias to avoid bracket-path resolution issues ─────────
import SkillDetailPage from "@/app/demand/skills/[skillId]/page";

describe("Skill Demand Detail Page — Phase 13", () => {
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

  it("renders demand/supply ratio rounded to 1dp", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    // ratio may render as "4.7x" or split nodes "4.7" + "x"
    const ratioEls = screen.getAllByText(/4\.7/);
    expect(ratioEls.length).toBeGreaterThan(0);
  });

  it("renders shortage status label", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getAllByText("High Shortage").length).toBeGreaterThan(0);
  });

  it("renders Active Job Demand stat card", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Active Job Demand")).toBeDefined();
    // 14 appears in both the stat card value and the trend chart label
    expect(screen.getAllByText("14").length).toBeGreaterThan(0);
  });

  it("renders Verified Candidates stat card", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Verified Candidates")).toBeDefined();
    // verified_candidates value (3) may appear multiple times; check at least one exists
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("renders historical trend section heading", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Historical Demand Trend")).toBeDefined();
  });

  it("renders top industries section with names", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Top Industries Demanding This Skill")).toBeDefined();
    expect(screen.getByText("Technology")).toBeDefined();
    expect(screen.getByText("Healthcare")).toBeDefined();
  });

  it("renders top locations section with city name", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Top Locations")).toBeDefined();
    expect(screen.getByText(/Bengaluru/)).toBeDefined();
  });

  it("renders Remote badge for is_remote location", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    // "Remote" appears in both the city div text and the badge span
    expect(screen.getAllByText("Remote").length).toBeGreaterThan(0);
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

  it("renders by_verification_method breakdown", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("By Verification Method")).toBeDefined();
    expect(screen.getByText("COURSE COMPLETION")).toBeDefined();
  });

  it("renders related skills as tags", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Deep Learning")).toBeDefined();
    expect(screen.getByText("TensorFlow")).toBeDefined();
    expect(screen.getByText("PyTorch")).toBeDefined();
  });

  it("renders the skill description", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText("Statistical algorithms and predictive modeling.")).toBeDefined();
  });

  it("renders no-forecasting disclaimer in trends section", async () => {
    await act(async () => {
      render(<SkillDetailPage />);
    });
    expect(screen.getByText(/Historical data only/)).toBeDefined();
  });
});

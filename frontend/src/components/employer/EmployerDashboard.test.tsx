import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EmployerDashboard } from "./EmployerDashboard";
import { employerAPI } from "@/lib/api";
import { EmployerDashboardData } from "@/types/employer";

vi.mock("@/lib/api", () => ({
  employerAPI: {
    getDashboard: vi.fn(),
  },
}));

const mockDashboardData: EmployerDashboardData = {
  metrics: {
    total_jobs: 8,
    published_jobs: 5,
    draft_jobs: 2,
    closed_jobs: 1,
    total_applications: 14,
    applications_by_status: {
      APPLIED: 6,
      SHORTLISTED: 4,
      INTERVIEW: 2,
      OFFERED: 1,
      HIRED: 1,
      REJECTED: 0,
    },
  },
  recent_jobs: [
    {
      id: "job-1",
      title: "Senior AI Engineer",
      status: "PUBLISHED",
      location_city: "San Francisco",
      applications_count: 5,
      skills_count: 4,
      created_at: new Date().toISOString(),
    },
  ],
  recent_applications: [
    {
      id: "app-1",
      candidate_id: "cand-1",
      candidate_name: "Alice Johnson",
      candidate_headline: "Full-Stack Python Engineer",
      job_id: "job-1",
      job_title: "Senior AI Engineer",
      status: "APPLIED",
      applied_at: new Date().toISOString(),
    },
  ],
};

describe("EmployerDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading state initially", () => {
    vi.mocked(employerAPI.getDashboard).mockReturnValue(new Promise(() => {}));
    render(<EmployerDashboard />);

    expect(
      screen.getByText("Loading employer metrics and requisitions...")
    ).toBeDefined();
  });

  it("renders live metrics and recent items accurately", async () => {
    vi.mocked(employerAPI.getDashboard).mockResolvedValueOnce(mockDashboardData);
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Employer Operations Portal")).toBeDefined();
      expect(screen.getByText("Total Jobs")).toBeDefined();
      expect(screen.getByText("8")).toBeDefined();
      expect(screen.getByText("5")).toBeDefined(); // published jobs
      expect(screen.getAllByText("Senior AI Engineer").length).toBeGreaterThan(0);
      expect(screen.getByText("Alice Johnson")).toBeDefined();
    });
  });

  it("renders error state on API failure", async () => {
    vi.mocked(employerAPI.getDashboard).mockRejectedValueOnce(
      new Error("Network connection lost")
    );
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Employer Dashboard Error")).toBeDefined();
      expect(screen.getByText("Network connection lost")).toBeDefined();
    });
  });

  it("renders empty states when no jobs or applications exist", async () => {
    vi.mocked(employerAPI.getDashboard).mockResolvedValueOnce({
      metrics: {
        total_jobs: 0,
        published_jobs: 0,
        draft_jobs: 0,
        closed_jobs: 0,
        total_applications: 0,
        applications_by_status: {},
      },
      recent_jobs: [],
      recent_applications: [],
    });
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(screen.getByText("No job requisitions created")).toBeDefined();
      expect(screen.getByText("No applications yet")).toBeDefined();
    });
  });
});

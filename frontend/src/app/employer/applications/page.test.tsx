import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmployerApplicationsPage from "./page";
import { employerAPI } from "@/lib/api";
import { EmployerApplication } from "@/types/employer";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@/lib/api", () => ({
  employerAPI: {
    getApplications: vi.fn(),
    getJobs: vi.fn(),
    updateApplicationStatus: vi.fn(),
  },
}));

const mockApplications: EmployerApplication[] = [
  {
    id: "app-1",
    candidate_id: "cand-1",
    job_id: "job-1",
    job_title: "Senior Backend Developer",
    status: "APPLIED",
    cover_note: "Excited about this role!",
    applied_at: new Date().toISOString(),
    candidate: {
      id: "cand-1",
      full_name: "Jane Doe",
      email: "jane@example.com",
      headline: "Experienced Python Engineer",
      experience_years: 5,
      education_level: "Bachelor's",
      location_city: "Austin",
      location_state: "TX",
    },
  },
];

describe("EmployerApplicationsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders candidate applications with details and status", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValueOnce([]);
    vi.mocked(employerAPI.getApplications).mockResolvedValueOnce(mockApplications);

    render(<EmployerApplicationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
      expect(screen.getByText("jane@example.com")).toBeDefined();
      expect(screen.getByText("Senior Backend Developer")).toBeDefined();
      expect(screen.getByText("Excited about this role!")).toBeDefined();
      expect(screen.getByText("5 years experience")).toBeDefined();
    });
  });

  it("allows updating application status via quick action", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValue([]);
    vi.mocked(employerAPI.getApplications).mockResolvedValue(mockApplications);
    vi.mocked(employerAPI.updateApplicationStatus).mockResolvedValueOnce({
      ...mockApplications[0],
      status: "SHORTLISTED",
    });

    render(<EmployerApplicationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });

    const shortlistBtn = screen.getByRole("button", { name: /^Shortlist$/ });
    fireEvent.click(shortlistBtn);

    await waitFor(() => {
      expect(employerAPI.updateApplicationStatus).toHaveBeenCalledWith("app-1", "SHORTLISTED");
    });
  });

  it("displays empty state when no applications exist", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValueOnce([]);
    vi.mocked(employerAPI.getApplications).mockResolvedValueOnce([]);

    render(<EmployerApplicationsPage />);

    await waitFor(() => {
      expect(screen.getByText("No candidate applications found")).toBeDefined();
    });
  });
});

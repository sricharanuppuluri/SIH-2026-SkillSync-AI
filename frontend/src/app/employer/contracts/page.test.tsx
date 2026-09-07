import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EmployerContractsPage from "./page";
import { contractAPI, employerAPI } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  contractAPI: {
    listContracts: vi.fn(),
    createContract: vi.fn(),
  },
  employerAPI: {
    getJobs: vi.fn(),
  },
}));

const mockContracts = [
  {
    id: "c-101",
    job_id: "j-101",
    job_title: "Lead Cloud Architect",
    employer_id: "emp-1",
    title: "Cloud Architect Contract v1",
    version: 1,
    status: "ACTIVE" as const,
    total_requirements: 4,
    required_skills_count: 3,
    critical_skills_count: 2,
    created_at: "2026-09-07T00:00:00Z",
    updated_at: "2026-09-07T00:00:00Z",
  },
];

const mockJobs = [
  {
    id: "j-101",
    employer_id: "emp-1",
    title: "Lead Cloud Architect",
    description: "Build robust cloud infrastructure.",
    location_city: "Bengaluru",
    location_state: "Karnataka",
    employment_type: "FULL_TIME",
    experience_level: "SENIOR",
    status: "PUBLISHED" as const,
    is_active: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

describe("EmployerContractsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays employer contracts and stats", async () => {
    vi.mocked(contractAPI.listContracts).mockResolvedValue(mockContracts);
    vi.mocked(employerAPI.getJobs).mockResolvedValue(
      mockJobs as unknown as import("@/types/employer").Job[]
    );

    render(<EmployerContractsPage />);

    expect(screen.getByText(/Loading employer skill contracts/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Employer Skill Contracts")).toBeDefined();
    });

    expect(screen.getByText("Cloud Architect Contract v1")).toBeDefined();
    expect(screen.getByText("Active Contracts")).toBeDefined();
  });
});

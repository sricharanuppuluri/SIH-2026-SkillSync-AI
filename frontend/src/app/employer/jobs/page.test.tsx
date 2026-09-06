import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmployerJobsPage from "./page";
import { employerAPI } from "@/lib/api";
import { Job } from "@/types/employer";

vi.mock("@/lib/api", () => ({
  employerAPI: {
    getJobs: vi.fn(),
    publishJob: vi.fn(),
    closeJob: vi.fn(),
    deleteJob: vi.fn(),
  },
}));

const mockJobs: Job[] = [
  {
    id: "job-1",
    employer_id: "emp-1",
    title: "Backend Engineer",
    description: "Build robust APIs with Python & FastAPI",
    location_city: "Remote",
    location_state: null,
    is_remote: true,
    employment_type: "FULL_TIME",
    experience_level: "MID",
    status: "PUBLISHED",
    salary_min: 100000,
    salary_max: 140000,
    is_active: true,
    skills: [
      {
        id: "js-1",
        skill_id: "sk-1",
        skill_name: "Python",
        category: "BACKEND",
        is_required: true,
        minimum_proficiency: "ADVANCED",
        weight: 1.5,
      },
    ],
    applications_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "job-2",
    employer_id: "emp-1",
    title: "Draft Frontend Role",
    description: "Next.js UI development",
    location_city: "Bengaluru",
    location_state: "KA",
    is_remote: false,
    employment_type: "CONTRACT",
    experience_level: "ENTRY",
    status: "DRAFT",
    salary_min: null,
    salary_max: null,
    is_active: false,
    skills: [],
    applications_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("EmployerJobsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(employerAPI.getJobs).mockReturnValue(new Promise(() => {}));
    render(<EmployerJobsPage />);

    expect(screen.getByText("Fetching your job requisitions...")).toBeDefined();
  });

  it("renders list of jobs with status badges and metadata", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValueOnce(mockJobs);
    render(<EmployerJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("Backend Engineer")).toBeDefined();
      expect(screen.getByText("Draft Frontend Role")).toBeDefined();
      expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
      expect(screen.getByText("3 applicants")).toBeDefined();
    });
  });

  it("filters jobs when clicking status buttons", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValue(mockJobs);
    render(<EmployerJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("Backend Engineer")).toBeDefined();
    });

    const draftFilterBtn = screen.getByRole("button", { name: /^Draft$/ });
    fireEvent.click(draftFilterBtn);

    await waitFor(() => {
      expect(employerAPI.getJobs).toHaveBeenCalledWith({
        status: "DRAFT",
        search: undefined,
      });
    });
  });

  it("allows publishing a draft job", async () => {
    vi.mocked(employerAPI.getJobs).mockResolvedValue(mockJobs);
    vi.mocked(employerAPI.publishJob).mockResolvedValueOnce({
      ...mockJobs[1],
      status: "PUBLISHED",
      is_active: true,
    });

    render(<EmployerJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("Draft Frontend Role")).toBeDefined();
    });

    const publishBtn = screen.getByRole("button", { name: /^Publish$/ });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(employerAPI.publishJob).toHaveBeenCalledWith("job-2");
    });
  });
});

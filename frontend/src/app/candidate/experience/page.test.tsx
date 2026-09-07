import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CandidateExperiencePage from "./page";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateExperience } from "@/types/candidate";

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    listExperience: vi.fn(),
    addExperience: vi.fn(),
    updateExperience: vi.fn(),
    deleteExperience: vi.fn(),
  },
}));

const mockExp: CandidateExperience[] = [
  {
    id: "exp-1",
    candidate_id: "profile-1",
    company: "Microsoft",
    title: "Software Engineer II",
    employment_type: "Full-time",
    location: "Hyderabad",
    start_date: "2022-08",
    end_date: null,
    is_current: true,
    description: "Developing Azure cloud infrastructure tools.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("CandidateExperiencePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders work experience history accurately", async () => {
    vi.mocked(candidateAPI.listExperience).mockResolvedValueOnce(mockExp);
    render(<CandidateExperiencePage />);

    await waitFor(() => {
      expect(screen.getByText("Work & Professional Experience")).toBeDefined();
      expect(screen.getByText("Software Engineer II")).toBeDefined();
      expect(screen.getByText("Microsoft")).toBeDefined();
      expect(screen.getByText("Hyderabad")).toBeDefined();
      expect(screen.getByText("Current Role")).toBeDefined();
      expect(screen.getByText("Developing Azure cloud infrastructure tools.")).toBeDefined();
    });
  });
});

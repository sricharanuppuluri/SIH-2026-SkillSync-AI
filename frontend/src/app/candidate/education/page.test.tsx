import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CandidateEducationPage from "./page";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateEducation } from "@/types/candidate";

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    listEducation: vi.fn(),
    addEducation: vi.fn(),
    updateEducation: vi.fn(),
    deleteEducation: vi.fn(),
  },
}));

const mockEdu: CandidateEducation[] = [
  {
    id: "edu-1",
    candidate_id: "profile-1",
    institution: "IIT Bombay",
    degree: "B.Tech Computer Science",
    field_of_study: "Software Engineering",
    start_year: 2018,
    end_year: 2022,
    is_current: false,
    grade: "9.0 CGPA",
    description: "Core algorithms and distributed computing.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("CandidateEducationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders education list accurately", async () => {
    vi.mocked(candidateAPI.listEducation).mockResolvedValueOnce(mockEdu);
    render(<CandidateEducationPage />);

    await waitFor(() => {
      expect(screen.getByText("Education & Qualifications")).toBeDefined();
      expect(screen.getByText("B.Tech Computer Science")).toBeDefined();
      expect(screen.getByText("IIT Bombay")).toBeDefined();
      expect(screen.getByText("Field: Software Engineering")).toBeDefined();
      expect(screen.getByText("9.0 CGPA")).toBeDefined();
    });
  });
});

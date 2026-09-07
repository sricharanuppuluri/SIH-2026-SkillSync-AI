import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SkillGapPage from "./page";
import { candidateAPI } from "@/lib/candidateApi";
import { SkillGapReport } from "@/types/skillGap";

// Mock candidateApi
vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    getJobSkillGap: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ jobId: "job-uuid-123" }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockSkillGapReport: SkillGapReport = {
  job_id: "job-uuid-123",
  job_title: "Staff Machine Learning Engineer",
  employer_name: "Vertex Labs",
  candidate_id: "candidate-uuid-456",
  skill_alignment_score: 75.0,
  summary: {
    total_required_skills: 4,
    matched_skills: 2,
    partial_skills: 1,
    missing_skills: 1,
  },
  gaps: [
    {
      skill_id: "skill-1",
      skill_name: "Python",
      skill_type: "TECHNICAL",
      category: "Programming",
      status: "MATCHED",
      required_proficiency: "ADVANCED",
      candidate_proficiency: "EXPERT",
      candidate_years_experience: 6.0,
      is_required: true,
      weight: 1.0,
      severity: null,
      proficiency_delta: 0,
      explanation: "Candidate has Python at EXPERT, meeting the required ADVANCED proficiency.",
    },
    {
      skill_id: "skill-2",
      skill_name: "FastAPI",
      skill_type: "TECHNICAL",
      category: "Framework",
      status: "MATCHED",
      required_proficiency: "INTERMEDIATE",
      candidate_proficiency: "INTERMEDIATE",
      candidate_years_experience: 2.5,
      is_required: true,
      weight: 1.0,
      severity: null,
      proficiency_delta: 0,
      explanation: "Candidate has FastAPI at INTERMEDIATE, meeting the required INTERMEDIATE proficiency.",
    },
    {
      skill_id: "skill-3",
      skill_name: "PyTorch",
      skill_type: "TECHNICAL",
      category: "Framework",
      status: "PARTIAL",
      required_proficiency: "ADVANCED",
      candidate_proficiency: "INTERMEDIATE",
      candidate_years_experience: 1.0,
      is_required: true,
      weight: 1.0,
      severity: "MEDIUM",
      proficiency_delta: 1,
      explanation: "Candidate has PyTorch at INTERMEDIATE while the job requires ADVANCED.",
    },
    {
      skill_id: "skill-4",
      skill_name: "Kubernetes",
      skill_type: "TOOL",
      category: "DevOps",
      status: "MISSING",
      required_proficiency: "INTERMEDIATE",
      candidate_proficiency: null,
      candidate_years_experience: null,
      is_required: true,
      weight: 1.0,
      severity: "HIGH",
      proficiency_delta: 2,
      explanation: "Candidate does not currently list Kubernetes as a skill.",
    },
  ],
};

describe("SkillGapPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(candidateAPI.getJobSkillGap).mockReturnValue(new Promise(() => {}));
    render(<SkillGapPage />);
    expect(
      screen.getByText("Analyzing candidate competencies against job requirements...")
    ).toBeDefined();
  });

  it("renders report with score, breakdown, and itemized gaps", async () => {
    vi.mocked(candidateAPI.getJobSkillGap).mockResolvedValueOnce(mockSkillGapReport);
    render(<SkillGapPage />);

    await waitFor(() => {
      expect(screen.getByText("Staff Machine Learning Engineer")).toBeDefined();
    });

    expect(screen.getByText("Vertex Labs")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
    expect(screen.getByText("Moderate Skill Alignment")).toBeDefined();

    // Summary counts
    expect(screen.getByText("Matched Skills")).toBeDefined();
    expect(screen.getByText("Partial Skills")).toBeDefined();
    expect(screen.getByText("Missing Skills")).toBeDefined();

    // Specific Skills
    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("FastAPI")).toBeDefined();
    expect(screen.getByText("PyTorch")).toBeDefined();
    expect(screen.getByText("Kubernetes")).toBeDefined();

    // Severity badges
    expect(screen.getByText("MEDIUM Severity")).toBeDefined();
    expect(screen.getByText("HIGH Severity")).toBeDefined();

    // Explanations
    expect(screen.getByText(/meeting the required ADVANCED proficiency/i)).toBeDefined();
    expect(screen.getByText(/while the job requires ADVANCED/i)).toBeDefined();
    expect(screen.getByText(/does not currently list Kubernetes/i)).toBeDefined();
  });

  it("filters skill items when clicking status tabs", async () => {
    vi.mocked(candidateAPI.getJobSkillGap).mockResolvedValueOnce(mockSkillGapReport);
    render(<SkillGapPage />);

    await waitFor(() => {
      expect(screen.getByText("Staff Machine Learning Engineer")).toBeDefined();
    });

    // Click Matched tab
    const matchedTab = screen.getByRole("button", { name: /Matched \(2\)/i });
    fireEvent.click(matchedTab);

    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("FastAPI")).toBeDefined();
    expect(screen.queryByText("PyTorch")).toBeNull();
    expect(screen.queryByText("Kubernetes")).toBeNull();

    // Click Missing tab
    const missingTab = screen.getByRole("button", { name: /Missing \(1\)/i });
    fireEvent.click(missingTab);

    expect(screen.queryByText("Python")).toBeNull();
    expect(screen.getByText("Kubernetes")).toBeDefined();
  });

  it("renders error state when API fails with 404", async () => {
    vi.mocked(candidateAPI.getJobSkillGap).mockRejectedValueOnce(
      new Error("Job with ID 'job-uuid-123' not found")
    );
    render(<SkillGapPage />);

    await waitFor(() => {
      expect(screen.getByText("Job Requisition Not Found")).toBeDefined();
      expect(screen.getByText("Back to Jobs")).toBeDefined();
    });
  });
});

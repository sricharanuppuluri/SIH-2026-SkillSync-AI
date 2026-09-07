import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CandidateDashboard } from "./CandidateDashboard";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateDashboardData } from "@/types/candidate";

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    getDashboard: vi.fn(),
  },
}));

const mockDashboardData: CandidateDashboardData = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Jane Candidate",
    email: "jane@example.com",
    headline: "AI Software Architect",
    bio: "Passionate engineer specialized in deep learning and FastAPI systems.",
    current_role: "Senior AI Engineer",
    experience_years: 4.5,
    education_level: "Master's Degree",
    location_city: "Bengaluru",
    location_state: "Karnataka",
    resume_filename: "Jane_Resume.pdf",
    resume_file_size: 145000,
    resume_uploaded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  completeness: {
    percentage: 85,
    completed_sections: ["Basic Information", "Professional Summary", "Experience", "Skills", "Resume"],
    missing_sections: ["Education"],
    section_scores: {
      "Basic Information": 20,
      "Professional Summary": 10,
      "Experience": 20,
      "Education": 0,
      "Skills": 25,
      "Resume": 10,
    },
  },
  skills_count: 5,
  skills_by_proficiency: {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 1,
    EXPERT: 1,
  },
  experience_count: 2,
  education_count: 1,
  recent_experiences: [
    {
      id: "exp-1",
      candidate_id: "profile-1",
      company: "Google Cloud",
      title: "Machine Learning Engineer",
      employment_type: "Full-time",
      location: "Bengaluru",
      start_date: "2023-01",
      end_date: null,
      is_current: true,
      description: "Building production LLM agents.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  highest_education: {
    id: "edu-1",
    candidate_id: "profile-1",
    institution: "IIT Madras",
    degree: "M.S. Computer Science",
    field_of_study: "Artificial Intelligence",
    start_year: 2020,
    end_year: 2022,
    is_current: false,
    grade: "9.2 CGPA",
    description: "Thesis on attention mechanisms.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

describe("CandidateDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(candidateAPI.getDashboard).mockReturnValue(new Promise(() => {}));
    render(<CandidateDashboard />);
    expect(screen.getByText("Loading candidate profile and metrics...")).toBeDefined();
  });

  it("renders live candidate profile, completeness meter, and metrics", async () => {
    vi.mocked(candidateAPI.getDashboard).mockResolvedValueOnce(mockDashboardData);
    render(<CandidateDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Jane Candidate/i)).toBeDefined();
    });
    expect(screen.getByText(/AI Software Architect/i)).toBeDefined();
    expect(screen.getByText(/Bengaluru, Karnataka/i)).toBeDefined();
    expect(screen.getByText(/4.5 yrs experience/i)).toBeDefined();
    expect(screen.getAllByText(/85%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Google Cloud/i)).toBeDefined();
    expect(screen.getByText(/Machine Learning Engineer/i)).toBeDefined();
    expect(screen.getByText(/IIT Madras/i)).toBeDefined();
    expect(screen.getAllByText(/M.S. Computer Science/i).length).toBeGreaterThan(0);
  });

  it("renders error state when API fails", async () => {
    vi.mocked(candidateAPI.getDashboard).mockRejectedValueOnce(new Error("Database offline"));
    render(<CandidateDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Database offline")).toBeDefined();
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidateProfilePage from "./page";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateProfile, ProfileCompleteness } from "@/types/candidate";

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    getProfile: vi.fn(),
    getCompleteness: vi.fn(),
    updateProfile: vi.fn(),
    uploadResume: vi.fn(),
    deleteResume: vi.fn(),
  },
}));

const mockProfile: CandidateProfile = {
  id: "profile-1",
  user_id: "user-1",
  full_name: "Jane Candidate",
  email: "jane@example.com",
  headline: "Senior Software Engineer",
  bio: "Experienced developer with Python, TypeScript, and SQL knowledge.",
  current_role: "Tech Lead",
  experience_years: 5.0,
  education_level: "Bachelor's Degree",
  location_city: "Hyderabad",
  location_state: "Telangana",
  resume_filename: "Jane_CV.pdf",
  resume_file_size: 200000,
  resume_uploaded_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCompleteness: ProfileCompleteness = {
  percentage: 90,
  completed_sections: ["Basic Information", "Professional Summary", "Experience", "Education", "Skills"],
  missing_sections: ["Resume"],
  section_scores: {
    "Basic Information": 20,
    "Professional Summary": 10,
    "Experience": 20,
    "Education": 15,
    "Skills": 25,
    "Resume": 0,
  },
};

describe("CandidateProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile details and form fields correctly", async () => {
    vi.mocked(candidateAPI.getProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(candidateAPI.getCompleteness).mockResolvedValueOnce(mockCompleteness);

    render(<CandidateProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Candidate")).toBeDefined();
      expect(screen.getByDisplayValue("Senior Software Engineer")).toBeDefined();
      expect(screen.getByDisplayValue("Tech Lead")).toBeDefined();
      expect(screen.getByDisplayValue("Hyderabad")).toBeDefined();
      expect(screen.getByText("Jane_CV.pdf")).toBeDefined();
    });
  });

  it("submits profile updates successfully", async () => {
    vi.mocked(candidateAPI.getProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(candidateAPI.getCompleteness).mockResolvedValue(mockCompleteness);
    vi.mocked(candidateAPI.updateProfile).mockResolvedValueOnce({
      ...mockProfile,
      full_name: "Jane Super Candidate",
      headline: "Principal Engineer",
    });

    render(<CandidateProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Candidate")).toBeDefined();
    });

    const nameInput = screen.getByDisplayValue("Jane Candidate");
    fireEvent.change(nameInput, { target: { value: "Jane Super Candidate" } });

    const saveBtn = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(candidateAPI.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Jane Super Candidate",
        })
      );
      expect(screen.getByText("Profile saved successfully.")).toBeDefined();
    });
  });
});

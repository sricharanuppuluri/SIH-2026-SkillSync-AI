import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidateSkillsPage from "./page";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateSkill } from "@/types/candidate";

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    listSkills: vi.fn(),
    addSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  skillsAPI: {
    list: vi.fn().mockResolvedValue([
      { id: "skill-1", name: "Python", slug: "python", category: "Programming", skill_type: "TECHNICAL", status: "ACTIVE" },
      { id: "skill-2", name: "PostgreSQL", slug: "postgresql", category: "Database", skill_type: "TECHNICAL", status: "ACTIVE" },
    ]),
  },
}));

const mockSkills: CandidateSkill[] = [
  {
    id: "cs-1",
    candidate_id: "profile-1",
    skill_id: "skill-1",
    skill_name: "Python",
    category: "Programming",
    skill_type: "TECHNICAL",
    proficiency: "ADVANCED",
    years_experience: 4.0,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("CandidateSkillsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skills list and empty states appropriately", async () => {
    vi.mocked(candidateAPI.listSkills).mockResolvedValueOnce(mockSkills);
    render(<CandidateSkillsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Skills & Competencies")).toBeDefined();
      expect(screen.getByText("Python")).toBeDefined();
      expect(screen.getByText("Programming")).toBeDefined();
      expect(screen.getByText("4y exp")).toBeDefined();
    });
  });

  it("deletes a skill when confirmed", async () => {
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    vi.mocked(candidateAPI.listSkills).mockResolvedValueOnce(mockSkills);
    vi.mocked(candidateAPI.deleteSkill).mockResolvedValueOnce();

    render(<CandidateSkillsPage />);

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
    });

    const deleteBtn = screen.getByTitle("Remove skill");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(candidateAPI.deleteSkill).toHaveBeenCalledWith("cs-1");
      expect(screen.getByText("Skill removed.")).toBeDefined();
    });
  });
});

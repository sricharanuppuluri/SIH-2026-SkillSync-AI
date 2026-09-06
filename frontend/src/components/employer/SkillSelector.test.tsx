import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SkillSelector, SelectedSkillItem } from "./SkillSelector";
import { skillsAPI } from "@/lib/api";
import { Skill } from "@/types/employer";

vi.mock("@/lib/api", () => ({
  skillsAPI: {
    list: vi.fn(),
  },
}));

const mockSkills: Skill[] = [
  {
    id: "skill-1",
    name: "Python",
    normalized_name: "python",
    category: "PROGRAMMING",
  },
  {
    id: "skill-2",
    name: "FastAPI",
    normalized_name: "fastapi",
    category: "BACKEND",
  },
  {
    id: "skill-3",
    name: "PostgreSQL",
    normalized_name: "postgresql",
    category: "DATABASE",
  },
];

describe("SkillSelector Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and displays skills in dropdown", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce(mockSkills);
    render(<SkillSelector selectedSkills={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Python (PROGRAMMING)")).toBeDefined();
      expect(screen.getByText("FastAPI (BACKEND)")).toBeDefined();
    });
  });

  it("adds a skill to selection when Add Skill is clicked", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce(mockSkills);
    const onChange = vi.fn();
    render(<SkillSelector selectedSkills={[]} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText("Python (PROGRAMMING)")).toBeDefined();
    });

    const addBtn = screen.getByRole("button", { name: /add skill/i });
    fireEvent.click(addBtn);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        skill_id: "skill-1",
        skill_name: "Python",
        minimum_proficiency: "INTERMEDIATE",
        weight: 1,
        is_required: true,
      }),
    ]);
  });

  it("renders selected skills and allows removing a skill", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce(mockSkills);
    const onChange = vi.fn();
    const selected: SelectedSkillItem[] = [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        category: "PROGRAMMING",
        minimum_proficiency: "ADVANCED",
        weight: 1.5,
        is_required: true,
      },
    ];

    render(<SkillSelector selectedSkills={selected} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
      expect(screen.getByText("[PROGRAMMING]")).toBeDefined();
    });

    const removeBtn = screen.getByTitle("Remove skill");
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("does not allow adding duplicate skills", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce(mockSkills);
    const selected: SelectedSkillItem[] = [
      {
        skill_id: "skill-1",
        skill_name: "Python",
        minimum_proficiency: "INTERMEDIATE",
        weight: 1.0,
        is_required: true,
      },
    ];

    render(<SkillSelector selectedSkills={selected} onChange={vi.fn()} />);

    await waitFor(() => {
      // Python shouldn't be in the dropdown options anymore since it's already selected
      const options = screen.queryAllByRole("option");
      const pythonOption = options.find((o) => o.textContent?.includes("Python"));
      expect(pythonOption).toBeUndefined();
    });
  });
});

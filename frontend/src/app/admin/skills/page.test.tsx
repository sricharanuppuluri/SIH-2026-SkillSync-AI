import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminSkillsPage from "./page";
import { skillsAPI } from "@/lib/api";
import { Skill } from "@/types/skill";

vi.mock("@/lib/api", () => ({
  skillsAPI: {
    list: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

let mockUserRole = "ADMIN";
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: mockUserRole, email: "admin@test.internal" },
    isAuthenticated: true,
  }),
}));

const mockSkills: Skill[] = [
  {
    id: "sk-1",
    name: "Python",
    slug: "python",
    normalized_name: "python",
    category: "Programming",
    subcategory: "Backend",
    description: "General-purpose programming language.",
    skill_type: "TECHNICAL",
    status: "ACTIVE",
    parent_skill_id: null,
    parent_name: null,
    aliases_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sk-2",
    name: "Django",
    slug: "django",
    normalized_name: "django",
    category: "Programming",
    subcategory: "Web Framework",
    description: "High-level Python web framework.",
    skill_type: "TECHNICAL",
    status: "INACTIVE",
    parent_skill_id: "sk-1",
    parent_name: "Python",
    aliases_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("AdminSkillsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "ADMIN";
  });

  it("renders catalog header, metrics, and skill records", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce(mockSkills);

    render(<AdminSkillsPage />);

    expect(screen.getByText("Loading canonical skill catalog...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Skill Intelligence Catalog")).toBeDefined();
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
      expect(screen.getByText("Django")).toBeDefined();
      expect(screen.getByText("Backend")).toBeDefined();
    });

    expect(screen.getByText("Total Skills")).toBeDefined();
  });

  it("triggers search filtering when search input changes", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValue(mockSkills);

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText("Search canonical name, slug, or alias...");
    fireEvent.change(searchInput, { target: { value: "Django" } });

    await waitFor(() => {
      expect(skillsAPI.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Django" })
      );
    });
  });

  it("allows admin to toggle skill status", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValue(mockSkills);
    vi.mocked(skillsAPI.update).mockResolvedValueOnce({
      ...mockSkills[0],
      status: "INACTIVE",
    });

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    });

    const activeBadges = screen.getAllByText("ACTIVE");
    fireEvent.click(activeBadges[0]);

    await waitFor(() => {
      expect(skillsAPI.update).toHaveBeenCalledWith("sk-1", { status: "INACTIVE" });
    });
  });

  it("allows admin to open add skill modal and create skill", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValue(mockSkills);
    const newSkill: Skill = {
      id: "sk-3",
      name: "Rust",
      slug: "rust",
      normalized_name: "rust",
      category: "Programming",
      subcategory: "Systems",
      skill_type: "TECHNICAL",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    vi.mocked(skillsAPI.create).mockResolvedValueOnce(newSkill);

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getByText("Add Canonical Skill")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Add Canonical Skill"));

    expect(screen.getByText("New Canonical Skill")).toBeDefined();

    const nameInput = screen.getByPlaceholderText("e.g. Python");
    fireEvent.change(nameInput, { target: { value: "Rust" } });

    fireEvent.click(screen.getByText("Create Skill"));

    await waitFor(() => {
      expect(skillsAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Rust" })
      );
    });
  });

  it("shows empty state when no skills match", async () => {
    vi.mocked(skillsAPI.list).mockResolvedValueOnce([]);

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getByText("No skills found")).toBeDefined();
    });
  });

  it("shows error state when API call fails", async () => {
    vi.mocked(skillsAPI.list).mockRejectedValueOnce(new Error("Network Error"));

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network Error")).toBeDefined();
    });
  });

  it("hides admin mutation controls when user is not ADMIN", async () => {
    mockUserRole = "CANDIDATE";
    vi.mocked(skillsAPI.list).mockResolvedValue(mockSkills);

    render(<AdminSkillsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("Add Canonical Skill")).toBeNull();
  });
});

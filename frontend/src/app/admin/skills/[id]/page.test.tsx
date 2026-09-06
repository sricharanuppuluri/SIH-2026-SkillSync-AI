import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SkillDetailPage from "./page";
import { skillsAPI } from "@/lib/api";
import { SkillDetail, SkillCatalogItem } from "@/types/skill";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sk-1" }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  skillsAPI: {
    get: vi.fn(),
    catalog: vi.fn(),
    addAlias: vi.fn(),
    deleteAlias: vi.fn(),
    addRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "ADMIN", email: "admin@test.internal" },
    isAuthenticated: true,
  }),
}));

const mockSkillDetail: SkillDetail = {
  id: "sk-1",
  name: "Python",
  slug: "python",
  normalized_name: "python",
  category: "Programming",
  subcategory: "Backend",
  description: "High-level language known for readability.",
  skill_type: "TECHNICAL",
  status: "ACTIVE",
  parent_skill_id: null,
  parent: null,
  children: [
    {
      id: "sk-child",
      name: "Django",
      slug: "django",
      normalized_name: "django",
      category: "Programming",
      subcategory: "Web",
      skill_type: "TECHNICAL",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  aliases: [
    {
      id: "alias-1",
      skill_id: "sk-1",
      alias: "python3",
      normalized_alias: "python3",
      created_at: new Date().toISOString(),
    },
  ],
  outbound_relationships: [
    {
      id: "rel-1",
      source_skill_id: "sk-1",
      target_skill_id: "sk-2",
      relationship_type: "RELATED",
      weight: 1.2,
      created_at: new Date().toISOString(),
      target_skill_name: "Data Analysis",
    },
  ],
  inbound_relationships: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCatalog: SkillCatalogItem[] = [
  {
    id: "sk-2",
    name: "Data Analysis",
    slug: "data-analysis",
    category: "Data",
    skill_type: "TECHNICAL",
  },
];

describe("SkillDetailPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skill title, slug, hierarchy, and outbound edges", async () => {
    vi.mocked(skillsAPI.get).mockResolvedValueOnce(mockSkillDetail);
    vi.mocked(skillsAPI.catalog).mockResolvedValueOnce(mockCatalog);

    render(<SkillDetailPage />);

    expect(screen.getByText("Loading canonical skill details...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
      expect(screen.getByText("/python")).toBeDefined();
      expect(screen.getByText("Django")).toBeDefined();
      expect(screen.getByText("python3")).toBeDefined();
      expect(screen.getByText("Data Analysis")).toBeDefined();
    });
  });

  it("allows adding a new alias", async () => {
    vi.mocked(skillsAPI.get).mockResolvedValue(mockSkillDetail);
    vi.mocked(skillsAPI.catalog).mockResolvedValue(mockCatalog);
    vi.mocked(skillsAPI.addAlias).mockResolvedValueOnce({
      id: "alias-2",
      skill_id: "sk-1",
      alias: "py",
      normalized_alias: "py",
      created_at: new Date().toISOString(),
    });

    render(<SkillDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
    });

    const aliasInput = screen.getByPlaceholderText("Add alias (e.g. py, python3)...");
    fireEvent.change(aliasInput, { target: { value: "py" } });

    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => {
      expect(skillsAPI.addAlias).toHaveBeenCalledWith("sk-1", { alias: "py" });
      expect(screen.getByText("py")).toBeDefined();
    });
  });

  it("allows adding a new relationship edge", async () => {
    vi.mocked(skillsAPI.get).mockResolvedValue(mockSkillDetail);
    vi.mocked(skillsAPI.catalog).mockResolvedValue(mockCatalog);
    vi.mocked(skillsAPI.addRelationship).mockResolvedValueOnce({
      id: "rel-2",
      source_skill_id: "sk-1",
      target_skill_id: "sk-2",
      relationship_type: "PREREQUISITE",
      weight: 1.5,
      created_at: new Date().toISOString(),
      target_skill_name: "Data Analysis",
    });

    render(<SkillDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Link New Graph Edge")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Add Relationship Edge"));

    await waitFor(() => {
      expect(skillsAPI.addRelationship).toHaveBeenCalledWith("sk-1", {
        target_skill_id: "sk-2",
        relationship_type: "RELATED",
        weight: 1.0,
      });
    });
  });

  it("renders error state when skill fetch fails", async () => {
    vi.mocked(skillsAPI.get).mockRejectedValueOnce(new Error("Skill Not Found"));
    vi.mocked(skillsAPI.catalog).mockResolvedValueOnce([]);

    render(<SkillDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Skill Not Found")).toBeDefined();
    });
  });
});

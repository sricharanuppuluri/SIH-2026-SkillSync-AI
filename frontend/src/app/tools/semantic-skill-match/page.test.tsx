import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SemanticSkillMatchPage from "./page";
import { useAuth } from "@/context/AuthContext";
import { semanticSkillAPI } from "@/lib/api";
import { SemanticMatchResponse } from "@/types";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  semanticSkillAPI: {
    match: vi.fn(),
    getStatus: vi.fn(),
  },
}));

const mockSuccessMatchResponse: SemanticMatchResponse = {
  query: "natural language processing",
  normalized_query: "natural language processing",
  model_name: "sentence-transformers/all-MiniLM-L6-v2",
  matches: [
    {
      skill_id: "11111111-1111-1111-1111-111111111111",
      skill_name: "Natural Language Processing",
      skill_type: "TECHNICAL",
      category: "Artificial Intelligence",
      similarity: 1.0,
      match_type: "EXACT",
      matched_via: "Exact canonical match",
      explanation: "Exact match for active canonical skill 'Natural Language Processing'.",
    },
    {
      skill_id: "22222222-2222-2222-2222-222222222222",
      skill_name: "Machine Learning",
      skill_type: "TECHNICAL",
      category: "Artificial Intelligence",
      similarity: 0.88,
      match_type: "STRONG_SEMANTIC",
      matched_via: "Local vector embedding",
      explanation: "Strong semantic match with 88.0% similarity based on contextual representation.",
    },
  ],
};

describe("SemanticSkillMatchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      token: "mock-jwt-token",
      user: null,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
  });

  it("renders page with title, inputs, and controls", () => {
    render(<SemanticSkillMatchPage />);
    expect(screen.getByText("Semantic Skill Matcher")).toBeDefined();
    expect(screen.getByLabelText(/skill query \/ raw text/i)).toBeDefined();
    expect(screen.getByLabelText(/skill type guardrail/i)).toBeDefined();
    expect(screen.getByLabelText(/top-k candidates/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /find semantic matches/i })).toBeDefined();
  });

  it("shows validation error when query text is too short", async () => {
    render(<SemanticSkillMatchPage />);
    const input = screen.getByLabelText(/skill query \/ raw text/i);
    fireEvent.change(input, { target: { value: "a" } });
    const btn = screen.getByRole("button", { name: /find semantic matches/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeDefined();
    });
  });

  it("allows selecting top_k and skill_type filters", () => {
    render(<SemanticSkillMatchPage />);
    const typeSelect = screen.getByLabelText(/skill type guardrail/i) as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "TECHNICAL" } });
    expect(typeSelect.value).toBe("TECHNICAL");

    const topKSelect = screen.getByLabelText(/top-k candidates/i) as HTMLSelectElement;
    fireEvent.change(topKSelect, { target: { value: "10" } });
    expect(topKSelect.value).toBe("10");
  });

  it("displays matches with similarity percentage and badges upon submission", async () => {
    vi.mocked(semanticSkillAPI.match).mockResolvedValue(mockSuccessMatchResponse);

    render(<SemanticSkillMatchPage />);
    const input = screen.getByLabelText(/skill query \/ raw text/i);
    fireEvent.change(input, { target: { value: "natural language processing" } });

    const btn = screen.getByRole("button", { name: /find semantic matches/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Natural Language Processing")).toBeDefined();
      expect(screen.getByText("Machine Learning")).toBeDefined();
    });

    expect(screen.getByText("Exact Match")).toBeDefined();
    expect(screen.getByText("Strong Semantic")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("88%")).toBeDefined();
  });

  it("shows empty state when no matches returned", async () => {
    vi.mocked(semanticSkillAPI.match).mockResolvedValue({
      query: "unrelated query",
      normalized_query: "unrelated query",
      model_name: "sentence-transformers/all-MiniLM-L6-v2",
      matches: [],
    });

    render(<SemanticSkillMatchPage />);
    const input = screen.getByLabelText(/skill query \/ raw text/i);
    fireEvent.change(input, { target: { value: "unrelated query" } });
    fireEvent.click(screen.getByRole("button", { name: /find semantic matches/i }));

    await waitFor(() => {
      expect(screen.getByText(/no matching canonical skills found/i)).toBeDefined();
    });
  });

  it("shows error banner when API throws error", async () => {
    vi.mocked(semanticSkillAPI.match).mockRejectedValue(
      new Error("Embedding service failure")
    );

    render(<SemanticSkillMatchPage />);
    const input = screen.getByLabelText(/skill query \/ raw text/i);
    fireEvent.change(input, { target: { value: "error text" } });
    fireEvent.click(screen.getByRole("button", { name: /find semantic matches/i }));

    await waitFor(() => {
      expect(screen.getByText(/embedding service failure/i)).toBeDefined();
    });
  });
});

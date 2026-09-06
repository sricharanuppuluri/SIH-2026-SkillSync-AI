import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SkillExtractorPage from "./page";
import { useAuth } from "@/context/AuthContext";
import * as extractionApi from "@/lib/extractionApi";
import { SkillExtractionResponse } from "@/types/extraction";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/extractionApi", () => ({
  extractSkills: vi.fn(),
}));

const mockToken = "mock-jwt-token";

const mockSuccessResponse: SkillExtractionResponse = {
  success: true,
  skills: [
    {
      raw_name: "Python",
      normalized_name: "python",
      canonical_skill_id: "abc-123",
      canonical_skill_name: "Python",
      confidence: 0.97,
      evidence: "Python developer",
      resolved: true,
    },
    {
      raw_name: "QuantumWidget",
      normalized_name: "quantumwidget",
      canonical_skill_id: null,
      canonical_skill_name: null,
      confidence: 0.55,
      evidence: "uses quantum widget",
      resolved: false,
    },
  ],
  model: "mistral:latest",
  source_type: "JOB",
  processing_time_ms: 1234,
  resolved_count: 1,
  unresolved_count: 1,
  warnings: ["'QuantumWidget' was not found in the canonical skill catalog."],
};

const mockOllamaDownResponse: SkillExtractionResponse = {
  success: false,
  skills: [],
  model: "mistral:latest",
  source_type: "JOB",
  processing_time_ms: 10,
  resolved_count: 0,
  unresolved_count: 0,
  warnings: ["Local AI service is unavailable."],
};

describe("SkillExtractorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      token: mockToken,
      user: null,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
  });

  it("renders the form with required elements", () => {
    render(<SkillExtractorPage />);
    expect(screen.getByText("Skill Extractor")).toBeDefined();
    expect(screen.getByLabelText(/source type/i)).toBeDefined();
    expect(screen.getByLabelText(/source text/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /extract skills/i })).toBeDefined();
  });

  it("shows validation error when text is too short", async () => {
    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, { target: { value: "short" } });
    const btn = screen.getByRole("button", { name: /extract skills/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeDefined();
    });
  });

  it("allows selecting different source types", () => {
    render(<SkillExtractorPage />);
    const select = screen.getByLabelText(/source type/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "RESUME" } });
    expect(select.value).toBe("RESUME");
    fireEvent.change(select, { target: { value: "COURSE" } });
    expect(select.value).toBe("COURSE");
  });

  it("shows loading state during extraction", async () => {
    let resolveExtraction!: (v: SkillExtractionResponse) => void;
    vi.mocked(extractionApi.extractSkills).mockReturnValue(
      new Promise((res) => { resolveExtraction = res; })
    );

    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, {
      target: { value: "Python developer with FastAPI experience for backend systems." },
    });

    const btn = screen.getByRole("button", { name: /extract skills/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/extracting/i)).toBeDefined();
    });

    resolveExtraction(mockSuccessResponse);
  });

  it("displays resolved and unresolved skills after successful extraction", async () => {
    vi.mocked(extractionApi.extractSkills).mockResolvedValue(mockSuccessResponse);

    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, {
      target: { value: "Python developer with QuantumWidget and FastAPI experience." },
    });
    fireEvent.click(screen.getByRole("button", { name: /extract skills/i }));

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
    });

    expect(screen.getAllByText(/canonical/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/unresolved/i).length).toBeGreaterThan(0);

  });

  it("shows Ollama unavailable banner when success=false", async () => {
    vi.mocked(extractionApi.extractSkills).mockResolvedValue(mockOllamaDownResponse);

    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, {
      target: { value: "Python developer with FastAPI experience for backend systems." },
    });
    fireEvent.click(screen.getByRole("button", { name: /extract skills/i }));

    await waitFor(() => {
      expect(screen.getByText(/local ai unavailable/i)).toBeDefined();
    });
  });

  it("shows API error when extractSkills throws", async () => {
    vi.mocked(extractionApi.extractSkills).mockRejectedValue(
      new Error("Network error occurred")
    );

    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, {
      target: { value: "Python developer with FastAPI experience for backend systems." },
    });
    fireEvent.click(screen.getByRole("button", { name: /extract skills/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error occurred/i)).toBeDefined();
    });
  });

  it("shows empty state when no skills extracted", async () => {
    const emptyResponse: SkillExtractionResponse = {
      ...mockSuccessResponse,
      skills: [],
      resolved_count: 0,
      unresolved_count: 0,
      warnings: [],
    };
    vi.mocked(extractionApi.extractSkills).mockResolvedValue(emptyResponse);

    render(<SkillExtractorPage />);
    const textarea = screen.getByLabelText(/source text/i);
    fireEvent.change(textarea, {
      target: { value: "This text does not mention any skills whatsoever." },
    });
    fireEvent.click(screen.getByRole("button", { name: /extract skills/i }));

    await waitFor(() => {
      expect(screen.getByText(/no skills extracted/i)).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidatePassportPage from "./page";
import { passportAPI } from "@/lib/passportApi";
import { CandidatePassportResponse } from "@/types";

vi.mock("@/lib/passportApi", () => ({
  passportAPI: {
    getPassport: vi.fn(),
    recalculatePassport: vi.fn(),
    getEvidenceList: vi.fn(),
    createEvidence: vi.fn(),
    deleteEvidence: vi.fn(),
    getShareConfig: vi.fn(),
    toggleShare: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  skillsAPI: {
    catalog: vi.fn(),
  },
}));

const mockPassportData: CandidatePassportResponse = {
  candidate: {
    candidate_id: "cand-123",
    user_id: "user-123",
    full_name: "Alex Mercer",
    headline: "Full Stack Engineer",
    current_role: "Software Developer",
    location_city: "Bengaluru",
    location_state: "Karnataka",
  },
  stats: {
    total_skills: 2,
    verified_skills: 1,
    unverified_skills: 1,
    expired_skills: 0,
    total_evidence_items: 2,
    verification_coverage_pct: 50.0,
  },
  skills: [
    {
      skill_id: "sk-python",
      skill_name: "Python",
      skill_slug: "python",
      category: "Backend",
      skill_type: "TECHNICAL",
      status: "VERIFIED",
      verification_method: "COURSE_COMPLETION",
      verification_score: null,
      verified_at: "2026-01-15T10:00:00Z",
      expires_at: null,
      verification_summary: "Verified through completed course: Python Backend Development",
      evidence_count: 1,
      strongest_evidence_type: "COURSE_COMPLETION",
      evidence_items: [
        {
          id: "ev-1",
          candidate_id: "cand-123",
          skill_id: "sk-python",
          skill_name: "Python",
          evidence_type: "COURSE_COMPLETION",
          source_id: "course-123",
          title: "Completed Course: Python Backend Development",
          description: "Completed 100% curriculum of training course.",
          evidence_url: null,
          issued_at: null,
          completed_at: "2026-01-15T10:00:00Z",
          meta: null,
          status: "VALID",
          created_at: "2026-01-15T10:00:00Z",
          updated_at: "2026-01-15T10:00:00Z",
        },
      ],
    },
    {
      skill_id: "sk-docker",
      skill_name: "Docker",
      skill_slug: "docker",
      category: "DevOps",
      skill_type: "TOOL",
      status: "UNVERIFIED",
      verification_method: "CANDIDATE_DECLARATION",
      verification_score: null,
      verified_at: null,
      expires_at: null,
      verification_summary: "Self-declared by candidate. Formal verification pending.",
      evidence_count: 1,
      strongest_evidence_type: "CANDIDATE_DECLARATION",
      evidence_items: [],
    },
  ],
  last_recalculated_at: "2026-09-06T12:00:00Z",
  share_token: "mock-share-token-xyz",
  is_share_enabled: false,
};

describe("Candidate Verified Skill Passport Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders passport header, metrics, and verified vs unverified skill cards", async () => {
    vi.mocked(passportAPI.getPassport).mockResolvedValue(mockPassportData);

    render(<CandidatePassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Verified Skill Passport")).toBeDefined();
    });

    // Check candidate details
    expect(screen.getByText("Alex Mercer")).toBeDefined();
    expect(screen.getByText(/Full Stack Engineer/i)).toBeDefined();

    // Check Metrics Cards
    expect(screen.getByText("50%")).toBeDefined();

    // Check Verified skill (Python)
    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("VERIFIED")).toBeDefined();
    expect(screen.getByText(/Verified through completed course: Python Backend Development/i)).toBeDefined();

    // Check Unverified skill (Docker)
    expect(screen.getByText("Docker")).toBeDefined();
    expect(screen.getByText("UNVERIFIED")).toBeDefined();
    expect(screen.getByText(/Self-declared by candidate/i)).toBeDefined();
  });

  it("handles recalculate button click", async () => {
    vi.mocked(passportAPI.getPassport).mockResolvedValue(mockPassportData);
    vi.mocked(passportAPI.recalculatePassport).mockResolvedValue(mockPassportData);

    render(<CandidatePassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Recalculate Verification")).toBeDefined();
    });

    const recalcBtn = screen.getByRole("button", { name: /Recalculate Verification/i });
    fireEvent.click(recalcBtn);

    await waitFor(() => {
      expect(passportAPI.recalculatePassport).toHaveBeenCalled();
    });
  });

  it("handles toggling public sharing", async () => {
    vi.mocked(passportAPI.getPassport).mockResolvedValue(mockPassportData);
    vi.mocked(passportAPI.toggleShare).mockResolvedValue({
      share_token: "mock-share-token-xyz",
      is_enabled: true,
      share_url: "/passport/share/mock-share-token-xyz",
    });

    render(<CandidatePassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Enable Public Link")).toBeDefined();
    });

    const shareBtn = screen.getByText("Enable Public Link");
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(passportAPI.toggleShare).toHaveBeenCalledWith(true);
    });
  });

  it("filters skills by status tab", async () => {
    vi.mocked(passportAPI.getPassport).mockResolvedValue(mockPassportData);

    render(<CandidatePassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
      expect(screen.getByText("Docker")).toBeDefined();
    });

    // Click Verified filter
    const verifiedTab = screen.getByRole("button", { name: /^Verified \(1\)/ });
    fireEvent.click(verifiedTab);

    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.queryByText("Docker")).toBeNull();
  });
});

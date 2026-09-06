import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PublicPassportSharePage from "./page";
import { passportAPI } from "@/lib/passportApi";
import { PublicPassportResponse } from "@/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "valid-share-token-123" }),
}));

vi.mock("@/lib/passportApi", () => ({
  passportAPI: {
    getPublicPassport: vi.fn(),
  },
}));

const mockPublicPassport: PublicPassportResponse = {
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
    total_evidence_items: 1,
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
      evidence_items: [],
    },
  ],
  shared_at: "2026-09-06T12:00:00Z",
};

describe("Public Passport Share Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders candidate public profile and verified competency badges", async () => {
    vi.mocked(passportAPI.getPublicPassport).mockResolvedValue(mockPublicPassport);

    render(<PublicPassportSharePage />);

    await waitFor(() => {
      expect(screen.getByText("VERIFIED SKILL PASSPORT")).toBeDefined();
    });

    expect(screen.getByText("Alex Mercer")).toBeDefined();
    expect(screen.getByText("Software Developer")).toBeDefined();
    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText(/Verified through completed course: Python Backend Development/i)).toBeDefined();
    expect(screen.getByText("SkillSync AI Deterministic Engine")).toBeDefined();
  });

  it("handles revoked or nonexistent token gracefully", async () => {
    vi.mocked(passportAPI.getPublicPassport).mockRejectedValue(
      new Error("Shared skill passport not found or sharing has been revoked.")
    );

    render(<PublicPassportSharePage />);

    await waitFor(() => {
      expect(screen.getByText("Shared Passport Unavailable")).toBeDefined();
      expect(
        screen.getByText("Shared skill passport not found or sharing has been revoked.")
      ).toBeDefined();
    });
  });
});

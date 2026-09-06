import {
  CandidatePassportResponse,
  PassportShareResponse,
  PublicPassportResponse,
  SkillEvidenceCreate,
  SkillEvidenceRead,
} from "@/types";
import { fetchAPI } from "./api";

/**
 * Verified Skill Passport and Evidence API client methods.
 */
export const passportAPI = {
  /**
   * Retrieve the authenticated candidate's Verified Skill Passport.
   */
  async getPassport(): Promise<CandidatePassportResponse> {
    return fetchAPI<CandidatePassportResponse>("/api/v1/candidate/passport");
  },

  /**
   * Explicitly recalculate candidate verification state across all evidence.
   */
  async recalculatePassport(): Promise<CandidatePassportResponse> {
    return fetchAPI<CandidatePassportResponse>(
      "/api/v1/candidate/passport/recalculate",
      {
        method: "POST",
      }
    );
  },

  /**
   * Retrieve all evidence items owned by the candidate.
   */
  async getEvidenceList(): Promise<SkillEvidenceRead[]> {
    return fetchAPI<SkillEvidenceRead[]>("/api/v1/candidate/passport/evidence");
  },

  /**
   * Submit new verifiable skill evidence (e.g., external certification).
   */
  async createEvidence(
    payload: SkillEvidenceCreate
  ): Promise<SkillEvidenceRead> {
    return fetchAPI<SkillEvidenceRead>("/api/v1/candidate/passport/evidence", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete an evidence item owned by candidate and recalculate passport.
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    return fetchAPI<void>(`/api/v1/candidate/passport/evidence/${evidenceId}`, {
      method: "DELETE",
    });
  },

  /**
   * Retrieve public share configuration and token.
   */
  async getShareConfig(): Promise<PassportShareResponse> {
    return fetchAPI<PassportShareResponse>("/api/v1/candidate/passport/share");
  },

  /**
   * Toggle public sharing on or off.
   */
  async toggleShare(isEnabled: boolean): Promise<PassportShareResponse> {
    return fetchAPI<PassportShareResponse>(
      "/api/v1/candidate/passport/share",
      {
        method: "POST",
        body: JSON.stringify({ is_enabled: isEnabled }),
      }
    );
  },

  /**
   * Public read-only view of a verified skill passport via token.
   */
  async getPublicPassport(shareToken: string): Promise<PublicPassportResponse> {
    return fetchAPI<PublicPassportResponse>(
      `/api/v1/passport/share/${shareToken}`
    );
  },

  /**
   * Employer view of an applicant's passport.
   */
  async getEmployerCandidatePassport(
    candidateId: string
  ): Promise<CandidatePassportResponse> {
    return fetchAPI<CandidatePassportResponse>(
      `/api/v1/employer/candidates/${candidateId}/passport`
    );
  },
};

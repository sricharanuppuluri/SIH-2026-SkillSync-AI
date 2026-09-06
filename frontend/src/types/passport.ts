/**
 * Verified Skill Passport and Evidence TypeScript interfaces.
 */

export type EvidenceType =
  | "COURSE_COMPLETION"
  | "CANDIDATE_DECLARATION"
  | "RESUME_EXTRACTION"
  | "CERTIFICATION"
  | "ASSESSMENT";

export type EvidenceStatus = "VALID" | "REVOKED" | "EXPIRED";

export type VerificationStatus = "VERIFIED" | "UNVERIFIED" | "EXPIRED" | "REJECTED";

export type VerificationMethod =
  | "COURSE_COMPLETION"
  | "CERTIFICATION"
  | "ASSESSMENT"
  | "CANDIDATE_DECLARATION"
  | "RESUME_EXTRACTION"
  | "NONE";

export interface SkillEvidenceRead {
  id: string;
  candidate_id: string;
  skill_id: string;
  skill_name?: string | null;
  evidence_type: EvidenceType;
  source_id?: string | null;
  title: string;
  description?: string | null;
  evidence_url?: string | null;
  issued_at?: string | null;
  completed_at?: string | null;
  meta?: Record<string, unknown> | null;
  status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}

export interface SkillEvidenceCreate {
  skill_id: string;
  evidence_type: EvidenceType;
  title: string;
  description?: string;
  evidence_url?: string;
  issued_at?: string;
  completed_at?: string;
  meta?: Record<string, unknown>;
}

export interface VerifiedSkillItem {
  skill_id: string;
  skill_name: string;
  skill_slug: string;
  category: string;
  skill_type: string;
  status: VerificationStatus;
  verification_method: VerificationMethod;
  verification_score?: number | null;
  verified_at?: string | null;
  expires_at?: string | null;
  verification_summary: string;
  evidence_count: number;
  strongest_evidence_type?: EvidenceType | null;
  evidence_items: SkillEvidenceRead[];
}

export interface PassportCandidateSummary {
  candidate_id: string;
  user_id: string;
  full_name: string;
  headline?: string | null;
  current_role?: string | null;
  location_city?: string | null;
  location_state?: string | null;
}

export interface PassportStats {
  total_skills: number;
  verified_skills: number;
  unverified_skills: number;
  expired_skills: number;
  total_evidence_items: number;
  verification_coverage_pct: number;
}

export interface CandidatePassportResponse {
  candidate: PassportCandidateSummary;
  stats: PassportStats;
  skills: VerifiedSkillItem[];
  last_recalculated_at?: string | null;
  share_token?: string | null;
  is_share_enabled: boolean;
}

export interface PublicPassportResponse {
  candidate: PassportCandidateSummary;
  stats: PassportStats;
  skills: VerifiedSkillItem[];
  shared_at?: string | null;
}

export interface PassportShareToggleRequest {
  is_enabled: boolean;
}

export interface PassportShareResponse {
  share_token: string;
  is_enabled: boolean;
  share_url?: string | null;
}

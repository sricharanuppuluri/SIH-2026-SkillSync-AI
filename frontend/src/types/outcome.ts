import { EmploymentType } from "./employer";

export type RetentionStatus =
  | "ACTIVE"
  | "LEFT_WITHIN_30D"
  | "RETAINED_90D"
  | "RETAINED_180D"
  | "TERMINATED";

export type PPITier =
  | "TIER_1_EXCELLENT"
  | "TIER_2_PROFICIENT"
  | "TIER_3_DEVELOPING"
  | "TIER_4_NEEDS_IMPROVEMENT";

export interface TrainingAttribution {
  id: string;
  enrollment_id: string;
  course_id: string;
  course_title: string;
  provider_id: string;
  provider_name: string;
  completed_at: string;
}

export interface PlacementOutcome {
  id: string;
  application_id: string;
  candidate_id: string;
  candidate_name?: string | null;
  employer_id: string;
  employer_company_name?: string | null;
  job_id: string;
  job_title?: string | null;
  contract_id?: string | null;
  contract_title?: string | null;
  placement_date: string;
  starting_salary_annual?: number | null;
  employment_type: EmploymentType;
  retention_status: RetentionStatus;
  contract_fulfillment_score?: number | null;
  employer_satisfaction_rating?: number | null;
  employer_feedback_notes?: string | null;
  verified_by_employer: boolean;
  training_attributions: TrainingAttribution[];
  created_at: string;
  updated_at: string;
}

export interface PlacementOutcomeSummary {
  id: string;
  application_id: string;
  candidate_id: string;
  candidate_name?: string | null;
  employer_company_name?: string | null;
  job_title?: string | null;
  placement_date: string;
  employment_type: EmploymentType;
  retention_status: RetentionStatus;
  starting_salary_annual?: number | null;
  employer_satisfaction_rating?: number | null;
  has_training_attribution: boolean;
  created_at: string;
}

export interface PlacementOutcomeCreate {
  application_id: string;
  placement_date: string;
  starting_salary_annual?: number | null;
  employment_type?: EmploymentType;
  contract_id?: string | null;
}

export interface RetentionUpdatePayload {
  retention_status: RetentionStatus;
  employer_satisfaction_rating?: number | null;
  contract_fulfillment_score?: number | null;
  employer_feedback_notes?: string | null;
}

export interface EmployerFeedbackPayload {
  employer_satisfaction_rating: number;
  contract_fulfillment_score?: number | null;
  employer_feedback_notes?: string | null;
}

export interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  period_start?: string | null;
  period_end?: string | null;
  total_enrolled: number;
  total_completed: number;
  total_placed: number;
  completion_rate: number;
  placement_rate: number;
  retention_rate_90d: number;
  average_starting_salary?: number | null;
  average_employer_rating?: number | null;
  ppi_score: number;
  ppi_tier: PPITier;
  calculation_breakdown?: Record<string, number>;
}

export interface ProviderLeaderboardItem {
  rank: number;
  provider_id: string;
  provider_name: string;
  ppi_score: number;
  ppi_tier: PPITier;
  completion_rate: number;
  placement_rate: number;
  retention_rate_90d: number;
  average_starting_salary?: number | null;
  average_employer_rating?: number | null;
  total_graduates: number;
  total_placed: number;
}

export interface SkillPlacementRateInsight {
  skill_id: string;
  skill_name: string;
  category?: string | null;
  placement_count: number;
  placement_rate: number;
  average_salary?: number | null;
  retention_rate_90d: number;
}

export interface DistrictOutcomeKPIs {
  district: string;
  state?: string | null;
  total_placements: number;
  average_salary?: number | null;
  retention_rate_90d: number;
}

export interface OutcomeAnalytics {
  total_placements: number;
  placement_rate: number;
  average_retention_90d: number;
  average_starting_salary?: number | null;
  average_employer_satisfaction?: number | null;
  total_tracked_candidates: number;
  placement_by_employment_type: Record<string, number>;
  retention_distribution: Record<string, number>;
  district_benchmarks: DistrictOutcomeKPIs[];
}

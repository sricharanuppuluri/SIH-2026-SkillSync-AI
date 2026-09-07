/**
 * TypeScript definitions for Phase 16 Employer Skill Contract Exchange.
 */

export type ContractStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ContractRequirementType = "REQUIRED" | "PREFERRED";
export type ContractRequirementImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ContractEvidenceType =
  | "NONE"
  | "VERIFIED_SKILL"
  | "COURSE_COMPLETION"
  | "CERTIFICATION"
  | "PROJECT"
  | "WORK_EXPERIENCE";

export interface SkillContractRequirementCreate {
  skill_id: string;
  required_proficiency?: string;
  requirement_type?: ContractRequirementType;
  importance?: ContractRequirementImportance;
  minimum_experience_months?: number;
  evidence_type?: ContractEvidenceType;
  notes?: string | null;
}

export interface SkillContractRequirementUpdate {
  skill_id: string;
  required_proficiency?: string;
  requirement_type?: ContractRequirementType;
  importance?: ContractRequirementImportance;
  minimum_experience_months?: number;
  evidence_type?: ContractEvidenceType;
  notes?: string | null;
}

export interface SkillContractRequirementResponse {
  id: string;
  contract_id: string;
  skill_id: string;
  skill_name: string;
  skill_category?: string | null;
  skill_type?: string | null;
  required_proficiency: string;
  requirement_type: ContractRequirementType;
  importance: ContractRequirementImportance;
  minimum_experience_months: number;
  evidence_type: ContractEvidenceType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillContractCreate {
  job_id: string;
  title?: string | null;
  requirements: SkillContractRequirementCreate[];
}

export interface SkillContractUpdate {
  title?: string | null;
  requirements?: SkillContractRequirementUpdate[] | null;
}

export interface SkillContractSummary {
  id: string;
  job_id: string;
  job_title?: string | null;
  employer_id: string;
  company_name?: string | null;
  version: number;
  status: ContractStatus;
  title?: string | null;
  total_requirements: number;
  required_skills_count: number;
  critical_skills_count: number;
  effective_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillContractResponse {
  id: string;
  job_id: string;
  job_title?: string | null;
  employer_id: string;
  company_name?: string | null;
  version: number;
  status: ContractStatus;
  title?: string | null;
  effective_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  requirements: SkillContractRequirementResponse[];
}

export interface ContractQualityScore {
  score: number;
  rating: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  explanation: string[];
  total_requirements: number;
  has_proficiency_specified: boolean;
  has_evidence_specified: boolean;
  duplicate_skills_detected: boolean;
}

export interface ContractSkillInsight {
  skill_id: string;
  skill_name: string;
  category?: string | null;
  required_proficiency: string;
  importance: ContractRequirementImportance;
  evidence_type: ContractEvidenceType;
  current_demand: number;
  verified_supply: number;
  unverified_supply: number;
  shortage_category: string;
  forecast_demand?: number | null;
  forecast_growth_trend?: string | null;
  forecast_shortage?: string | null;
  training_courses_available: number;
}

export interface ContractInsightsResponse {
  contract_id: string;
  job_id: string;
  job_title?: string | null;
  version: number;
  status: ContractStatus;
  total_skills: number;
  required_skills_count: number;
  preferred_skills_count: number;
  critical_skills_count: number;
  high_priority_count: number;
  verified_evidence_requirements_count: number;
  average_proficiency: string;
  skill_type_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  completeness_score: number;
  market_insights: ContractSkillInsight[];
}

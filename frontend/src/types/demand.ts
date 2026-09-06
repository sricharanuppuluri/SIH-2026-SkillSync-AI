/**
 * Phase 13 — Skill Demand Digital Twin TypeScript types.
 *
 * IMPORTANT: All data is computed from SkillSync AI platform data.
 * This is NOT an authoritative external labor-market dataset.
 * No ML forecasting — strictly historical/current aggregation.
 */

export type SkillShortageStatus =
  | "HIGH_SHORTAGE"
  | "MODERATE_SHORTAGE"
  | "BALANCED"
  | "SURPLUS";

export interface SkillDemandTrendItem {
  period: string; // "January 2026"
  period_date: string; // "2026-01-01"
  demand_count: number;
}

export interface SkillDemandLocationItem {
  city: string;
  state: string | null;
  is_remote: boolean;
  demand_count: number;
  demand_share_percentage: number;
}

export interface SkillDemandIndustryItem {
  industry: string;
  demand_count: number;
  demand_share_percentage: number;
}

export interface SkillDemandTrainingItem {
  course_id: string;
  course_title: string;
  difficulty_level: string;
  delivery_mode: string;
  duration_hours: number;
  capacity: number;
  institution_name: string;
}

export interface SkillDemandSummaryItem {
  skill_id: string;
  skill_name: string;
  category: string | null;
  skill_type: string | null;
  demand_count: number;
  demand_share_percentage: number;
  rank: number;
  verified_supply_count: number;
  demand_supply_ratio: number;
  shortage_status: SkillShortageStatus;
  training_courses_count: number;
}

export interface DemandOverviewKPIs {
  total_active_jobs: number;
  unique_skills_in_demand: number;
  verified_candidate_supply: number;
  published_training_courses: number;
  skills_in_shortage: number;
}

export interface DemandOverviewResponse {
  kpis: DemandOverviewKPIs;
  top_demanded_skills: SkillDemandSummaryItem[];
  highest_shortage_skills: SkillDemandSummaryItem[];
}

export interface SkillSupplyBreakdown {
  verified_candidates: number;
  unverified_candidates: number;
  total_candidates: number;
  by_verification_method: Record<string, number>;
}

export interface SkillDemandDetailResponse {
  skill_id: string;
  skill_name: string;
  category: string | null;
  skill_type: string | null;
  description: string | null;
  demand_count: number;
  demand_share_percentage: number;
  rank: number;
  supply: SkillSupplyBreakdown;
  demand_supply_ratio: number;
  shortage_status: SkillShortageStatus;
  published_courses_count: number;
  training_providers_count: number;
  top_industries: SkillDemandIndustryItem[];
  top_locations: SkillDemandLocationItem[];
  historical_trends: SkillDemandTrendItem[];
  related_skills: string[];
}

export interface DemandListFilters {
  search?: string;
  skill_type?: string;
  industry?: string;
  location?: string;
  shortage_status?: SkillShortageStatus;
  skip?: number;
  limit?: number;
}

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

// ---------------------------------------------------------------------------
// Phase 14: Demand Forecasting Types
// ---------------------------------------------------------------------------

export type ForecastModelType =
  | "holt"
  | "linear_trend"
  | "baseline_fallback"
  | "moving_average";

export type DemandGrowthTrend = "INCREASING" | "STABLE" | "DECLINING";

export interface DemandSeriesPoint {
  month: string;
  month_date: string;
  actual_demand?: number | null;
  predicted_demand?: number | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  data_type: "ACTUAL" | "FORECAST";
}

export interface SkillForecastMonthItem {
  forecast_month: string;
  forecast_month_date: string;
  predicted_demand: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

export interface SkillForecastResponse {
  skill_id: string;
  skill_name: string;
  category: string | null;
  skill_type: string | null;
  current_actual_demand: number;
  latest_actual_month: string | null;
  forecast_horizon_months: number;
  model_used: string;
  historical_observations_count: number;
  confidence_level: number;
  forecasted_demand_end: number;
  expected_growth_percentage: number;
  growth_trend: DemandGrowthTrend;
  growth_interpretation: string;
  current_verified_supply: number;
  current_shortage_status: SkillShortageStatus;
  forecasted_demand_supply_ratio: number;
  forecasted_shortage_status: SkillShortageStatus;
  available_training_courses_count: number;
  training_insight: string;
  evaluation_mae?: number | null;
  monthly_forecasts: SkillForecastMonthItem[];
  combined_series: DemandSeriesPoint[];
}

export interface GlobalForecastSummaryItem {
  skill_id: string;
  skill_name: string;
  category: string | null;
  skill_type: string | null;
  current_demand: number;
  forecasted_demand: number;
  growth_percentage: number;
  growth_trend: DemandGrowthTrend;
  current_shortage_status: SkillShortageStatus;
  forecasted_shortage_status: SkillShortageStatus;
  model_used: string;
  lower_bound: number;
  upper_bound: number;
}

export interface GlobalForecastOverviewResponse {
  horizon_months: number;
  total_current_demand: number;
  total_forecasted_demand: number;
  overall_growth_percentage: number;
  top_growing_skills: GlobalForecastSummaryItem[];
  top_declining_skills: GlobalForecastSummaryItem[];
  high_forecast_shortage_skills: GlobalForecastSummaryItem[];
  forecast_items: GlobalForecastSummaryItem[];
}

export interface ForecastFilters {
  horizon?: number;
  skill_id?: string;
  industry?: string;
  location?: string;
  limit?: number;
}


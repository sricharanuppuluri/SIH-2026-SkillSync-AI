/**
 * Phase 15: What-If Skill Demand Simulator Types
 */

import { SkillShortageStatus } from "./demand";

export type SimulatorBaselineType = "ACTUAL" | "FORECAST";

export interface SkillScenarioInput {
  skill_id: string;
  baseline_type: SimulatorBaselineType;
  forecast_horizon?: number;
  demand_change_percent: number;
  additional_verified_supply: number;
  additional_training_capacity: number;
}

export interface SkillScenarioBaseline {
  demand: number;
  verified_supply: number;
  training_capacity: number;
  shortage_ratio: number;
  shortage_category: SkillShortageStatus;
  baseline_type: SimulatorBaselineType;
  forecast_horizon?: number | null;
}

export interface SkillScenarioProjected {
  demand: number;
  verified_supply: number;
  training_capacity: number;
  shortage_ratio: number;
  shortage_category: SkillShortageStatus;
}

export interface SkillScenarioImpact {
  demand_change: number;
  demand_change_percent: number;
  supply_change: number;
  supply_change_percent: number;
  training_capacity_change: number;
  training_capacity_change_percent: number;
  shortage_ratio_change: number;
  category_changed: boolean;
  previous_category: SkillShortageStatus;
  new_category: SkillShortageStatus;
}

export interface SkillScenarioResult {
  skill_id: string;
  skill_name: string;
  category?: string | null;
  skill_type?: string | null;
  baseline: SkillScenarioBaseline;
  scenario: SkillScenarioInput;
  projected: SkillScenarioProjected;
  impact: SkillScenarioImpact;
  explanation: string;
  related_skills: string[];
}

export interface MultiSkillScenarioRequest {
  skills: SkillScenarioInput[];
}

export interface MultiSkillScenarioResponse {
  results: SkillScenarioResult[];
  total_skills: number;
  categories_improved_count: number;
  categories_worsened_count: number;
  categories_unchanged_count: number;
}

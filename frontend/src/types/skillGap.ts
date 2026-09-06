/**
 * Skill Gap Analysis domain types for deterministic matching and scoring.
 */

import { ProficiencyLevel } from "./candidate";
import { SkillType } from "./skill";

export type SkillGapStatus = "MATCHED" | "PARTIAL" | "MISSING";

export type GapSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface SkillGapItem {
  skill_id: string;
  skill_name: string;
  skill_type: SkillType;
  category: string;
  status: SkillGapStatus;
  required_proficiency: ProficiencyLevel;
  candidate_proficiency: ProficiencyLevel | null;
  candidate_years_experience: number | null;
  is_required: boolean;
  weight: number;
  severity: GapSeverity | null;
  proficiency_delta: number;
  explanation: string;
}

export interface SkillGapSummary {
  total_required_skills: number;
  matched_skills: number;
  partial_skills: number;
  missing_skills: number;
}

export interface SkillGapReport {
  job_id: string;
  job_title: string;
  employer_name: string | null;
  candidate_id: string;
  skill_alignment_score: number;
  summary: SkillGapSummary;
  gaps: SkillGapItem[];
}

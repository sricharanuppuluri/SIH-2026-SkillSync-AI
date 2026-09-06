/**
 * Phase 6 — Skill Extraction frontend types.
 * Mirror of backend app/schemas/skill_extraction.py
 */

export type ExtractionSourceType =
  | "JOB"
  | "RESUME"
  | "COURSE"
  | "PROFILE"
  | "OTHER";

export interface SkillExtractionItem {
  raw_name: string;
  normalized_name: string;
  canonical_skill_id: string | null;
  canonical_skill_name: string | null;
  confidence: number;
  evidence: string;
  resolved: boolean;
}

export interface SkillExtractionResponse {
  success: boolean;
  skills: SkillExtractionItem[];
  model: string;
  source_type: ExtractionSourceType;
  processing_time_ms: number;
  resolved_count: number;
  unresolved_count: number;
  warnings: string[];
}

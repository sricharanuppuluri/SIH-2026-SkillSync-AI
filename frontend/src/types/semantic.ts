import { SkillType } from "./skill";

export type MatchType = "EXACT" | "ALIAS" | "STRONG_SEMANTIC" | "SEMANTIC" | "NO_MATCH";

export interface SemanticMatchItem {
  skill_id: string;
  skill_name: string;
  skill_type: SkillType;
  category: string;
  similarity: number;
  match_type: MatchType;
  matched_via: string;
  explanation: string;
}

export interface SemanticMatchRequest {
  text: string;
  top_k?: number;
  skill_type?: SkillType;
}

export interface SemanticMatchResponse {
  query: string;
  normalized_query: string;
  matches: SemanticMatchItem[];
  model_name: string;
}

export interface EmbeddingStatusResponse {
  total_active_skills: number;
  embedded_skills: number;
  missing_embeddings: number;
  model_name: string;
  dimension: number;
  is_model_available: boolean;
}

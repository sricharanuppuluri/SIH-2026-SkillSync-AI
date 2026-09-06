/**
 * Phase 13 — Skill Demand Digital Twin API Client.
 *
 * All endpoints communicate with backend /api/v1/demand/*
 * Overview is public; all other endpoints require authentication.
 */

import { fetchAPI } from "./api";
import type {
  DemandListFilters,
  DemandOverviewResponse,
  SkillDemandDetailResponse,
  SkillDemandIndustryItem,
  SkillDemandLocationItem,
  SkillDemandSummaryItem,
  SkillDemandTrainingItem,
  SkillDemandTrendItem,
  SkillSupplyBreakdown,
} from "@/types/demand";

const BASE = "/api/v1/demand";

/**
 * Fetch the public Digital Twin overview KPIs and leaderboards.
 * No authentication required.
 */
export async function getDemandOverview(
  industry?: string,
  location?: string
): Promise<DemandOverviewResponse> {
  const params = new URLSearchParams();
  if (industry) params.set("industry", industry);
  if (location) params.set("location", location);
  const qs = params.toString();
  return fetchAPI<DemandOverviewResponse>(`${BASE}/overview${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch the paginated demand leaderboard across all canonical skills.
 * Requires authentication.
 */
export async function listSkillDemand(
  filters: DemandListFilters = {}
): Promise<SkillDemandSummaryItem[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.skill_type) params.set("skill_type", filters.skill_type);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.location) params.set("location", filters.location);
  if (filters.shortage_status) params.set("shortage_status", filters.shortage_status);
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return fetchAPI<SkillDemandSummaryItem[]>(`${BASE}/skills${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch complete 360° Digital Twin detail for a canonical skill.
 * Requires authentication.
 */
export async function getSkillDemandDetail(
  skillId: string
): Promise<SkillDemandDetailResponse> {
  return fetchAPI<SkillDemandDetailResponse>(`${BASE}/skills/${skillId}`);
}

/**
 * Fetch historical monthly demand trend for a skill.
 * Requires authentication.
 */
export async function getSkillDemandTrends(
  skillId: string
): Promise<SkillDemandTrendItem[]> {
  return fetchAPI<SkillDemandTrendItem[]>(`${BASE}/skills/${skillId}/trends`);
}

/**
 * Fetch geographic demand distribution for a skill.
 * Requires authentication.
 */
export async function getSkillDemandLocations(
  skillId: string
): Promise<SkillDemandLocationItem[]> {
  return fetchAPI<SkillDemandLocationItem[]>(`${BASE}/skills/${skillId}/locations`);
}

/**
 * Fetch industry demand distribution for a skill.
 * Requires authentication.
 */
export async function getSkillDemandIndustries(
  skillId: string
): Promise<SkillDemandIndustryItem[]> {
  return fetchAPI<SkillDemandIndustryItem[]>(`${BASE}/skills/${skillId}/industries`);
}

/**
 * Fetch aggregate supply breakdown for a skill (no PII).
 * Requires authentication.
 */
export async function getSkillDemandSupply(
  skillId: string
): Promise<SkillSupplyBreakdown> {
  return fetchAPI<SkillSupplyBreakdown>(`${BASE}/skills/${skillId}/supply`);
}

/**
 * Fetch published training courses for a skill.
 * Requires authentication.
 */
export async function getSkillDemandTraining(
  skillId: string
): Promise<SkillDemandTrainingItem[]> {
  return fetchAPI<SkillDemandTrainingItem[]>(`${BASE}/skills/${skillId}/training`);
}

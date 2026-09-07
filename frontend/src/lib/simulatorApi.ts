/**
 * Phase 15: What-If Skill Demand Simulator API Client
 *
 * Stateless endpoints communicating with backend /api/v1/simulator/*
 * Evaluates hypothetical interventions in demand, supply, and training capacity.
 */

import { fetchAPI } from "./api";
import type {
  MultiSkillScenarioRequest,
  MultiSkillScenarioResponse,
  SkillScenarioInput,
  SkillScenarioResult,
} from "@/types/simulator";

const BASE = "/api/v1/simulator";

/**
 * Simulate a what-if scenario for a single canonical skill.
 * Requires authentication.
 */
export async function simulateSkillScenario(
  input: SkillScenarioInput
): Promise<SkillScenarioResult> {
  return fetchAPI<SkillScenarioResult>(`${BASE}/skill`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Simulate a what-if scenario for multiple canonical skills in batch.
 * Requires authentication.
 */
export async function simulateMultiSkillScenario(
  request: MultiSkillScenarioRequest
): Promise<MultiSkillScenarioResponse> {
  return fetchAPI<MultiSkillScenarioResponse>(`${BASE}/scenario`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

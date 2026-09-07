/**
 * API client methods for Phase 17 Employment Outcome Intelligence & Provider Performance Index.
 */

import { fetchAPI } from "./api";
import {
  OutcomeAnalytics,
  PlacementOutcome,
  PlacementOutcomeCreate,
  PlacementOutcomeSummary,
  ProviderLeaderboardItem,
  ProviderPerformance,
  RetentionUpdatePayload,
  SkillPlacementRateInsight,
} from "@/types";

export const outcomeAPI = {
  /**
   * Record a verified employment placement outcome for a hired candidate.
   */
  async recordPlacement(
    payload: PlacementOutcomeCreate
  ): Promise<PlacementOutcome> {
    return fetchAPI<PlacementOutcome>("/api/v1/outcomes/placements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * List authorized placement outcome summaries for current user role.
   */
  async listPlacements(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PlacementOutcomeSummary[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    const qs = searchParams.toString();
    return fetchAPI<PlacementOutcomeSummary[]>(
      `/api/v1/outcomes/placements${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Retrieve full details of a specific placement outcome.
   */
  async getPlacement(placementId: string): Promise<PlacementOutcome> {
    return fetchAPI<PlacementOutcome>(
      `/api/v1/outcomes/placements/${placementId}`
    );
  },

  /**
   * Update retention milestone and employer feedback on a placement.
   */
  async updateRetention(
    placementId: string,
    payload: RetentionUpdatePayload
  ): Promise<PlacementOutcome> {
    return fetchAPI<PlacementOutcome>(
      `/api/v1/outcomes/placements/${placementId}/retention`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Retrieve real-time Provider Performance Index (PPI) metrics for a training institute.
   */
  async getProviderPerformance(
    providerId: string
  ): Promise<ProviderPerformance> {
    return fetchAPI<ProviderPerformance>(
      `/api/v1/outcomes/providers/${providerId}/performance`
    );
  },

  /**
   * Retrieve deterministically ranked training provider leaderboard.
   */
  async getProviderLeaderboard(
    limit: number = 50
  ): Promise<ProviderLeaderboardItem[]> {
    return fetchAPI<ProviderLeaderboardItem[]>(
      `/api/v1/outcomes/providers/leaderboard?limit=${limit}`
    );
  },

  /**
   * Retrieve macro-level ecosystem outcome KPIs and geographic benchmarks (Zero PII).
   */
  async getOverviewAnalytics(): Promise<OutcomeAnalytics> {
    return fetchAPI<OutcomeAnalytics>("/api/v1/outcomes/analytics/overview");
  },

  /**
   * Retrieve canonical skill placement rates and wage conversion benchmarks.
   */
  async getSkillAnalytics(
    limit: number = 50
  ): Promise<SkillPlacementRateInsight[]> {
    return fetchAPI<SkillPlacementRateInsight[]>(
      `/api/v1/outcomes/analytics/skills?limit=${limit}`
    );
  },
};

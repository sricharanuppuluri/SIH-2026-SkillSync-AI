/**
 * API client methods for Phase 16 Employer Skill Contract Exchange.
 */

import { fetchAPI } from "./api";
import {
  ContractInsightsResponse,
  ContractQualityScore,
  ContractStatus,
  SkillContractCreate,
  SkillContractResponse,
  SkillContractSummary,
  SkillContractUpdate,
} from "@/types";

export const contractAPI = {
  /**
   * List skill contracts accessible to the user (filtered by job_id or status).
   */
  async listContracts(params?: {
    job_id?: string;
    status?: ContractStatus;
  }): Promise<SkillContractSummary[]> {
    const searchParams = new URLSearchParams();
    if (params?.job_id) searchParams.append("job_id", params.job_id);
    if (params?.status) searchParams.append("status", params.status);
    const queryString = searchParams.toString();
    return fetchAPI<SkillContractSummary[]>(
      `/api/v1/contracts${queryString ? `?${queryString}` : ""}`
    );
  },

  /**
   * Get a skill contract with full requirement details.
   */
  async getContract(contractId: string): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/contracts/${contractId}`);
  },

  /**
   * Create a new draft skill contract for a job requisition.
   */
  async createContract(payload: SkillContractCreate): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>("/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a draft skill contract (metadata and requirements).
   */
  async updateContract(
    contractId: string,
    payload: SkillContractUpdate
  ): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/contracts/${contractId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Atomically activate a draft contract, archiving previous active version.
   */
  async activateContract(contractId: string): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/contracts/${contractId}/activate`, {
      method: "POST",
    });
  },

  /**
   * Archive an active contract.
   */
  async archiveContract(contractId: string): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/contracts/${contractId}/archive`, {
      method: "POST",
    });
  },

  /**
   * Fork a new draft version from an existing contract.
   */
  async createVersion(contractId: string): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/contracts/${contractId}/version`, {
      method: "POST",
    });
  },

  /**
   * Get deterministic contract quality score and completeness breakdown.
   */
  async getQuality(contractId: string): Promise<ContractQualityScore> {
    return fetchAPI<ContractQualityScore>(`/api/v1/contracts/${contractId}/quality`);
  },

  /**
   * Get comprehensive contract market intelligence and supply/demand insights.
   */
  async getInsights(contractId: string): Promise<ContractInsightsResponse> {
    return fetchAPI<ContractInsightsResponse>(`/api/v1/contracts/${contractId}/insights`);
  },

  /**
   * Get the currently active skill contract for a job requisition.
   */
  async getJobContract(jobId: string): Promise<SkillContractResponse> {
    return fetchAPI<SkillContractResponse>(`/api/v1/jobs/${jobId}/contract`);
  },

  /**
   * Get the version history of all contracts for a job requisition.
   */
  async getJobContractHistory(jobId: string): Promise<SkillContractSummary[]> {
    return fetchAPI<SkillContractSummary[]>(`/api/v1/jobs/${jobId}/contract/history`);
  },
};

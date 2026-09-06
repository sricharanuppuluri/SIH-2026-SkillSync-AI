/**
 * API client module for Candidate endpoints (/api/v1/candidate/*).
 */

import { fetchAPI } from "@/lib/api";
import {
  CandidateDashboardData,
  CandidateEducation,
  CandidateEducationCreateData,
  CandidateEducationUpdateData,
  CandidateExperience,
  CandidateExperienceCreateData,
  CandidateExperienceUpdateData,
  CandidateProfile,
  CandidateProfileUpdateData,
  CandidateResumeResponse,
  CandidateResumeUploadData,
  CandidateSkill,
  CandidateSkillCreateData,
  CandidateSkillUpdateData,
  ProfileCompleteness,
} from "@/types/candidate";
import { SkillGapReport } from "@/types/skillGap";

export const candidateAPI = {
  // Dashboard & Completeness
  getDashboard: async (): Promise<CandidateDashboardData> => {
    return fetchAPI<CandidateDashboardData>("/api/v1/candidate/dashboard");
  },

  getCompleteness: async (): Promise<ProfileCompleteness> => {
    return fetchAPI<ProfileCompleteness>("/api/v1/candidate/profile/completeness");
  },

  // Profile Management
  getProfile: async (): Promise<CandidateProfile> => {
    return fetchAPI<CandidateProfile>("/api/v1/candidate/profile");
  },

  updateProfile: async (data: CandidateProfileUpdateData): Promise<CandidateProfile> => {
    return fetchAPI<CandidateProfile>("/api/v1/candidate/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Skills
  listSkills: async (): Promise<CandidateSkill[]> => {
    return fetchAPI<CandidateSkill[]>("/api/v1/candidate/skills");
  },

  addSkill: async (data: CandidateSkillCreateData): Promise<CandidateSkill> => {
    return fetchAPI<CandidateSkill>("/api/v1/candidate/skills", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateSkill: async (skillId: string, data: CandidateSkillUpdateData): Promise<CandidateSkill> => {
    return fetchAPI<CandidateSkill>(`/api/v1/candidate/skills/${skillId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteSkill: async (skillId: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/candidate/skills/${skillId}`, {
      method: "DELETE",
    });
  },

  // Education
  listEducation: async (): Promise<CandidateEducation[]> => {
    return fetchAPI<CandidateEducation[]>("/api/v1/candidate/education");
  },

  addEducation: async (data: CandidateEducationCreateData): Promise<CandidateEducation> => {
    return fetchAPI<CandidateEducation>("/api/v1/candidate/education", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEducation: async (
    educationId: string,
    data: CandidateEducationUpdateData
  ): Promise<CandidateEducation> => {
    return fetchAPI<CandidateEducation>(`/api/v1/candidate/education/${educationId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteEducation: async (educationId: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/candidate/education/${educationId}`, {
      method: "DELETE",
    });
  },

  // Experience
  listExperience: async (): Promise<CandidateExperience[]> => {
    return fetchAPI<CandidateExperience[]>("/api/v1/candidate/experience");
  },

  addExperience: async (data: CandidateExperienceCreateData): Promise<CandidateExperience> => {
    return fetchAPI<CandidateExperience>("/api/v1/candidate/experience", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateExperience: async (
    experienceId: string,
    data: CandidateExperienceUpdateData
  ): Promise<CandidateExperience> => {
    return fetchAPI<CandidateExperience>(`/api/v1/candidate/experience/${experienceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteExperience: async (experienceId: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/candidate/experience/${experienceId}`, {
      method: "DELETE",
    });
  },

  // Resume
  uploadResume: async (data: CandidateResumeUploadData): Promise<CandidateResumeResponse> => {
    return fetchAPI<CandidateResumeResponse>("/api/v1/candidate/resume", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteResume: async (): Promise<CandidateResumeResponse> => {
    return fetchAPI<CandidateResumeResponse>("/api/v1/candidate/resume", {
      method: "DELETE",
    });
  },

  // Skill Gap Engine
  getJobSkillGap: async (jobId: string): Promise<SkillGapReport> => {
    return fetchAPI<SkillGapReport>(`/api/v1/candidate/jobs/${jobId}/skill-gap`);
  },
};

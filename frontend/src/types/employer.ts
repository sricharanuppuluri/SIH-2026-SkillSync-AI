export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type ExperienceLevel = "ENTRY" | "MID" | "SENIOR" | "LEAD";
export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "HIRED";

export interface JobSkillRequirement {
  skill_id: string;
  is_required: boolean;
  minimum_proficiency: string;
  weight: number;
}

export interface JobSkill {
  id: string;
  skill_id: string;
  skill_name?: string | null;
  category?: string | null;
  is_required: boolean;
  minimum_proficiency: string;
  weight: number;
}

export interface Job {
  id: string;
  employer_id: string;
  employer_name?: string | null;
  title: string;
  description: string;
  location_city?: string | null;
  location_state?: string | null;
  is_remote: boolean;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  status: JobStatus;
  salary_min?: number | null;
  salary_max?: number | null;
  is_active: boolean;
  skills: JobSkill[];
  applications_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobCreatePayload {
  title: string;
  description: string;
  location_city?: string | null;
  location_state?: string | null;
  is_remote?: boolean;
  employment_type?: EmploymentType;
  experience_level?: ExperienceLevel;
  status?: JobStatus;
  salary_min?: number | null;
  salary_max?: number | null;
  skills?: JobSkillRequirement[];
}

export interface JobUpdatePayload {
  title?: string;
  description?: string;
  location_city?: string | null;
  location_state?: string | null;
  is_remote?: boolean;
  employment_type?: EmploymentType;
  experience_level?: ExperienceLevel;
  status?: JobStatus;
  salary_min?: number | null;
  salary_max?: number | null;
  is_active?: boolean;
  skills?: JobSkillRequirement[];
}

export type { Skill } from "./skill";

export interface CandidateInfo {
  id: string;
  full_name: string;
  email: string;
  headline?: string | null;
  bio?: string | null;
  experience_years: number;
  education_level?: string | null;
  location_city?: string | null;
  location_state?: string | null;
}

export interface EmployerApplication {
  id: string;
  candidate_id: string;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  cover_note?: string | null;
  applied_at: string;
  candidate: CandidateInfo;
}

export interface EmployerDashboardMetrics {
  total_jobs: number;
  published_jobs: number;
  draft_jobs: number;
  closed_jobs: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
}

export interface EmployerRecentJob {
  id: string;
  title: string;
  status: JobStatus;
  location_city?: string | null;
  applications_count: number;
  skills_count: number;
  created_at: string;
}

export interface EmployerRecentApplication {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_headline?: string | null;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  applied_at: string;
}

export interface EmployerDashboardData {
  metrics: EmployerDashboardMetrics;
  recent_jobs: EmployerRecentJob[];
  recent_applications: EmployerRecentApplication[];
}

export interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_description?: string | null;
  industry?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  website_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployerProfileUpdatePayload {
  company_name?: string;
  company_description?: string | null;
  industry?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  website_url?: string | null;
}

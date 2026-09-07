/**
 * Strongly-typed definitions for Candidate Domain Module.
 */

export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  headline: string | null;
  bio: string | null;
  current_role: string | null;
  experience_years: number;
  education_level: string | null;
  location_city: string | null;
  location_state: string | null;
  resume_filename: string | null;
  resume_file_size: number | null;
  resume_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfileUpdateData {
  full_name?: string;
  headline?: string | null;
  bio?: string | null;
  current_role?: string | null;
  experience_years?: number | null;
  education_level?: string | null;
  location_city?: string | null;
  location_state?: string | null;
}

export interface CandidateSkill {
  id: string;
  candidate_id: string;
  skill_id: string;
  skill_name: string;
  category: string;
  skill_type: string;
  proficiency: ProficiencyLevel;
  years_experience: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateSkillCreateData {
  skill_id: string;
  proficiency: ProficiencyLevel;
  years_experience?: number;
}

export interface CandidateSkillUpdateData {
  proficiency?: ProficiencyLevel;
  years_experience?: number;
}

export interface CandidateEducation {
  id: string;
  candidate_id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  grade: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateEducationCreateData {
  institution: string;
  degree: string;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
  grade?: string | null;
  description?: string | null;
}

export interface CandidateEducationUpdateData {
  institution?: string;
  degree?: string;
  field_of_study?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
  grade?: string | null;
  description?: string | null;
}

export interface CandidateExperience {
  id: string;
  candidate_id: string;
  company: string;
  title: string;
  employment_type: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateExperienceCreateData {
  company: string;
  title: string;
  employment_type?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

export interface CandidateExperienceUpdateData {
  company?: string;
  title?: string;
  employment_type?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

export interface CandidateResumeUploadData {
  filename: string;
  file_size: number;
  resume_text?: string | null;
}

export interface CandidateResumeResponse {
  filename: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  has_resume: boolean;
}

export interface ProfileCompleteness {
  percentage: number;
  completed_sections: string[];
  missing_sections: string[];
  section_scores: Record<string, number>;
}

export interface CandidateDashboardData {
  profile: CandidateProfile;
  completeness: ProfileCompleteness;
  skills_count: number;
  skills_by_proficiency: Record<ProficiencyLevel, number>;
  experience_count: number;
  education_count: number;
  recent_experiences: CandidateExperience[];
  highest_education: CandidateEducation | null;
}

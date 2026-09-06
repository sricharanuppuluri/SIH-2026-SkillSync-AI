export type CourseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type CourseMode = "ONLINE" | "IN_PERSON" | "HYBRID";
export type CourseStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type EnrollmentStatus = "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface SkillBrief {
  id: string;
  name: string;
  category?: string | null;
  skill_type?: string | null;
  is_primary?: boolean;
}

export interface CurriculumLesson {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  content_reference?: string | null;
  order_index: number;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CurriculumModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  lessons: CurriculumLesson[];
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  provider_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  difficulty: CourseDifficulty;
  delivery_mode: CourseMode;
  duration_hours: number;
  duration_weeks?: number | null;
  capacity: number;
  location_state?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  enrollment_deadline?: string | null;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
  skills: SkillBrief[];
  curriculum_modules: CurriculumModule[];
  active_enrollments_count?: number;
  remaining_capacity?: number;
  provider_name?: string | null;
}

export interface CourseCreateInput {
  title: string;
  description?: string;
  category?: string;
  difficulty?: CourseDifficulty;
  delivery_mode?: CourseMode;
  duration_hours?: number;
  duration_weeks?: number;
  capacity?: number;
  location_state?: string;
  start_date?: string;
  end_date?: string;
  enrollment_deadline?: string;
  skill_ids?: string[];
}

export interface CourseUpdateInput {
  title?: string;
  description?: string;
  category?: string;
  difficulty?: CourseDifficulty;
  delivery_mode?: CourseMode;
  duration_hours?: number;
  duration_weeks?: number;
  capacity?: number;
  location_state?: string;
  start_date?: string;
  end_date?: string;
  enrollment_deadline?: string;
}

export interface CourseSkillMapInput {
  skill_ids: string[];
}

export interface CurriculumModuleCreateInput {
  title: string;
  description?: string;
  order_index?: number;
}

export interface CurriculumModuleUpdateInput {
  title?: string;
  description?: string;
  order_index?: number;
}

export interface CurriculumLessonCreateInput {
  title: string;
  description?: string;
  content_reference?: string;
  order_index?: number;
  duration_minutes?: number;
}

export interface CurriculumLessonUpdateInput {
  title?: string;
  description?: string;
  content_reference?: string;
  order_index?: number;
  duration_minutes?: number;
}

export interface ReorderItemInput {
  id: string;
  order_index: number;
}

export interface ReorderCurriculumInput {
  items: ReorderItemInput[];
}

export interface EnrollmentLessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  candidate_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string | null;
  progress_percentage: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  course?: Course | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
}

export interface EnrollmentProgressDetail extends Enrollment {
  lesson_progress: Record<string, boolean>;
}

export interface TrainingProviderProfile {
  id: string;
  user_id: string;
  organization_name: string;
  description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  accreditation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProviderProfileUpdate {
  organization_name?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  accreditation?: string;
}

export interface TrainingProviderDashboardMetrics {
  total_courses: number;
  draft_courses: number;
  published_courses: number;
  closed_courses: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  total_capacity: number;
  remaining_capacity: number;
}

export interface TrainingProviderDashboardResponse {
  metrics: TrainingProviderDashboardMetrics;
  recent_courses: Course[];
  recent_enrollments: Enrollment[];
}

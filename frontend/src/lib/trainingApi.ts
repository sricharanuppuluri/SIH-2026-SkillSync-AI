/**
 * API client module for Training Provider & Candidate Learning endpoints.
 */

import { fetchAPI } from "@/lib/api";
import {
  Course,
  CourseCreateInput,
  CourseUpdateInput,
  CourseSkillMapInput,
  CurriculumModule,
  CurriculumModuleCreateInput,
  CurriculumModuleUpdateInput,
  CurriculumLesson,
  CurriculumLessonCreateInput,
  CurriculumLessonUpdateInput,
  ReorderCurriculumInput,
  Enrollment,
  EnrollmentProgressDetail,
  TrainingProviderProfile,
  TrainingProviderProfileUpdate,
  TrainingProviderDashboardResponse,
} from "@/types/training";

export interface CourseFilterParams {
  search?: string;
  skill_id?: string;
  difficulty?: string;
  delivery_mode?: string;
  skip?: number;
  limit?: number;
}

export const trainingProviderAPI = {
  // Provider Profile
  getProfile: async (): Promise<TrainingProviderProfile> => {
    return fetchAPI<TrainingProviderProfile>("/api/v1/training-provider/profile");
  },

  updateProfile: async (data: TrainingProviderProfileUpdate): Promise<TrainingProviderProfile> => {
    return fetchAPI<TrainingProviderProfile>("/api/v1/training-provider/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Dashboard Metrics
  getDashboard: async (): Promise<TrainingProviderDashboardResponse> => {
    return fetchAPI<TrainingProviderDashboardResponse>("/api/v1/training-provider/dashboard");
  },

  // Course Management
  listCourses: async (status?: string, skip: number = 0, limit: number = 50): Promise<Course[]> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());
    return fetchAPI<Course[]>(`/api/v1/training-provider/courses?${params.toString()}`);
  },

  getCourse: async (courseId: string): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/training-provider/courses/${courseId}`);
  },

  createCourse: async (data: CourseCreateInput): Promise<Course> => {
    return fetchAPI<Course>("/api/v1/training-provider/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCourse: async (courseId: string, data: CourseUpdateInput): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/training-provider/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  mapSkills: async (courseId: string, data: CourseSkillMapInput): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/training-provider/courses/${courseId}/skills`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  publishCourse: async (courseId: string): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/training-provider/courses/${courseId}/publish`, {
      method: "POST",
    });
  },

  closeCourse: async (courseId: string): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/training-provider/courses/${courseId}/close`, {
      method: "POST",
    });
  },

  getCourseEnrollments: async (courseId: string): Promise<Enrollment[]> => {
    return fetchAPI<Enrollment[]>(`/api/v1/training-provider/courses/${courseId}/enrollments`);
  },

  // Curriculum Management
  getCurriculum: async (courseId: string): Promise<CurriculumModule[]> => {
    return fetchAPI<CurriculumModule[]>(`/api/v1/training-provider/courses/${courseId}/curriculum`);
  },

  createModule: async (courseId: string, data: CurriculumModuleCreateInput): Promise<CurriculumModule> => {
    return fetchAPI<CurriculumModule>(`/api/v1/training-provider/courses/${courseId}/curriculum/modules`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateModule: async (
    courseId: string,
    moduleId: string,
    data: CurriculumModuleUpdateInput
  ): Promise<CurriculumModule> => {
    return fetchAPI<CurriculumModule>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },

  deleteModule: async (courseId: string, moduleId: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}`, {
      method: "DELETE",
    });
  },

  reorderModules: async (courseId: string, data: ReorderCurriculumInput): Promise<CurriculumModule[]> => {
    return fetchAPI<CurriculumModule[]>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/reorder`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },

  createLesson: async (
    courseId: string,
    moduleId: string,
    data: CurriculumLessonCreateInput
  ): Promise<CurriculumLesson> => {
    return fetchAPI<CurriculumLesson>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}/lessons`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  updateLesson: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: CurriculumLessonUpdateInput
  ): Promise<CurriculumLesson> => {
    return fetchAPI<CurriculumLesson>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${lessonId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },

  deleteLesson: async (courseId: string, moduleId: string, lessonId: string): Promise<void> => {
    return fetchAPI<void>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${lessonId}`,
      {
        method: "DELETE",
      }
    );
  },

  reorderLessons: async (
    courseId: string,
    moduleId: string,
    data: ReorderCurriculumInput
  ): Promise<CurriculumLesson[]> => {
    return fetchAPI<CurriculumLesson[]>(
      `/api/v1/training-provider/courses/${courseId}/curriculum/modules/${moduleId}/lessons/reorder`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
};

export const candidateLearningAPI = {
  // Discovery
  discoverCourses: async (filters: CourseFilterParams = {}): Promise<Course[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.skill_id) params.append("skill_id", filters.skill_id);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.delivery_mode) params.append("delivery_mode", filters.delivery_mode);
    if (filters.skip !== undefined) params.append("skip", filters.skip.toString());
    if (filters.limit !== undefined) params.append("limit", filters.limit.toString());

    return fetchAPI<Course[]>(`/api/v1/candidate/learning/courses?${params.toString()}`);
  },

  getCourseDetail: async (courseId: string): Promise<Course> => {
    return fetchAPI<Course>(`/api/v1/candidate/learning/courses/${courseId}`);
  },

  // Enrollments
  enroll: async (courseId: string): Promise<Enrollment> => {
    return fetchAPI<Enrollment>(`/api/v1/candidate/learning/courses/${courseId}/enroll`, {
      method: "POST",
    });
  },

  listMyEnrollments: async (status?: string): Promise<Enrollment[]> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    return fetchAPI<Enrollment[]>(`/api/v1/candidate/learning/enrollments?${params.toString()}`);
  },

  getEnrollmentProgress: async (enrollmentId: string): Promise<EnrollmentProgressDetail> => {
    return fetchAPI<EnrollmentProgressDetail>(`/api/v1/candidate/learning/enrollments/${enrollmentId}/progress`);
  },

  updateLessonProgress: async (
    enrollmentId: string,
    lessonId: string,
    completed: boolean
  ): Promise<EnrollmentProgressDetail> => {
    return fetchAPI<EnrollmentProgressDetail>(
      `/api/v1/candidate/learning/enrollments/${enrollmentId}/lessons/${lessonId}/progress`,
      {
        method: "PUT",
        body: JSON.stringify({ completed }),
      }
    );
  },
};

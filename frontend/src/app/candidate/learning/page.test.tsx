import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CandidateLearningHubPage from "./page";
import { candidateLearningAPI } from "@/lib/trainingApi";
import { skillTaxonomyAPI } from "@/lib/api";
import { Course, Enrollment, Skill } from "@/types";

vi.mock("@/lib/trainingApi", () => ({
  candidateLearningAPI: {
    listMyEnrollments: vi.fn(),
    discoverCourses: vi.fn(),
    enroll: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  skillTaxonomyAPI: {
    list: vi.fn(),
  },
}));

const mockEnrollments: Enrollment[] = [
  {
    id: "enr-1",
    candidate_id: "cand-1",
    course_id: "course-1",
    status: "IN_PROGRESS",
    enrolled_at: new Date().toISOString(),
    progress_percentage: 60,
    completed_lessons_count: 3,
    total_lessons_count: 5,
    course: {
      id: "course-1",
      provider_id: "prov-1",
      title: "Python Backend Development",
      difficulty: "INTERMEDIATE",
      delivery_mode: "ONLINE",
      duration_hours: 40,
      capacity: 30,
      status: "PUBLISHED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      skills: [{ id: "sk-1", name: "Python" }],
      curriculum_modules: [],
      provider_name: "Apex Training Academy",
    },
  },
];

const mockCatalogCourses: Course[] = [
  {
    id: "course-2",
    provider_id: "prov-1",
    title: "Docker & Container Architecture",
    description: "Master modern containerization.",
    category: "DevOps",
    difficulty: "BEGINNER",
    delivery_mode: "ONLINE",
    duration_hours: 20,
    capacity: 25,
    status: "PUBLISHED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: [{ id: "sk-2", name: "Docker" }],
    curriculum_modules: [],
    active_enrollments_count: 10,
    remaining_capacity: 15,
    provider_name: "Apex Training Academy",
  },
];

const mockSkills: Skill[] = [
  {
    id: "sk-1",
    name: "Python",
    slug: "python",
    normalized_name: "python",
    category: "Programming",
    skill_type: "TECHNICAL",
    status: "ACTIVE",
    aliases_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("Candidate Learning Hub Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders enrolled courses by default", async () => {
    vi.mocked(candidateLearningAPI.listMyEnrollments).mockResolvedValue(mockEnrollments);
    vi.mocked(candidateLearningAPI.discoverCourses).mockResolvedValue(mockCatalogCourses);
    vi.mocked(skillTaxonomyAPI.list).mockResolvedValue(mockSkills);

    render(<CandidateLearningHubPage />);

    await waitFor(() => {
      expect(screen.getByText("Skill Development & Vocational Courses")).toBeDefined();
    });

    // Verify enrolled course card is present
    expect(screen.getByText("Python Backend Development")).toBeDefined();
    expect(screen.getByText("60%")).toBeDefined();
    expect(screen.getByText("3 of 5 lessons completed")).toBeDefined();
    expect(screen.getByText("Continue Learning")).toBeDefined();
  });

  it("switches to course catalog and allows enrollment", async () => {
    vi.mocked(candidateLearningAPI.listMyEnrollments).mockResolvedValue([]);
    vi.mocked(candidateLearningAPI.discoverCourses).mockResolvedValue(mockCatalogCourses);
    vi.mocked(skillTaxonomyAPI.list).mockResolvedValue(mockSkills);
    vi.mocked(candidateLearningAPI.enroll).mockResolvedValue({
      id: "enr-2",
      candidate_id: "cand-1",
      course_id: "course-2",
      status: "ENROLLED",
      enrolled_at: new Date().toISOString(),
      progress_percentage: 0,
      completed_lessons_count: 0,
      total_lessons_count: 2,
    });

    render(<CandidateLearningHubPage />);

    await waitFor(() => {
      expect(screen.getByText("Explore Course Catalog")).toBeDefined();
    });

    // Switch to Catalog Tab
    fireEvent.click(screen.getByText("Explore Course Catalog"));

    await waitFor(() => {
      expect(screen.getByText("Docker & Container Architecture")).toBeDefined();
      expect(screen.getByText("15/25 left")).toBeDefined();
    });

    // Click Enroll
    const enrollBtn = screen.getByRole("button", { name: "Enroll" });
    fireEvent.click(enrollBtn);

    await waitFor(() => {
      expect(candidateLearningAPI.enroll).toHaveBeenCalledWith("course-2");
    });
  });
});

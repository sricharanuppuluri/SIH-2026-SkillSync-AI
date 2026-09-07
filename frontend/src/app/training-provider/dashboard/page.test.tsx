import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TrainingProviderDashboardPage from "./page";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { TrainingProviderDashboardResponse } from "@/types";

vi.mock("@/lib/trainingApi", () => ({
  trainingProviderAPI: {
    getDashboard: vi.fn(),
  },
}));

const mockDashboardData: TrainingProviderDashboardResponse = {
  metrics: {
    total_courses: 5,
    draft_courses: 2,
    published_courses: 3,
    closed_courses: 0,
    total_enrollments: 12,
    active_enrollments: 8,
    completed_enrollments: 4,
    total_capacity: 100,
    remaining_capacity: 92,
  },
  recent_courses: [
    {
      id: "course-1",
      provider_id: "prov-1",
      title: "FastAPI Microservices Architecture",
      description: "Learn modern backend API development.",
      category: "Software Engineering",
      difficulty: "INTERMEDIATE",
      delivery_mode: "ONLINE",
      duration_hours: 40,
      capacity: 30,
      status: "PUBLISHED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      skills: [{ id: "sk-1", name: "FastAPI" }],
      curriculum_modules: [
        {
          id: "mod-1",
          course_id: "course-1",
          title: "Introduction",
          order_index: 1,
          lessons: [
            {
              id: "les-1",
              module_id: "mod-1",
              title: "Setup",
              order_index: 1,
              duration_minutes: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      active_enrollments_count: 5,
      remaining_capacity: 25,
    },
  ],
  recent_enrollments: [
    {
      id: "enr-1",
      candidate_id: "cand-1",
      course_id: "course-1",
      status: "IN_PROGRESS",
      enrolled_at: new Date().toISOString(),
      progress_percentage: 50,
      completed_lessons_count: 1,
      total_lessons_count: 2,
      candidate_name: "Alice Johnson",
      course: {
        id: "course-1",
        provider_id: "prov-1",
        title: "FastAPI Microservices Architecture",
        difficulty: "INTERMEDIATE",
        delivery_mode: "ONLINE",
        duration_hours: 40,
        capacity: 30,
        status: "PUBLISHED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        skills: [],
        curriculum_modules: [],
      },
    },
  ],
};

describe("Training Provider Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders live metrics and recent courses correctly", async () => {
    vi.mocked(trainingProviderAPI.getDashboard).mockResolvedValue(mockDashboardData);

    render(<TrainingProviderDashboardPage />);

    expect(screen.getByText("Loading training provider metrics...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Curriculum & Course Management")).toBeDefined();
    });

    // Verify stat cards
    expect(screen.getByText("Total Courses")).toBeDefined();
    expect(screen.getByText("3 Published • 2 Draft")).toBeDefined();
    expect(screen.getByText("Active Enrollments")).toBeDefined();
    expect(screen.getByText("Completed Learners")).toBeDefined();
    expect(screen.getByText("Training Seat Capacity")).toBeDefined();

    // Verify recent course title
    expect(screen.getAllByText("FastAPI Microservices Architecture").length).toBeGreaterThanOrEqual(1);

    // Verify recent candidate enrollment
    expect(screen.getByText("Alice Johnson")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();
  });

  it("handles error state gracefully", async () => {
    vi.mocked(trainingProviderAPI.getDashboard).mockRejectedValue(
      new Error("Database connection failed")
    );

    render(<TrainingProviderDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load dashboard")).toBeDefined();
      expect(screen.getByText("Database connection failed")).toBeDefined();
    });
  });
});

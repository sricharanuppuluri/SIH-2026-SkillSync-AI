import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CareerCopilotPage from "./page";
import { copilotAPI } from "@/lib/copilotApi";
import { candidateAPI } from "@/lib/candidateApi";
import { jobAPI } from "@/lib/api";
import { CareerCopilotChatResult, CopilotConversationSummary } from "@/types/copilot";
import { Job } from "@/types";

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("@/lib/copilotApi", () => ({
  copilotAPI: {
    chat: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));

vi.mock("@/lib/candidateApi", () => ({
  candidateAPI: {
    getJobSkillGap: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  jobAPI: {
    listJobs: vi.fn(),
  },
}));

const mockConversations: CopilotConversationSummary[] = [
  {
    id: "conv-1",
    candidate_id: "cand-1",
    title: "Backend Career Review",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 2,
  },
];

const mockJobs: Job[] = [
  {
    id: "job-1",
    title: "Senior Backend Developer",
    description: "Build microservices with Python and Docker.",
    employer_id: "emp-1",
    employer_name: "Tech Corp",
    location_city: "Bengaluru",
    location_state: "Karnataka",
    is_remote: true,
    employment_type: "FULL_TIME",
    experience_level: "SENIOR",
    status: "PUBLISHED",
    is_active: true,
    applications_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    skills: [],
  },
];

const mockChatResult: CareerCopilotChatResult = {
  conversation_id: "conv-1",
  ai_status: "available",
  created_at: new Date().toISOString(),
  response: {
    answer: "You have strong Python and SQL competencies.",
    key_facts: ["Candidate has 4 years of Python experience."],
    action_items: ["Learn Docker container fundamentals."],
    skill_focus: ["Python", "Docker"],
    source_context: ["candidate_skill", "job_requirement"],
    limitations: [],
  },
};

describe("CareerCopilotPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copilotAPI.listConversations).mockResolvedValue(mockConversations);
    vi.mocked(jobAPI.listJobs).mockResolvedValue(mockJobs);
  });

  it("renders page title, starter prompts, and previous conversations", async () => {
    render(<CareerCopilotPage />);

    expect(screen.getByText("Career Copilot")).toBeDefined();
    expect(screen.getByText(/Personalized, grounded career advice/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Backend Career Review")).toBeDefined();
      expect(screen.getByText("Summarize my career profile & strengths")).toBeDefined();
    });
  });

  it("sends a message and displays the structured AI response", async () => {
    vi.mocked(copilotAPI.chat).mockResolvedValueOnce(mockChatResult);

    render(<CareerCopilotPage />);

    await waitFor(() => {
      expect(screen.getByText("Summarize my career profile & strengths")).toBeDefined();
    });

    // Click starter prompt
    const promptBtn = screen.getByText("Summarize my career profile & strengths");
    fireEvent.click(promptBtn);

    await waitFor(() => {
      expect(copilotAPI.chat).toHaveBeenCalledWith({
        message: "Summarize my career profile & strengths",
        conversation_id: null,
        job_id: null,
      });
      expect(screen.getByText("You have strong Python and SQL competencies.")).toBeDefined();
      expect(screen.getByText("Candidate has 4 years of Python experience.")).toBeDefined();
      expect(screen.getByText("Learn Docker container fundamentals.")).toBeDefined();
      expect(screen.getByText("Python")).toBeDefined();
      expect(screen.getByText("Docker")).toBeDefined();
    });
  });

  it("renders deterministic offline fallback status appropriately", async () => {
    const offlineChatResult: CareerCopilotChatResult = {
      conversation_id: "conv-offline",
      ai_status: "offline",
      created_at: new Date().toISOString(),
      response: {
        answer: "SkillSync_AI Deterministic Analysis: Your profile is active.",
        key_facts: ["Skills recorded: Python, SQL"],
        action_items: ["Add your core skills"],
        skill_focus: ["Python"],
        source_context: ["candidate_profile"],
        limitations: ["Local AI Copilot is currently offline. Output is generated deterministically."],
      },
    };

    vi.mocked(copilotAPI.chat).mockResolvedValueOnce(offlineChatResult);

    render(<CareerCopilotPage />);

    const textarea = screen.getByPlaceholderText(/Ask about your profile/i);
    fireEvent.change(textarea, { target: { value: "Hello offline copilot" } });
    const sendBtn = screen.getByRole("button", { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/AI Offline — Deterministic Engine Active/i)).toBeDefined();
      expect(screen.getByText(/SkillSync_AI Deterministic Analysis/i)).toBeDefined();
    });
  });

  it("selects a job to ground conversation in job requirements", async () => {
    vi.mocked(candidateAPI.getJobSkillGap).mockResolvedValueOnce({
      job_id: "job-1",
      job_title: "Senior Backend Developer",
      employer_name: "Tech Corp",
      candidate_id: "cand-1",
      skill_alignment_score: 75.0,
      summary: {
        total_required_skills: 4,
        matched_skills: 3,
        partial_skills: 0,
        missing_skills: 1,
      },
      gaps: [],
    });

    render(<CareerCopilotPage />);

    await waitFor(() => {
      expect(screen.getByText(/Target Job: General Career/i)).toBeDefined();
    });

    // Open dropdown
    const jobDropdownBtn = screen.getByText(/Target Job: General Career/i);
    fireEvent.click(jobDropdownBtn);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Developer")).toBeDefined();
    });

    // Select job
    fireEvent.click(screen.getByText("Senior Backend Developer"));

    await waitFor(() => {
      expect(candidateAPI.getJobSkillGap).toHaveBeenCalledWith("job-1");
      expect(screen.getByText("75%")).toBeDefined();
    });
  });

  it("deletes a conversation from the sidebar", async () => {
    vi.mocked(copilotAPI.deleteConversation).mockResolvedValueOnce();

    render(<CareerCopilotPage />);

    await waitFor(() => {
      expect(screen.getByText("Backend Career Review")).toBeDefined();
    });

    const deleteBtn = screen.getByTitle("Delete conversation");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(copilotAPI.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });
});

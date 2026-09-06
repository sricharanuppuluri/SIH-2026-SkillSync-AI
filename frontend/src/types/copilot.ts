/**
 * TypeScript definitions for Phase 10: AI Career Copilot.
 */

export type AIStatus = "available" | "degraded" | "offline";

export interface CareerCopilotResponse {
  answer: string;
  key_facts: string[];
  action_items: string[];
  skill_focus: string[];
  source_context: string[];
  limitations: string[];
}

export interface CareerCopilotChatResult {
  conversation_id: string;
  response: CareerCopilotResponse;
  ai_status: AIStatus;
  job_id?: string | null;
  created_at?: string;
}

export interface CareerCopilotRequest {
  message: string;
  conversation_id?: string | null;
  job_id?: string | null;
}

export interface CopilotMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured_data?: CareerCopilotResponse | null;
  created_at: string;
}

export interface CopilotConversationSummary {
  id: string;
  candidate_id: string;
  job_id?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface CopilotConversationResponse {
  id: string;
  candidate_id: string;
  job_id?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  messages: CopilotMessage[];
}

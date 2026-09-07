/**
 * API client module for Phase 10: AI Career Copilot (/api/v1/candidate/copilot/*).
 */

import { fetchAPI } from "@/lib/api";
import {
  CareerCopilotChatResult,
  CareerCopilotRequest,
  CopilotConversationResponse,
  CopilotConversationSummary,
} from "@/types/copilot";

export const copilotAPI = {
  /**
   * Submit a prompt to the Career Copilot and receive structured career guidance.
   */
  chat: async (payload: CareerCopilotRequest): Promise<CareerCopilotChatResult> => {
    return fetchAPI<CareerCopilotChatResult>("/api/v1/candidate/copilot/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieve list of Copilot conversation sessions for the authenticated candidate.
   */
  listConversations: async (): Promise<CopilotConversationSummary[]> => {
    return fetchAPI<CopilotConversationSummary[]>("/api/v1/candidate/copilot/conversations");
  },

  /**
   * Retrieve complete message history for an authorized conversation session.
   */
  getConversation: async (conversationId: string): Promise<CopilotConversationResponse> => {
    return fetchAPI<CopilotConversationResponse>(
      `/api/v1/candidate/copilot/conversations/${conversationId}`
    );
  },

  /**
   * Delete a Copilot conversation.
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    return fetchAPI<void>(`/api/v1/candidate/copilot/conversations/${conversationId}`, {
      method: "DELETE",
    });
  },
};

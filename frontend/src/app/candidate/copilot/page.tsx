"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { CopilotJobSelector } from "@/components/copilot/CopilotJobSelector";
import { copilotAPI } from "@/lib/copilotApi";
import { candidateAPI } from "@/lib/candidateApi";
import {
  AIStatus,
  CopilotConversationSummary,
  CopilotMessage,
} from "@/types/copilot";
import { Job } from "@/types";
import { SkillGapReport } from "@/types/skillGap";
import { cn } from "@/lib/utils";

export default function CareerCopilotPage() {
  const [conversations, setConversations] = useState<CopilotConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>("available");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const list = await copilotAPI.listConversations();
      setConversations(list || []);
    } catch (err: unknown) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  // Load specific conversation messages
  const loadConversationDetail = useCallback(async (convId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await copilotAPI.getConversation(convId);
      setActiveConversationId(detail.id);
      setMessages(detail.messages || []);
      if (detail.job_id) {
        // Fetch job gap report if linked
        try {
          const gap = await candidateAPI.getJobSkillGap(detail.job_id);
          setSkillGapReport(gap);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load conversation messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load Skill Gap report when job selection changes
  useEffect(() => {
    async function fetchGap() {
      if (!selectedJob) {
        setSkillGapReport(null);
        return;
      }
      try {
        const gap = await candidateAPI.getJobSkillGap(selectedJob.id);
        setSkillGapReport(gap);
      } catch {
        setSkillGapReport(null);
      }
    }
    fetchGap();
  }, [selectedJob]);

  // Handle Send Message
  const handleSendMessage = async (userText: string) => {
    setIsLoading(true);
    setError(null);
    setLastFailedMessage(null);

    // Optimistically add user message to UI
    const tempUserMsg: CopilotMessage = {
      id: "temp-" + Date.now(),
      conversation_id: activeConversationId || "temp",
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await copilotAPI.chat({
        message: userText,
        conversation_id: activeConversationId,
        job_id: selectedJob ? selectedJob.id : null,
      });

      setAiStatus(result.ai_status);
      setActiveConversationId(result.conversation_id);

      // Create assistant message from result
      const assistantMsg: CopilotMessage = {
        id: "msg-" + Date.now(),
        conversation_id: result.conversation_id,
        role: "assistant",
        content: result.response.answer,
        structured_data: result.response,
        created_at: result.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to communicate with Career Copilot";
      setError(errMsg);
      setLastFailedMessage(userText);
      // Remove temporary message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle New Chat / Clear
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copilotAPI.deleteConversation(convId);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      loadConversations();
    } catch (err: unknown) {
      console.error("Failed to delete conversation:", err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto space-y-3 animate-in fade-in duration-300">
      {/* Top Header / Context Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-600/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Career Copilot</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Phase 10
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Personalized, grounded career advice backed by PostgreSQL and deterministic engine.
            </p>
          </div>
        </div>

        {/* Job Context Selector & Alignment Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {skillGapReport && selectedJob && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs">
              <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Job Alignment:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {skillGapReport.skill_alignment_score}%
              </span>
            </div>
          )}

          <CopilotJobSelector
            selectedJobId={selectedJob ? selectedJob.id : null}
            onSelectJob={(job) => {
              setSelectedJob(job);
              if (job) {
                // Inform user in chat
              }
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Conversation History Sidebar */}
        <aside
          className={cn(
            "bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col transition-all duration-300 shrink-0",
            sidebarOpen ? "w-64" : "w-12 items-center"
          )}
        >
          {/* Sidebar Toggle & New Chat */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            {sidebarOpen ? (
              <>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse sessions"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title="Expand sessions"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Conversation List */}
          {sidebarOpen && (
            <div className="flex-1 p-2 space-y-1 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Recent Chats
              </div>
              {conversations.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No previous sessions.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversationDetail(conv.id)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border",
                        isActive
                          ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-300"
                          : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-indigo-400" />
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* Central Chat Stream */}
        <main className="flex-1 h-full min-w-0">
          <CopilotChat
            messages={messages}
            isLoading={isLoading}
            aiStatus={aiStatus}
            hasJobSelected={!!selectedJob}
            onSendMessage={handleSendMessage}
            onClearConversation={handleNewChat}
            error={error}
            onRetry={lastFailedMessage ? () => handleSendMessage(lastFailedMessage) : undefined}
          />
        </main>
      </div>
    </div>
  );
}

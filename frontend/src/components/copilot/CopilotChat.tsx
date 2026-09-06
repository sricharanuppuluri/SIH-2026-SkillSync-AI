"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  AlertCircle,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { CopilotMessage } from "@/components/copilot/CopilotMessage";
import { CopilotPromptSuggestions } from "@/components/copilot/CopilotPromptSuggestions";
import {
  AIStatus,
  CopilotMessage as CopilotMessageType,
} from "@/types/copilot";

interface CopilotChatProps {
  messages: CopilotMessageType[];
  isLoading: boolean;
  aiStatus: AIStatus;
  hasJobSelected: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onClearConversation?: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export function CopilotChat({
  messages,
  isLoading,
  aiStatus,
  hasJobSelected,
  onSendMessage,
  onClearConversation,
  error,
  onRetry,
}: CopilotChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/50 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
      {/* AI Status Banner */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {aiStatus === "available" && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Local AI Copilot Online
            </span>
          )}
          {aiStatus === "degraded" && (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              AI Status: Degraded (Deterministic Mode Active)
            </span>
          )}
          {aiStatus === "offline" && (
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              AI Offline — Deterministic Engine Active
            </span>
          )}
        </div>

        {messages.length > 0 && onClearConversation && (
          <button
            type="button"
            onClick={onClearConversation}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
          >
            <RotateCcw className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Bot className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">
                SkillSync AI Career Copilot
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your personalized, grounded career mentor. I analyze your actual skills,
                experience, and target job requirements using deterministic database facts.
              </p>
            </div>

            <div className="w-full text-left">
              <CopilotPromptSuggestions
                hasJobSelected={hasJobSelected}
                onSelectPrompt={(text) => onSendMessage(text)}
                disabled={isLoading}
              />
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <CopilotMessage key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator Bubble */}
            {isLoading && (
              <div className="flex gap-3 text-sm animate-in fade-in-50 duration-200">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Analyzing profile, skill gaps, and canonical intelligence...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800/80 rounded-lg text-rose-200 font-medium text-xs transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pill Bar (when messages already present) */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-slate-800/40 bg-slate-900/40 overflow-x-auto">
          <div className="flex gap-2">
            {(hasJobSelected
              ? [
                  "Explain my biggest gaps",
                  "Which skills should I prioritize?",
                  "Recommend next courses",
                ]
              : [
                  "Summarize my strengths",
                  "What skills am I missing?",
                  "How to improve profile?",
                ]
            ).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 text-[11px] whitespace-nowrap transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 bg-slate-900/80 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 4000))}
              onKeyDown={handleKeyDown}
              placeholder={
                hasJobSelected
                  ? "Ask about job alignment, gap severity, skill priorities..."
                  : "Ask about your profile, career readiness, strengths..."
              }
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
            <div className="absolute right-2 bottom-2 text-[10px] text-slate-600">
              {input.length}/4000
            </div>
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

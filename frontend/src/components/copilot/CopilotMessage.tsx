"use client";

import React, { useState } from "react";
import {
  Bot,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Flame,
} from "lucide-react";
import { CopilotMessage as CopilotMessageType } from "@/types/copilot";
import { cn } from "@/lib/utils";

interface CopilotMessageProps {
  message: CopilotMessageType;
}

export function CopilotMessage({ message }: CopilotMessageProps) {
  const isUser = message.role === "user";
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  const structured = message.structured_data;

  return (
    <div
      className={cn(
        "flex gap-3 text-sm transition-all animate-in fade-in-50 duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar Icon */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
          isUser
            ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
            : "bg-slate-900 border-slate-700 text-indigo-400 shadow-md shadow-slate-950/50"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm space-y-3",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-none"
            : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
        )}
      >
        {/* Main Text Content */}
        <div className="whitespace-pre-wrap leading-relaxed font-sans text-sm">
          {structured?.answer || message.content}
        </div>

        {/* Structured Copilot Details for Assistant Messages */}
        {!isUser && structured && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            {/* Toggle header */}
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="flex items-center justify-between w-full text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Grounded Analysis & Action Plan
              </span>
              {detailsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {detailsExpanded && (
              <div className="space-y-3 text-xs">
                {/* Key Facts */}
                {structured.key_facts && structured.key_facts.length > 0 && (
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-400" />
                      Key Database Facts
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {structured.key_facts.map((fact, idx) => (
                        <li key={idx} className="leading-normal">
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {structured.action_items && structured.action_items.length > 0 && (
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Recommended Next Actions
                    </div>
                    <ul className="space-y-1.5 text-slate-300">
                      {structured.action_items.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-normal">
                          <span className="text-emerald-400 font-bold shrink-0">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Focus Skills */}
                {structured.skill_focus && structured.skill_focus.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      Skill Focus
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {structured.skill_focus.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md font-mono text-[11px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources & Limitations */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/40 text-[10px] text-slate-500">
                  {structured.source_context && structured.source_context.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>Grounded via: {structured.source_context.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Limitations / Fallback alert */}
                {structured.limitations && structured.limitations.length > 0 && (
                  <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-2 text-amber-300 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      {structured.limitations.map((lim, idx) => (
                        <div key={idx}>{lim}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            "text-[10px]",
            isUser ? "text-indigo-200/80 text-right" : "text-slate-500"
          )}
        >
          {message.created_at
            ? new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Just now"}
        </div>
      </div>
    </div>
  );
}

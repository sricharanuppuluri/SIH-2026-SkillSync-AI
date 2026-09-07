"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface CopilotPromptSuggestionsProps {
  hasJobSelected: boolean;
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const GENERAL_PROMPTS = [
  "Summarize my career profile & strengths",
  "What are my strongest skills?",
  "What skills should I improve first?",
  "How can I improve my profile completeness?",
];

const JOB_SPECIFIC_PROMPTS = [
  "Why am I only partially matched for this job?",
  "Which required skills should I prioritize?",
  "What courses should I take for this role?",
  "Help me prepare my resume for this position",
];

export function CopilotPromptSuggestions({
  hasJobSelected,
  onSelectPrompt,
  disabled = false,
}: CopilotPromptSuggestionsProps) {
  const prompts = hasJobSelected ? JOB_SPECIFIC_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Suggested Questions {hasJobSelected && "(Job Specific)"}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt)}
            disabled={disabled}
            className="flex items-center justify-between text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all group disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="line-clamp-1">{prompt}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}

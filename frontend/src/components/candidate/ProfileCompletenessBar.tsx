"use client";

import React from "react";
import { CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { ProfileCompleteness } from "@/types/candidate";

interface ProfileCompletenessBarProps {
  completeness: ProfileCompleteness;
  compact?: boolean;
}

export function ProfileCompletenessBar({
  completeness,
  compact = false,
}: ProfileCompletenessBarProps) {
  const { percentage, completed_sections, missing_sections, section_scores } =
    completeness;

  const getColor = (pct: number) => {
    if (pct >= 80) return "from-emerald-500 to-teal-400";
    if (pct >= 50) return "from-indigo-500 to-sky-400";
    return "from-amber-500 to-rose-400";
  };

  const getTextColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-400";
    if (pct >= 50) return "text-indigo-400";
    return "text-amber-400";
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Profile Completeness</span>
          <span className={`font-semibold font-mono ${getTextColor(percentage)}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${getColor(
              percentage
            )}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Profile Readiness</h3>
            <p className="text-xs text-slate-400">
              Deterministic calculation based on your verified credentials
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 self-start sm:self-auto">
          <span className={`text-2xl font-bold font-mono ${getTextColor(percentage)}`}>
            {percentage}%
          </span>
          <span className="text-xs text-slate-500">complete</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 shadow-sm ${getColor(
            percentage
          )}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Section Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        {Object.entries(section_scores).map(([name, score]) => {
          const isDone = completed_sections.includes(name);
          return (
            <div
              key={name}
              className={`p-2 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                  : "bg-slate-950/40 border-slate-800/80 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <CircleAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="truncate">{name}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 shrink-0">
                {score}%
              </span>
            </div>
          );
        })}
      </div>

      {missing_sections.length > 0 && (
        <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 flex items-center gap-2">
          <CircleAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Complete <strong className="text-slate-300">{missing_sections.join(", ")}</strong> to
            boost your visibility to recruiters.
          </span>
        </div>
      )}
    </div>
  );
}

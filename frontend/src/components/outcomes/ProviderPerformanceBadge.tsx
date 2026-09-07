"use client";

import * as React from "react";
import { Award, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { PPITier } from "@/types";
import { cn } from "@/lib/utils";

interface ProviderPerformanceBadgeProps {
  score: number;
  tier: PPITier;
  showDetails?: boolean;
  className?: string;
}

export function ProviderPerformanceBadge({
  score,
  tier,
  showDetails = false,
  className,
}: ProviderPerformanceBadgeProps) {
  const getTierConfig = (t: PPITier) => {
    switch (t) {
      case "TIER_1_EXCELLENT":
        return {
          label: "Tier 1: Excellent",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <Award className="w-4 h-4 text-emerald-400" />,
          desc: "Benchmark performance exceeding 85 PPI",
        };
      case "TIER_2_PROFICIENT":
        return {
          label: "Tier 2: Proficient",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
          desc: "High quality conversion between 70-84 PPI",
        };
      case "TIER_3_DEVELOPING":
        return {
          label: "Tier 3: Developing",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
          desc: "Moderate placement rate between 50-69 PPI",
        };
      case "TIER_4_NEEDS_IMPROVEMENT":
      default:
        return {
          label: "Tier 4: Needs Improvement",
          color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          desc: "Requires outcome enhancement (< 50 PPI)",
        };
    }
  };

  const cfg = getTierConfig(tier);

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-sm transition-all",
          cfg.color
        )}
      >
        {cfg.icon}
        <span className="font-mono text-sm tracking-tight">{score.toFixed(1)}</span>
        <span className="text-[11px] opacity-80 uppercase tracking-wider">PPI</span>
        <span className="h-3 w-[1px] bg-slate-700 mx-0.5" />
        <span className="font-sans font-medium">{cfg.label}</span>
      </div>
      {showDetails && (
        <p className="text-[11px] text-slate-400 px-1">{cfg.desc}</p>
      )}
    </div>
  );
}

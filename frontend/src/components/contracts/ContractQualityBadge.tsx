"use client";

import * as React from "react";
import { CheckCircle, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { ContractQualityScore } from "@/types";
import { cn } from "@/lib/utils";

interface ContractQualityBadgeProps {
  quality: ContractQualityScore;
  showExplanation?: boolean;
  className?: string;
}

export function ContractQualityBadge({
  quality,
  showExplanation = false,
  className,
}: ContractQualityBadgeProps) {
  const [expanded, setExpanded] = React.useState(false);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "EXCELLENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "GOOD":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "FAIR":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "EXCELLENT":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "GOOD":
        return <CheckCircle className="w-4 h-4 text-indigo-400" />;
      case "FAIR":
        return <Info className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-sm cursor-pointer transition-all hover:opacity-90",
          getRatingColor(quality.rating)
        )}
        onClick={() => setExpanded(!expanded)}
        title="Click to view quality score breakdown"
      >
        {getRatingIcon(quality.rating)}
        <span>Quality Score: {quality.score}/100</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-900/60 text-[10px] font-mono uppercase">
          {quality.rating}
        </span>
      </div>

      {(showExplanation || expanded) && quality.explanation?.length > 0 && (
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs space-y-1.5 shadow-xl">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            Contract Quality Audit
          </div>
          <ul className="space-y-1">
            {quality.explanation.map((item, index) => (
              <li key={index} className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { TrendingUp, Layers } from "lucide-react";
import { SkillPlacementRateInsight } from "@/types";
import { cn } from "@/lib/utils";

interface SkillConversionChartProps {
  insights: SkillPlacementRateInsight[];
  className?: string;
}

export function SkillConversionChart({
  insights,
  className,
}: SkillConversionChartProps) {
  const formatCurrency = (val?: number | null) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <Layers className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-xs font-semibold text-slate-300">No Skill Conversion Data</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Skill placement insights populate automatically from verified job placements.
        </p>
      </div>
    );
  }

  const maxPlacements = Math.max(...insights.map((s) => s.placement_count), 1);

  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Skill Outcome & Wage Conversion</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Labor market hire velocity and starting wage benchmark by canonical skill
          </p>
        </div>
        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
          {insights.length} Tracked Skills
        </span>
      </div>

      <div className="space-y-4">
        {insights.slice(0, 8).map((skill) => {
          const barWidth = Math.max(8, (skill.placement_count / maxPlacements) * 100);
          return (
            <div key={skill.skill_id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  <span>{skill.skill_name}</span>
                  {skill.category && (
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {skill.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(skill.average_salary)}
                  </span>
                  <span className="text-slate-400">
                    {skill.placement_count} Placed
                  </span>
                  <span className="text-indigo-400">
                    {skill.retention_rate_90d.toFixed(0)}% 90D
                  </span>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

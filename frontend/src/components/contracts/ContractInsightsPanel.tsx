"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Award,
  Briefcase,
  BookOpen,
  ShieldCheck,
  BarChart2,
  Sliders,
} from "lucide-react";
import { ContractInsightsResponse } from "@/types";
import { cn } from "@/lib/utils";

interface ContractInsightsPanelProps {
  insights: ContractInsightsResponse;
  className?: string;
}

export function ContractInsightsPanel({ insights, className }: ContractInsightsPanelProps) {
  const getShortageBadge = (shortage: string) => {
    switch (shortage) {
      case "HIGH_SHORTAGE":
      case "HIGH":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "MODERATE_SHORTAGE":
      case "MODERATE":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "SURPLUS":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* High Level Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Skills</span>
          </div>
          <div className="text-2xl font-bold text-white">{insights.total_skills}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {insights.required_skills_count} Required • {insights.preferred_skills_count} Preferred
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Evidence</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {insights.verified_evidence_requirements_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Requires verified passport proof
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BarChart2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical / High Priority</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {insights.critical_skills_count + insights.high_priority_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {insights.critical_skills_count} Critical • {insights.high_priority_count} High
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Completeness</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{insights.completeness_score}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg Prof: {insights.average_proficiency}
          </div>
        </div>
      </div>

      {/* Market Supply & Demand Intelligence Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Ecosystem Market Intelligence (Phase 13 & 14)
          </h3>
          <span className="text-[11px] text-slate-500">
            Actual postings vs Verified talent supply & Holt-Winters forecast
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Contract Skill</th>
                <th className="py-3 px-3">Proficiency / Imp.</th>
                <th className="py-3 px-3">Current Demand (Actual)</th>
                <th className="py-3 px-3">Verified Supply</th>
                <th className="py-3 px-3">Shortage Status</th>
                <th className="py-3 px-3">Forecast Trend</th>
                <th className="py-3 px-3">Training Courses</th>
                <th className="py-3 px-4 text-right">What-If Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {insights.market_insights.map((item) => (
                <tr key={item.skill_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">
                    <div>{item.skill_name}</div>
                    {item.category && (
                      <div className="text-[10px] text-slate-500">{item.category}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-300 font-mono text-[10px]">
                      {item.required_proficiency}
                    </span>
                    <span className="text-slate-600 mx-1">•</span>
                    <span className="text-slate-400 text-[10px]">{item.importance}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white">{item.current_demand}</span>
                    <span className="text-slate-500 text-[10px] ml-1">jobs</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">
                        {item.verified_supply}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        ({item.unverified_supply} self)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border",
                        getShortageBadge(item.shortage_category)
                      )}
                    >
                      {item.shortage_category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {item.forecast_growth_trend ? (
                      <div>
                        <div className="font-medium text-slate-300 text-[11px]">
                          {item.forecast_demand ?? item.current_demand}{" "}
                          <span className="text-[9px] text-slate-500">forecast</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.forecast_growth_trend}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[10px]">Stable</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {item.training_courses_available > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        {item.training_courses_available} courses
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[11px]">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/simulator?skill_id=${item.skill_id}&name=${encodeURIComponent(
                        item.skill_name
                      )}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                      title="Simulate talent shortage & supply intervention"
                    >
                      <Sliders className="w-3 h-3 text-indigo-400" />
                      Simulate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

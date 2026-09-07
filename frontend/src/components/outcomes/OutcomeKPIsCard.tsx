"use client";

import * as React from "react";
import { Briefcase, TrendingUp, ShieldCheck, Star, Users } from "lucide-react";
import { OutcomeAnalytics } from "@/types";
import { cn } from "@/lib/utils";

interface OutcomeKPIsCardProps {
  analytics: OutcomeAnalytics;
  className?: string;
}

export function OutcomeKPIsCard({ analytics, className }: OutcomeKPIsCardProps) {
  const formatCurrency = (val?: number | null) => {
    if (!val) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const kpis = [
    {
      title: "Total Placements",
      value: analytics.total_placements.toLocaleString(),
      subtext: `${analytics.total_tracked_candidates.toLocaleString()} candidates tracked`,
      icon: <Briefcase className="w-5 h-5 text-indigo-400" />,
      gradient: "from-indigo-500/10 to-transparent",
      borderColor: "border-indigo-500/20",
    },
    {
      title: "Placement Rate",
      value: `${analytics.placement_rate.toFixed(1)}%`,
      subtext: "Ecosystem hire conversion",
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      gradient: "from-emerald-500/10 to-transparent",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "90-Day Retention",
      value: `${analytics.average_retention_90d.toFixed(1)}%`,
      subtext: "Milestone retention benchmark",
      icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
      gradient: "from-blue-500/10 to-transparent",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Avg Starting Salary",
      value: formatCurrency(analytics.average_starting_salary),
      subtext: "Verified annual baseline",
      icon: <Users className="w-5 h-5 text-purple-400" />,
      gradient: "from-purple-500/10 to-transparent",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Employer Satisfaction",
      value: analytics.average_employer_satisfaction
        ? `${analytics.average_employer_satisfaction.toFixed(1)} / 5.0`
        : "N/A",
      subtext: "Hiring manager sentiment",
      icon: <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />,
      gradient: "from-amber-500/10 to-transparent",
      borderColor: "border-amber-500/20",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4",
        className
      )}
    >
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-slate-900/60 p-5 backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-lg",
            kpi.borderColor
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none",
              kpi.gradient
            )}
          />
          <div className="relative z-10 flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {kpi.title}
            </span>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
              {kpi.icon}
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {kpi.value}
            </div>
            <div className="mt-1 text-xs text-slate-400">{kpi.subtext}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

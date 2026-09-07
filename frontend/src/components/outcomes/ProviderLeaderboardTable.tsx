"use client";

import * as React from "react";
import { Award, Users, ShieldCheck } from "lucide-react";
import { ProviderLeaderboardItem } from "@/types";
import { ProviderPerformanceBadge } from "./ProviderPerformanceBadge";
import { cn } from "@/lib/utils";

interface ProviderLeaderboardTableProps {
  items: ProviderLeaderboardItem[];
  className?: string;
}

export function ProviderLeaderboardTable({
  items,
  className,
}: ProviderLeaderboardTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <Award className="w-10 h-10 text-slate-600 mb-2" />
        <h3 className="text-sm font-semibold text-slate-200">No Leaderboard Data Available</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Provider performance metrics will populate as graduates complete programs and are hired.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md", className)}>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 w-16 text-center">Rank</th>
            <th className="py-3.5 px-4">Training Provider</th>
            <th className="py-3.5 px-4">Provider Performance Index</th>
            <th className="py-3.5 px-4">Completion Rate</th>
            <th className="py-3.5 px-4">Placement Rate</th>
            <th className="py-3.5 px-4">90D Retention</th>
            <th className="py-3.5 px-4 text-right">Total Placed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs">
          {items.map((item) => {
            const isTop3 = item.rank <= 3;
            return (
              <tr key={item.provider_id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold font-mono text-xs",
                      item.rank === 1
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : item.rank === 2
                        ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                        : item.rank === 3
                        ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    #{item.rank}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    <span>{item.provider_name}</span>
                    {isTop3 && <Award className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <ProviderPerformanceBadge score={item.ppi_score} tier={item.ppi_tier} />
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-12">{item.completion_rate.toFixed(1)}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${Math.min(100, item.completion_rate)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-12">{item.placement_rate.toFixed(1)}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, item.placement_rate)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{item.retention_rate_90d.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-100 text-right">
                  <div className="inline-flex items-center gap-1 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.total_placed}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

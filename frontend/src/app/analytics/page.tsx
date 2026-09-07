"use client";

import * as React from "react";
import {
  BarChart3,
  RefreshCw,
  Award,
  TrendingUp,
  MapPin,
  PieChart,
} from "lucide-react";
import {
  OutcomeAnalytics,
  ProviderLeaderboardItem,
  SkillPlacementRateInsight,
} from "@/types";
import { outcomeAPI } from "@/lib/outcomeApi";
import {
  OutcomeKPIsCard,
  ProviderLeaderboardTable,
  SkillConversionChart,
} from "@/components/outcomes";
import { Button } from "@/components/ui/Button";

export default function AnalyticsPage() {
  const [overview, setOverview] = React.useState<OutcomeAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = React.useState<ProviderLeaderboardItem[]>([]);
  const [skillInsights, setSkillInsights] = React.useState<SkillPlacementRateInsight[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, leaderboardData, skillData] = await Promise.all([
        outcomeAPI.getOverviewAnalytics(),
        outcomeAPI.getProviderLeaderboard(10),
        outcomeAPI.getSkillAnalytics(10),
      ]);
      setOverview(overviewData);
      setLeaderboard(leaderboardData);
      setSkillInsights(skillData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load outcome intelligence";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val?: number | null) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Employment Outcome Intelligence
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ecosystem-wide placement tracking, Provider Performance Index (PPI), and labor conversion metrics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Intelligence</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {loading && !overview ? (
        <div className="flex flex-col items-center justify-center p-24 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Computing deterministic outcome analytics & PPI scores...</p>
        </div>
      ) : (
        overview && (
          <>
            {/* 1. Macro KPIs */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Macro Ecosystem Outcomes
                </h2>
                <span className="text-[11px] text-slate-500 font-mono">
                  Zero PII Aggregation • Real-time
                </span>
              </div>
              <OutcomeKPIsCard analytics={overview} />
            </section>

            {/* 2. Provider Leaderboard & Skill Conversion */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leaderboard */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Top Performing Training Providers</span>
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Deterministic PPI Rank
                  </span>
                </div>
                <ProviderLeaderboardTable items={leaderboard} />
              </section>

              {/* Skill Conversion */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>High Conversion Skills</span>
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Wage & Placement Velocity
                  </span>
                </div>
                <SkillConversionChart insights={skillInsights} />
              </section>
            </div>

            {/* 3. Geographic / District Benchmarks & Retention Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* District Table */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      <span>Regional Outcome Benchmarks</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      District-level employment density, salary baselines, and retention stability
                    </p>
                  </div>
                </div>

                {overview.district_benchmarks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No district-specific placement data recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">District / City</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3">Placements</th>
                          <th className="py-2.5 px-3">Avg Annual Salary</th>
                          <th className="py-2.5 px-3">90D Retention</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {overview.district_benchmarks.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">
                              {d.district}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {d.state || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-200">
                              {d.total_placements}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400">
                              {formatCurrency(d.average_salary)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-blue-400">
                              {d.retention_rate_90d.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Retention Distribution Breakdown */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-400" />
                    <span>Retention Distribution</span>
                  </h3>
                </div>
                <div className="space-y-3 pt-2">
                  {Object.entries(overview.retention_distribution).map(([status, count]) => {
                    const pct =
                      overview.total_placements > 0
                        ? (count / overview.total_placements) * 100
                        : 0;
                    return (
                      <div key={status} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-mono">{status}</span>
                          <span className="font-mono text-slate-400">
                            {count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              status.includes("RETAINED")
                                ? "bg-emerald-400"
                                : status === "ACTIVE"
                                ? "bg-indigo-400"
                                : "bg-rose-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

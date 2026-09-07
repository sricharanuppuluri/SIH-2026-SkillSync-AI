"use client";

import * as React from "react";
import {
  GraduationCap,
  RefreshCw,
  TrendingUp,
  Users,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import {
  PlacementOutcomeSummary,
  ProviderPerformance,
} from "@/types";
import { outcomeAPI } from "@/lib/outcomeApi";
import { trainingProviderAPI } from "@/lib/trainingApi";
import {
  ProviderPerformanceBadge,
  PlacementRecordTable,
} from "@/components/outcomes";
import { Button } from "@/components/ui/Button";

export default function TrainingProviderOutcomesPage() {
  const [performance, setPerformance] =
    React.useState<ProviderPerformance | null>(null);
  const [placements, setPlacements] = React.useState<
    PlacementOutcomeSummary[]
  >([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProviderData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get current logged in training provider profile
      const prof = await trainingProviderAPI.getProfile();
      // 2. Fetch PPI performance & graduate placements
      const [perfData, placementsData] = await Promise.all([
        outcomeAPI.getProviderPerformance(prof.id),
        outcomeAPI.listPlacements(),
      ]);
      setPerformance(perfData);
      setPlacements(placementsData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load provider performance metrics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProviderData();
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
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Institutional Performance & Outcomes
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Provider Performance Index (PPI), graduate placement velocity, and verified hiring feedback
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviderData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Recalculate PPI</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchProviderData}>
            Retry
          </Button>
        </div>
      )}

      {loading && !performance ? (
        <div className="flex flex-col items-center justify-center p-24 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-slate-400">
            Calculating institutional performance index & graduate milestones...
          </p>
        </div>
      ) : (
        performance && (
          <>
            {/* PPI Hero Card */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-6 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Quality Benchmark
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 mt-1">
                    {performance.provider_name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Deterministic score evaluated from completion rates, employment conversions, 90-day retention, and employer ratings.
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <ProviderPerformanceBadge
                    score={performance.ppi_score}
                    tier={performance.ppi_tier}
                    showDetails={true}
                  />
                </div>
              </div>

              {/* Sub-Score Breakdown */}
              {performance.calculation_breakdown && (
                <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Completion (25%)
                    </span>
                    <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      {performance.calculation_breakdown.completion_contribution ?? 0} pts
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Placement (35%)
                    </span>
                    <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      {performance.calculation_breakdown.placement_contribution ?? 0} pts
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Retention (20%)
                    </span>
                    <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      {performance.calculation_breakdown.retention_contribution ?? 0} pts
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Employer Sentiment (20%)
                    </span>
                    <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      {performance.calculation_breakdown.employer_rating_contribution ?? 0} pts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Graduation Completion</span>
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-100">
                  {performance.completion_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {performance.total_completed} of {performance.total_enrolled} enrolled
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Placement Velocity</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {performance.placement_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {performance.total_placed} graduates hired
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>90-Day Retention</span>
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400">
                  {performance.retention_rate_90d.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">Verified post-hire stability</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Avg Graduate Salary</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400">
                  {formatCurrency(performance.average_starting_salary)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Verified annual baseline</p>
              </div>
            </div>

            {/* Anonymized Graduate Placement Outcomes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Attributed Graduate Employment Outcomes
                </h2>
                <span className="text-[11px] text-slate-500 font-mono">
                  Privacy-preserved (Candidate PII Anonymized)
                </span>
              </div>
              <PlacementRecordTable placements={placements} canEdit={false} />
            </div>
          </>
        )
      )}
    </div>
  );
}

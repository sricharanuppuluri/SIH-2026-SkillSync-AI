"use client";

import * as React from "react";
import {
  Briefcase,
  RefreshCw,
  Users,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { PlacementOutcomeSummary } from "@/types";
import { outcomeAPI } from "@/lib/outcomeApi";
import {
  PlacementRecordTable,
  EmployerFeedbackModal,
} from "@/components/outcomes";
import { Button } from "@/components/ui/Button";

export default function EmployerOutcomesPage() {
  const [placements, setPlacements] = React.useState<PlacementOutcomeSummary[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPlacement, setSelectedPlacement] =
    React.useState<PlacementOutcomeSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

  const fetchPlacements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await outcomeAPI.listPlacements();
      setPlacements(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load placement records";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPlacements();
  }, []);

  const handleOpenEdit = (p: PlacementOutcomeSummary) => {
    setSelectedPlacement(p);
    setIsModalOpen(true);
  };

  const totalPlacements = placements.length;
  const retainedCount = placements.filter(
    (p) =>
      p.retention_status === "RETAINED_90D" ||
      p.retention_status === "RETAINED_180D"
  ).length;
  const activeCount = placements.filter(
    (p) => p.retention_status === "ACTIVE"
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Employer Placements & Retention
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage verified candidate hires, submit retention milestones, and evaluate competency feedback
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlacements}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchPlacements}>
            Retry
          </Button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Placed</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {totalPlacements}
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified candidate hires</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Onboarding</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {activeCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">First 30 days active tenure</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Retained 90D+</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {retainedCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {totalPlacements > 0
              ? `${((retainedCount / totalPlacements) * 100).toFixed(0)}% retention rate`
              : "No outcomes yet"}
          </p>
        </div>
      </div>

      {/* Placements Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Hired Graduate Outcomes
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            Click &apos;Update&apos; to record milestones and satisfaction ratings
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading placement records...</p>
          </div>
        ) : (
          <PlacementRecordTable
            placements={placements}
            canEdit={true}
            onSelectPlacement={handleOpenEdit}
          />
        )}
      </div>

      {/* Feedback Modal */}
      <EmployerFeedbackModal
        placement={selectedPlacement}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlacement(null);
        }}
        onSuccess={() => {
          fetchPlacements();
        }}
      />
    </div>
  );
}

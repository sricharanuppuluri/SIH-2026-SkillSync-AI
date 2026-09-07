"use client";

import * as React from "react";
import {
  Calendar,
  Building2,
  Briefcase,
  Star,
  GraduationCap,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { PlacementOutcomeSummary, RetentionStatus } from "@/types";
import { cn } from "@/lib/utils";

interface PlacementRecordTableProps {
  placements: PlacementOutcomeSummary[];
  onSelectPlacement?: (placement: PlacementOutcomeSummary) => void;
  canEdit?: boolean;
  className?: string;
}

export function PlacementRecordTable({
  placements,
  onSelectPlacement,
  canEdit = false,
  className,
}: PlacementRecordTableProps) {
  const getRetentionBadge = (status: RetentionStatus) => {
    switch (status) {
      case "RETAINED_180D":
        return {
          label: "Retained (180D)",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case "RETAINED_90D":
        return {
          label: "Retained (90D)",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <CheckCircle className="w-3.5 h-3.5 text-blue-400" />,
        };
      case "ACTIVE":
        return {
          label: "Active (Initial)",
          color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          icon: <Clock className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case "LEFT_WITHIN_30D":
        return {
          label: "Left (<30D)",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "TERMINATED":
      default:
        return {
          label: "Terminated",
          color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        };
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (placements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <Briefcase className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Placement Records Found</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Verified employment outcomes will appear here once candidates are hired into job requisitions.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md", className)}>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4">Candidate / Graduate</th>
            <th className="py-3.5 px-4">Job Role & Employer</th>
            <th className="py-3.5 px-4">Placement Date</th>
            <th className="py-3.5 px-4">Starting Salary</th>
            <th className="py-3.5 px-4">Retention Status</th>
            <th className="py-3.5 px-4">Employer Rating</th>
            <th className="py-3.5 px-4">Attributed Training</th>
            {canEdit && <th className="py-3.5 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs">
          {placements.map((p) => {
            const badge = getRetentionBadge(p.retention_status);
            return (
              <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-slate-100">
                  {p.candidate_name || "Graduate Candidate"}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium text-slate-200">{p.job_title || "Engineering Role"}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    <span>{p.employer_company_name || "Employer"}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.placement_date}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-200">
                  {formatCurrency(p.starting_salary_annual)}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium",
                      badge.color
                    )}
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  {p.employer_satisfaction_rating ? (
                    <div className="flex items-center gap-1 text-amber-400 font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{p.employer_satisfaction_rating} / 5</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Pending</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {p.has_training_attribution ? (
                    <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px]">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Pathway Linked</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Direct Placement</span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectPlacement?.(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Update</span>
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

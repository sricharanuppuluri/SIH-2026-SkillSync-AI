"use client";

import * as React from "react";
import Link from "next/link";
import { History, CheckCircle2, Archive, FileEdit, ArrowRight } from "lucide-react";
import { SkillContractSummary } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface ContractVersionTimelineProps {
  history: SkillContractSummary[];
  currentContractId?: string;
  className?: string;
}

export function ContractVersionTimeline({
  history,
  currentContractId,
  className,
}: ContractVersionTimelineProps) {
  if (history.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "ARCHIVED":
        return <Archive className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <FileEdit className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "ARCHIVED":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className={cn("p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-indigo-400" />
          Version Lineage & Audit Trail
        </h3>
        <span className="text-[11px] text-slate-500">{history.length} versions recorded</span>
      </div>

      <div className="space-y-2">
        {history.map((ver) => {
          const isCurrent = ver.id === currentContractId;
          return (
            <div
              key={ver.id}
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between transition-all",
                isCurrent
                  ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                  {getStatusIcon(ver.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Version {ver.version}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 text-[9px] font-mono uppercase rounded border",
                        getStatusBadge(ver.status)
                      )}
                    >
                      {ver.status}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500/20 text-indigo-300 rounded font-medium">
                        Current View
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {ver.total_requirements} skills ({ver.required_skills_count} req,{" "}
                    {ver.critical_skills_count} crit) • Created {formatDate(ver.created_at)}
                  </div>
                </div>
              </div>

              {!isCurrent && (
                <Link
                  href={`/employer/contracts/${ver.id}`}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors"
                >
                  Inspect <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

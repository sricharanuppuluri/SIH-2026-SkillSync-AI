"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Archive,
  FileEdit,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { SkillContractSummary } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface SkillContractCardProps {
  contract: SkillContractSummary;
}

export function SkillContractCard({ contract }: SkillContractCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "ARCHIVED":
        return {
          icon: <Archive className="w-3.5 h-3.5 text-slate-500" />,
          classes: "bg-slate-800 text-slate-400 border-slate-700",
        };
      default:
        return {
          icon: <FileEdit className="w-3.5 h-3.5 text-amber-400" />,
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
    }
  };

  const badgeInfo = getStatusBadge(contract.status);

  return (
    <div className="p-5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/5 group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider",
                badgeInfo.classes
              )}
            >
              {badgeInfo.icon}
              {contract.status}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              v{contract.version}
            </span>
          </div>

          <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {contract.title || contract.job_title || "Requisition Skill Contract"}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            <span>Job: {contract.job_title || contract.job_id}</span>
          </div>
        </div>

        <Link
          href={`/employer/contracts/${contract.id}`}
          className="p-2 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition-all shadow"
          title="Open Contract Details"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-center">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Skills</div>
          <div className="text-sm font-bold text-white mt-0.5">{contract.total_requirements}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Required</div>
          <div className="text-sm font-bold text-indigo-400 mt-0.5">
            {contract.required_skills_count}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Critical</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5">
            {contract.critical_skills_count}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
        <span>Updated: {formatDate(contract.updated_at || contract.created_at)}</span>
        <Link
          href={`/employer/contracts/${contract.id}`}
          className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
        >
          Manage Contract <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

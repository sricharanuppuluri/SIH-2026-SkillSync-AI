"use client";

import * as React from "react";
import { Trash2, Award, BookOpen, Clock, FileText } from "lucide-react";
import { ContractRequirementItem } from "./ContractSkillSelector";
import { cn } from "@/lib/utils";

interface ContractRequirementsTableProps {
  requirements: ContractRequirementItem[];
  onRemoveRequirement?: (skillId: string) => void;
  isEditable?: boolean;
}

export function ContractRequirementsTable({
  requirements,
  onRemoveRequirement,
  isEditable = false,
}: ContractRequirementsTableProps) {
  if (requirements.length === 0) {
    return (
      <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-medium">No skill requirements added yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Search and select canonical skills above to define this contract.
        </p>
      </div>
    );
  }

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "CRITICAL":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getEvidenceBadge = (ev: string) => {
    switch (ev) {
      case "VERIFIED_SKILL":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            <Award className="w-3 h-3" /> Passport Verified
          </span>
        );
      case "COURSE_COMPLETION":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
            <BookOpen className="w-3 h-3" /> Course Certificate
          </span>
        );
      case "CERTIFICATION":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">
            <Award className="w-3 h-3" /> Certification
          </span>
        );
      case "NONE":
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 font-medium">
            Self-Reported
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 font-medium">
            {ev}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="py-3 px-4">Canonical Skill</th>
            <th className="py-3 px-3">Type</th>
            <th className="py-3 px-3">Proficiency</th>
            <th className="py-3 px-3">Importance</th>
            <th className="py-3 px-3">Evidence Required</th>
            <th className="py-3 px-3">Min Exp</th>
            <th className="py-3 px-4">Criteria / Notes</th>
            {isEditable && <th className="py-3 px-3 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {requirements.map((req) => (
            <tr key={req.skill_id} className="hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 font-medium text-white">
                <div>{req.skill_name}</div>
                {req.category && (
                  <div className="text-[10px] text-slate-500">{req.category}</div>
                )}
              </td>
              <td className="py-3 px-3">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium border",
                    req.requirement_type === "REQUIRED"
                      ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  )}
                >
                  {req.requirement_type}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono">
                  {req.required_proficiency || "INTERMEDIATE"}
                </span>
              </td>
              <td className="py-3 px-3">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium border",
                    getImportanceBadge(req.importance || "MEDIUM")
                  )}
                >
                  {req.importance || "MEDIUM"}
                </span>
              </td>
              <td className="py-3 px-3">{getEvidenceBadge(req.evidence_type || "NONE")}</td>
              <td className="py-3 px-3 text-slate-300">
                {req.minimum_experience_months && req.minimum_experience_months > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {req.minimum_experience_months} mos
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                {req.notes || <span className="text-slate-600 italic">None</span>}
              </td>
              {isEditable && (
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveRequirement?.(req.skill_id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove requirement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

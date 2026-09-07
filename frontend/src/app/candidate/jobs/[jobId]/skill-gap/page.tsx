"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RefreshCw,
  Plus,
  Sliders,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { candidateAPI } from "@/lib/candidateApi";
import { SkillGapReport, SkillGapItem, SkillGapStatus } from "@/types/skillGap";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SkillGapPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | SkillGapStatus>("ALL");

  const loadSkillGapReport = useCallback(async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await candidateAPI.getJobSkillGap(jobId);
      setReport(data);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to calculate skill gap report";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadSkillGapReport();
  }, [loadSkillGapReport]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <LoadingState message="Analyzing candidate competencies against job requirements..." />
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes("not found");
    const isForbidden = error.toLowerCase().includes("403") || error.toLowerCase().includes("forbidden");

    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-red-500/20 bg-red-950/10 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
          {isForbidden ? <ShieldAlert className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>
        <h2 className="text-xl font-bold text-white">
          {isNotFound ? "Job Requisition Not Found" : isForbidden ? "Access Restricted" : "Skill Gap Analysis Error"}
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Jobs
          </Button>
          {!isNotFound && !isForbidden && (
            <Button variant="primary" onClick={loadSkillGapReport}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Retry Analysis
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { job_title, employer_name, skill_alignment_score, summary, gaps } = report;

  // Filter gaps based on active tab
  const filteredGaps = gaps.filter((gap) => {
    if (statusFilter === "ALL") return true;
    return gap.status === statusFilter;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";
    if (score >= 50) return "text-amber-400 border-amber-500/30 bg-amber-950/20";
    return "text-rose-400 border-rose-500/30 bg-rose-950/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Skill Alignment";
    if (score >= 50) return "Moderate Skill Alignment";
    return "Significant Skill Gap";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Job Listings
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{job_title}</h1>
            <Badge variant="indigo">Skill Gap Analysis</Badge>
          </div>
          {employer_name && (
            <p className="text-sm text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              {employer_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/candidate/skills">
            <Button variant="secondary" size="sm" className="text-xs">
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Manage My Skills
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={loadSkillGapReport} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hero Score & Alignment Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alignment Score Card */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Skill Alignment Score
          </span>

          <div
            className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center shadow-lg my-2 ${getScoreColor(
              skill_alignment_score
            )}`}
          >
            <span className="text-3xl font-extrabold font-mono tracking-tight">
              {skill_alignment_score}%
            </span>
            <span className="text-[10px] font-medium opacity-80 uppercase">Match</span>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold text-slate-200">
              {getScoreLabel(skill_alignment_score)}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Deterministic comparison of your verified competencies against {summary.total_required_skills} required skills.
            </p>
          </div>
        </div>

        {/* Summary Breakdown Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Matched Skills Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Matched Skills</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-white font-mono">{summary.matched_skills}</div>
              <p className="text-xs text-emerald-400/90 font-medium mt-1">
                Proficiency meets or exceeds job requirement
              </p>
            </div>
          </div>

          {/* Partial Skills Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Partial Skills</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-white font-mono">{summary.partial_skills}</div>
              <p className="text-xs text-amber-400/90 font-medium mt-1">
                Possessed at lower proficiency level
              </p>
            </div>
          </div>

          {/* Missing Skills Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Missing Skills</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-white font-mono">{summary.missing_skills}</div>
              <p className="text-xs text-rose-400/90 font-medium mt-1">
                Not currently listed on your profile
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="space-y-4">
        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Requirements ({summary.total_required_skills})
            </button>
            <button
              onClick={() => setStatusFilter("MATCHED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === "MATCHED"
                  ? "bg-emerald-600/90 text-white shadow-sm"
                  : "text-slate-400 hover:text-emerald-400"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Matched ({summary.matched_skills})
            </button>
            <button
              onClick={() => setStatusFilter("PARTIAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === "PARTIAL"
                  ? "bg-amber-600/90 text-white shadow-sm"
                  : "text-slate-400 hover:text-amber-400"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Partial ({summary.partial_skills})
            </button>
            <button
              onClick={() => setStatusFilter("MISSING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === "MISSING"
                  ? "bg-rose-600/90 text-white shadow-sm"
                  : "text-slate-400 hover:text-rose-400"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Missing ({summary.missing_skills})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Showing {filteredGaps.length} of {summary.total_required_skills} competencies
          </span>
        </div>

        {/* Empty State when job has 0 requirements */}
        {summary.total_required_skills === 0 && (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-900/20">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Explicit Skill Requirements</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              This employer has not attached specific canonical skill requirements to this job posting.
            </p>
            <Link href="/jobs">
              <Button variant="secondary" size="sm" className="mt-2 text-xs">
                Browse Other Jobs
              </Button>
            </Link>
          </div>
        )}

        {/* Empty State for filtered tab */}
        {summary.total_required_skills > 0 && filteredGaps.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-900/20">
            <p className="text-xs text-slate-400">
              No skills found in the <strong>{statusFilter}</strong> category.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("ALL")} className="text-xs text-indigo-400">
              View All Requirements
            </Button>
          </div>
        )}

        {/* Itemized Skill Cards */}
        {filteredGaps.length > 0 && (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredGaps.map((item: SkillGapItem) => {
              const isMatched = item.status === "MATCHED";
              const isPartial = item.status === "PARTIAL";
              const isMissing = item.status === "MISSING";

              return (
                <div
                  key={item.skill_id}
                  className={`p-4.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isMatched
                      ? "border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40"
                      : isPartial
                      ? "border-amber-500/20 bg-amber-950/5 hover:border-amber-500/40"
                      : "border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40"
                  }`}
                >
                  {/* Left Column: Skill Name, Taxonomy, Explanation */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.skill_name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {item.skill_type}
                      </Badge>

                      {/* Status Badge */}
                      {isMatched && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> MATCHED
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> PARTIAL
                        </span>
                      )}
                      {isMissing && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> MISSING
                        </span>
                      )}

                      {/* Severity Badge */}
                      {item.severity && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.severity === "HIGH"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {item.severity} Severity
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Right Column: Proficiency Comparisons & Action */}
                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                    <div className="text-right space-y-0.5">
                      <div className="text-[11px] text-slate-400">
                        Required:{" "}
                        <span className="font-semibold text-indigo-300 font-mono">
                          {item.required_proficiency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Current:{" "}
                        <span
                          className={`font-semibold font-mono ${
                            isMatched
                              ? "text-emerald-400"
                              : isPartial
                              ? "text-amber-400"
                              : "text-slate-500"
                          }`}
                        >
                          {item.candidate_proficiency || "Not Possessed"}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <div>
                      {isMissing || isPartial ? (
                        <Link href="/candidate/skills">
                          <Button variant="secondary" size="sm" className="text-xs h-8 px-2.5">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {isMissing ? "Add Skill" : "Upgrade"}
                          </Button>
                        </Link>
                      ) : (
                        <span className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400 inline-block">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer CTA Banner */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-semibold text-white">Looking to bridge skill gaps?</h4>
          <p className="text-xs text-slate-400">
            Extract skills from your resume with AI or manage your verified catalog.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/tools/skill-extractor">
            <Button variant="primary" size="sm" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Extractor
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="secondary" size="sm" className="text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Browse More Jobs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

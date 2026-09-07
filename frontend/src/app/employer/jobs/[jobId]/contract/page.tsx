"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileCheck,
  ArrowLeft,
  Plus,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { contractAPI, employerAPI } from "@/lib/api";
import { SkillContractResponse, SkillContractSummary } from "@/types";
import { Job } from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { ContractQualityBadge } from "@/components/contracts/ContractQualityBadge";
import { ContractRequirementsTable } from "@/components/contracts/ContractRequirementsTable";
import { ContractVersionTimeline } from "@/components/contracts/ContractVersionTimeline";
import { ContractQualityScore } from "@/types";

export default function JobContractPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = React.useState<Job | null>(null);
  const [activeContract, setActiveContract] = React.useState<SkillContractResponse | null>(null);
  const [quality, setQuality] = React.useState<ContractQualityScore | null>(null);
  const [history, setHistory] = React.useState<SkillContractSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const fetchJobContractData = React.useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const [jobData, historyData] = await Promise.all([
        employerAPI.getJob(jobId).catch(() => null),
        contractAPI.getJobContractHistory(jobId).catch(() => []),
      ]);
      setJob(jobData);
      setHistory(historyData);

      // Try get active contract
      try {
        const active = await contractAPI.getJobContract(jobId);
        setActiveContract(active);
        const q = await contractAPI.getQuality(active.id).catch(() => null);
        setQuality(q);
      } catch {
        // If 404, no active contract exists
        setActiveContract(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contract information for job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  React.useEffect(() => {
    fetchJobContractData();
  }, [fetchJobContractData]);

  const handleCreateContract = async () => {
    setCreating(true);
    setError(null);
    try {
      const draft = await contractAPI.createContract({
        job_id: jobId,
        title: job ? `${job.title} Competency Contract` : undefined,
        requirements: [],
      });
      router.push(`/employer/contracts/${draft.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create draft contract");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Loading job skill contract...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/employer/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Job Context Header */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Job Skill Contract Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {job ? job.title : `Job ${jobId}`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Requisition Status: <span className="text-slate-300 font-mono">{job?.status}</span> •{" "}
            Location: {job?.location_city || "Remote"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeContract ? (
            <Link
              href={`/employer/contracts/${activeContract.id}`}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              Manage Active Contract (v{activeContract.version})
            </Link>
          ) : (
            <Button
              onClick={handleCreateContract}
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5 px-4"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating..." : "Author Skill Contract"}
            </Button>
          )}
        </div>
      </div>

      {/* Active Contract Section */}
      {activeContract ? (
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
              <span className="text-xs font-mono text-slate-400">
                Version {activeContract.version}
              </span>
              <h2 className="text-base font-bold text-white">
                {activeContract.title || "Active Competency Contract"}
              </h2>
            </div>

            {quality && <ContractQualityBadge quality={quality} />}
          </div>

          <ContractRequirementsTable
            requirements={activeContract.requirements.map((r) => ({
              skill_id: r.skill_id,
              skill_name: r.skill_name,
              category: r.skill_category,
              skill_type: r.skill_type,
              required_proficiency: r.required_proficiency,
              requirement_type: r.requirement_type,
              importance: r.importance,
              evidence_type: r.evidence_type,
              minimum_experience_months: r.minimum_experience_months,
              notes: r.notes,
            }))}
            isEditable={false}
          />
        </div>
      ) : (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Active Contract For This Job</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This job requisition is currently using legacy skill definitions. Create a versioned
            skill contract to enforce proficiency standards and verified evidence criteria.
          </p>
          <Button
            onClick={handleCreateContract}
            disabled={creating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs mt-2"
          >
            Create Skill Contract
          </Button>
        </div>
      )}

      {/* Version History */}
      {history.length > 0 && (
        <ContractVersionTimeline history={history} currentContractId={activeContract?.id} />
      )}
    </div>
  );
}

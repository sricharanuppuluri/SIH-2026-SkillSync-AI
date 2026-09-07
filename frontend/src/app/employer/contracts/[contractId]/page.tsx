"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileCheck,
  ArrowLeft,
  Save,
  CheckCircle2,
  Archive,
  Copy,
  AlertCircle,
  TrendingUp,
  History,
} from "lucide-react";
import { contractAPI } from "@/lib/api";
import {
  ContractInsightsResponse,
  ContractQualityScore,
  SkillContractResponse,
  SkillContractSummary,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { ContractQualityBadge } from "@/components/contracts/ContractQualityBadge";
import {
  ContractRequirementItem,
  ContractSkillSelector,
} from "@/components/contracts/ContractSkillSelector";
import { ContractRequirementsTable } from "@/components/contracts/ContractRequirementsTable";
import { ContractInsightsPanel } from "@/components/contracts/ContractInsightsPanel";
import { ContractVersionTimeline } from "@/components/contracts/ContractVersionTimeline";
import { formatDate } from "@/lib/utils";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;

  const [contract, setContract] = React.useState<SkillContractResponse | null>(null);
  const [quality, setQuality] = React.useState<ContractQualityScore | null>(null);
  const [insights, setInsights] = React.useState<ContractInsightsResponse | null>(null);
  const [history, setHistory] = React.useState<SkillContractSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<"requirements" | "insights" | "history">(
    "requirements"
  );

  // Form state for draft editing
  const [title, setTitle] = React.useState("");
  const [requirements, setRequirements] = React.useState<ContractRequirementItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [activating, setActivating] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [forking, setForking] = React.useState(false);

  const loadContractDetails = React.useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contractAPI.getContract(contractId);
      setContract(data);
      setTitle(data.title || "");
      setRequirements(
        data.requirements.map((r) => ({
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
        }))
      );

      // Load Quality & History
      const [qData, hData] = await Promise.all([
        contractAPI.getQuality(contractId).catch(() => null),
        contractAPI.getJobContractHistory(data.job_id).catch(() => []),
      ]);
      setQuality(qData);
      setHistory(hData);

      // If active or has requirements, try load insights
      if (data.requirements.length > 0) {
        contractAPI.getInsights(contractId).then(setInsights).catch(() => null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  React.useEffect(() => {
    loadContractDetails();
  }, [loadContractDetails]);

  const handleAddRequirement = (item: ContractRequirementItem) => {
    setRequirements((prev) => [...prev, item]);
    setActionSuccess(null);
  };

  const handleRemoveRequirement = (skillId: string) => {
    setRequirements((prev) => prev.filter((r) => r.skill_id !== skillId));
    setActionSuccess(null);
  };

  const handleSaveDraft = async () => {
    if (!contract || contract.status !== "DRAFT") return;
    setSaving(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await contractAPI.updateContract(contract.id, {
        title: title.trim() || null,
        requirements: requirements.map((r) => ({
          skill_id: r.skill_id,
          required_proficiency: r.required_proficiency,
          requirement_type: r.requirement_type,
          importance: r.importance,
          minimum_experience_months: r.minimum_experience_months,
          evidence_type: r.evidence_type,
          notes: r.notes,
        })),
      });
      setContract(updated);
      setActionSuccess("Draft saved successfully.");
      // Refresh quality score & insights
      const [qData, insData] = await Promise.all([
        contractAPI.getQuality(contract.id).catch(() => null),
        contractAPI.getInsights(contract.id).catch(() => null),
      ]);
      setQuality(qData);
      setInsights(insData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save draft changes");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!contract || contract.status !== "DRAFT") return;
    if (requirements.length === 0) {
      setError("Cannot activate contract with zero requirements. Add at least one skill.");
      return;
    }
    setActivating(true);
    setError(null);
    setActionSuccess(null);
    try {
      // First save if any pending changes
      await contractAPI.updateContract(contract.id, {
        title: title.trim() || null,
        requirements: requirements.map((r) => ({
          skill_id: r.skill_id,
          required_proficiency: r.required_proficiency,
          requirement_type: r.requirement_type,
          importance: r.importance,
          minimum_experience_months: r.minimum_experience_months,
          evidence_type: r.evidence_type,
          notes: r.notes,
        })),
      });

      const activated = await contractAPI.activateContract(contract.id);
      setContract(activated);
      setActionSuccess("Contract activated! Previous active versions have been archived.");
      loadContractDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to activate contract");
    } finally {
      setActivating(false);
    }
  };

  const handleArchive = async () => {
    if (!contract || contract.status !== "ACTIVE") return;
    setArchiving(true);
    setError(null);
    try {
      const archived = await contractAPI.archiveContract(contract.id);
      setContract(archived);
      setActionSuccess("Contract archived successfully.");
      loadContractDetails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to archive contract");
    } finally {
      setArchiving(false);
    }
  };

  const handleForkVersion = async () => {
    if (!contract) return;
    setForking(true);
    setError(null);
    try {
      const forked = await contractAPI.createVersion(contract.id);
      setActionSuccess(`New Draft Version ${forked.version} created!`);
      router.push(`/employer/contracts/${forked.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fork new version");
      setForking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Loading skill contract governance details...
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/employer/contracts"
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Contracts
        </Link>
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const isDraft = contract.status === "DRAFT";
  const isActive = contract.status === "ACTIVE";
  const isArchived = contract.status === "ARCHIVED";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/employer/contracts"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contracts</span>
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isDraft && (
            <>
              <Button
                onClick={handleSaveDraft}
                disabled={saving || activating}
                variant="outline"
                className="border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={handleActivate}
                disabled={saving || activating || requirements.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5 px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activating ? "Activating..." : "Activate Contract"}
              </Button>
            </>
          )}

          {isActive && (
            <>
              <Button
                onClick={handleArchive}
                disabled={archiving || forking}
                variant="outline"
                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                {archiving ? "Archiving..." : "Archive Contract"}
              </Button>
              <Button
                onClick={handleForkVersion}
                disabled={forking}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5 px-4"
              >
                <Copy className="w-3.5 h-3.5" />
                {forking ? "Forking..." : "Fork New Version"}
              </Button>
            </>
          )}

          {isArchived && (
            <Button
              onClick={handleForkVersion}
              disabled={forking}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5 px-4"
            >
              <Copy className="w-3.5 h-3.5" />
              {forking ? "Forking..." : "Fork New Version from Archive"}
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Governance Header Card */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : isArchived
                    ? "bg-slate-800 text-slate-400 border-slate-700"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}
              >
                {contract.status}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                Version {contract.version}
              </span>
            </div>

            {isDraft ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contract Title..."
                className="text-xl md:text-2xl font-bold text-white bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
              />
            ) : (
              <h1 className="text-xl md:text-2xl font-bold text-white">
                {contract.title || contract.job_title || "Requisition Skill Contract"}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                Job Requisition:{" "}
                <Link
                  href={`/employer/jobs`}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {contract.job_title || contract.job_id}
                </Link>
              </span>
              <span>•</span>
              <span>Created {formatDate(contract.created_at)}</span>
              {contract.effective_at && (
                <>
                  <span>•</span>
                  <span>Effective {formatDate(contract.effective_at)}</span>
                </>
              )}
            </div>
          </div>

          {quality && <ContractQualityBadge quality={quality} showExplanation={false} />}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("requirements")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "requirements"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Skill Requirements ({requirements.length})
        </button>

        <button
          onClick={() => setActiveTab("insights")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "insights"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Market Insights & Supply Intelligence
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          Version Lineage ({history.length})
        </button>
      </div>

      {/* Tab 1: Requirements Management */}
      {activeTab === "requirements" && (
        <div className="space-y-6">
          {isDraft && (
            <ContractSkillSelector
              existingRequirements={requirements}
              onAddRequirement={handleAddRequirement}
              disabled={saving || activating}
            />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Defined Contract Requirements ({requirements.length})
              </h2>
              {isDraft && (
                <span className="text-[11px] text-amber-400">
                  Editing Draft — Remember to Save or Activate
                </span>
              )}
            </div>

            <ContractRequirementsTable
              requirements={requirements}
              onRemoveRequirement={handleRemoveRequirement}
              isEditable={isDraft}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Market Insights & Intelligence */}
      {activeTab === "insights" && (
        <div>
          {insights ? (
            <ContractInsightsPanel insights={insights} />
          ) : (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No requirements added yet to generate market supply & demand insights.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Version Lineage */}
      {activeTab === "history" && (
        <div>
          <ContractVersionTimeline history={history} currentContractId={contract.id} />
        </div>
      )}
    </div>
  );
}

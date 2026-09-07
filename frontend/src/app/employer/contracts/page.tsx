"use client";

import * as React from "react";
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Briefcase,
  Layers,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { contractAPI, employerAPI } from "@/lib/api";
import { SkillContractSummary } from "@/types";
import { Job } from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { SkillContractCard } from "@/components/contracts/SkillContractCard";

export default function EmployerContractsPage() {
  const [contracts, setContracts] = React.useState<SkillContractSummary[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [contractTitle, setContractTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contractsData, jobsData] = await Promise.all([
        contractAPI.listContracts(),
        employerAPI.getJobs().catch(() => [] as Job[]),
      ]);
      setContracts(contractsData);
      setJobs(jobsData);
      if (jobsData.length > 0) {
        setSelectedJobId(jobsData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load skill contracts");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await contractAPI.createContract({
        job_id: selectedJobId,
        title: contractTitle.trim() || undefined,
        requirements: [],
      });
      setShowCreateModal(false);
      setContractTitle("");
      // Redirect to the newly created contract editor
      window.location.href = `/employer/contracts/${res.id}`;
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create contract draft");
      setCreating(false);
    }
  };

  const filteredContracts = React.useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.job_title && c.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.job_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const activeContractsCount = React.useMemo(
    () => contracts.filter((c) => c.status === "ACTIVE").length,
    [contracts]
  );
  const draftContractsCount = React.useMemo(
    () => contracts.filter((c) => c.status === "DRAFT").length,
    [contracts]
  );
  const totalGovernedSkills = React.useMemo(
    () => contracts.reduce((acc, curr) => acc + (curr.total_requirements || 0), 0),
    [contracts]
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Phase 16 Competency Exchange
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Employer Skill Contracts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Versioned, machine-readable skill requirement contracts governing job competency
            profiles and verified evidence standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 text-xs px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            New Skill Contract
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Contracts</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{activeContractsCount}</div>
          <div className="text-xs text-slate-500 mt-1">
            Requisitions actively verified & matched
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Draft Contracts</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">{draftContractsCount}</div>
          <div className="text-xs text-slate-500 mt-1">In design / authoring state</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Governed Skills</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white">{totalGovernedSkills}</div>
          <div className="text-xs text-slate-500 mt-1">
            Canonical requirements mapped across contracts
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search contracts or jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">Status:</span>
          <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {["ALL", "ACTIVE", "DRAFT", "ARCHIVED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contract Listing */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading employer skill contracts...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Skill Contracts Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm || statusFilter !== "ALL"
              ? "No skill contracts match your active filter criteria."
              : "Create structured skill requirement contracts for your open jobs to enforce evidence criteria and verified candidate matching."}
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs mt-2"
          >
            Create Your First Contract
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContracts.map((contract) => (
            <SkillContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Create New Skill Contract</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Initialize a machine-readable skill contract draft for an existing job posting. You
              can configure granular canonical proficiency and evidence requirements next.
            </p>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Job Requisition *
                </label>
                {jobs.length === 0 ? (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-amber-400">
                    No active job requisitions found. Please create a job first.
                  </div>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.location_city || "Remote"}, {j.employment_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contract Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Core Competencies v1"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || jobs.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
                >
                  {creating ? "Creating..." : "Initialize Draft Contract"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

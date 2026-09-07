"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Share2,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  FileCheck,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  Check,
} from "lucide-react";
import { passportAPI } from "@/lib/passportApi";
import { skillsAPI } from "@/lib/api";
import {
  CandidatePassportResponse,
  EvidenceType,
  SkillCatalogItem,
  VerifiedSkillItem,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function CandidatePassportPage() {
  const [passport, setPassport] = useState<CandidatePassportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters and Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED" | "EXPIRED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Share controls
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add Evidence Modal
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [catalogSkills, setCatalogSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("CERTIFICATION");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceIssuer, setEvidenceIssuer] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const loadPassport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await passportAPI.getPassport();
      setPassport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load Verified Skill Passport");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassport();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      const data = await passportAPI.recalculatePassport();
      setPassport(data);
      setSuccessMsg("Skill Passport verification status re-evaluated successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to recalculate verification");
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggleShare = async () => {
    if (!passport) return;
    setShareLoading(true);
    try {
      const updated = await passportAPI.toggleShare(!passport.is_share_enabled);
      setPassport((prev) =>
        prev
          ? {
              ...prev,
              is_share_enabled: updated.is_enabled,
              share_token: updated.share_token,
            }
          : null
      );
      setSuccessMsg(
        updated.is_enabled
          ? "Public passport link enabled."
          : "Public passport sharing disabled."
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update sharing settings");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!passport?.share_token) return;
    const shareUrl = `${window.location.origin}/passport/share/${passport.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenEvidenceModal = async () => {
    setIsEvidenceModalOpen(true);
    if (catalogSkills.length === 0) {
      try {
        const skills = await skillsAPI.catalog({ limit: 100 });
        setCatalogSkills(skills);
        if (skills.length > 0) setSelectedSkillId(skills[0].id);
      } catch (err) {
        console.error("Could not load skills taxonomy", err);
      }
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !evidenceTitle.trim()) return;

    setSubmittingEvidence(true);
    try {
      await passportAPI.createEvidence({
        skill_id: selectedSkillId,
        evidence_type: evidenceType,
        title: evidenceTitle.trim(),
        description: evidenceDesc.trim() || undefined,
        evidence_url: evidenceUrl.trim() || undefined,
        meta: evidenceIssuer.trim() ? { issuer: evidenceIssuer.trim() } : undefined,
      });
      setIsEvidenceModalOpen(false);
      setEvidenceTitle("");
      setEvidenceDesc("");
      setEvidenceUrl("");
      setEvidenceIssuer("");
      await loadPassport();
      setSuccessMsg("Evidence added and verified against passport rules.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add skill evidence");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm("Are you sure you want to remove this evidence record?")) return;
    try {
      await passportAPI.deleteEvidence(evidenceId);
      await loadPassport();
      setSuccessMsg("Evidence removed and verification status updated.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete evidence");
    }
  };

  if (loading) {
    return <LoadingState message="Loading Verified Skill Passport..." />;
  }

  if (error && !passport) {
    return (
      <ErrorState
        title="Passport Unavailable"
        message={error}
        onRetry={loadPassport}
      />
    );
  }

  const skillsList = passport?.skills || [];

  // Extract unique categories
  const categories = Array.from(new Set(skillsList.map((s) => s.category || "General")));

  // Filter skills
  const filteredSkills = skillsList.filter((item) => {
    const matchesSearch =
      item.skill_name.toLowerCase().includes(search.toLowerCase()) ||
      item.verification_summary.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "VERIFIED"
        ? item.status === "VERIFIED"
        : statusFilter === "UNVERIFIED"
        ? item.status === "UNVERIFIED"
        : item.status === "EXPIRED";

    const matchesCategory =
      categoryFilter === "ALL" ? true : item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 text-sm font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400 shadow-inner">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Verified Skill Passport
                </h1>
                <p className="text-slate-400 text-sm">
                  Authoritative, evidence-backed competency credentials for{" "}
                  <span className="text-indigo-300 font-semibold">
                    {passport?.candidate.full_name || "Candidate"}
                  </span>
                </p>
              </div>
            </div>
            {passport?.candidate.headline && (
              <p className="text-slate-300 text-sm italic pl-14">
                &ldquo;{passport.candidate.headline}&rdquo;
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="border-indigo-800/60 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/60 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? "animate-spin text-indigo-400" : ""}`} />
              {recalculating ? "Evaluating Evidence..." : "Recalculate Verification"}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenEvidenceModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              Add Certification Evidence
            </Button>
          </div>
        </div>

        {/* Public Share Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Public Shareable Passport
              </p>
              <p className="text-xs text-slate-400">
                {passport?.is_share_enabled
                  ? "Your passport is public and accessible via secure unguessable token."
                  : "Public link is currently disabled. Enable to share with recruiters."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleShare}
              disabled={shareLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                passport?.is_share_enabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {shareLoading
                ? "Updating..."
                : passport?.is_share_enabled
                ? "Sharing Active (Click to Revoke)"
                : "Enable Public Link"}
            </button>

            {passport?.is_share_enabled && passport.share_token && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShareLink}
                className="text-xs border-indigo-700 bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link Copied!" : "Copy Share Link"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Verified Skills */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-400">Verified Skills</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {passport?.stats.verified_skills || 0}
            </span>
            <span className="text-xs text-slate-400">
              of {passport?.stats.total_skills || 0} skills
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${passport?.stats.verification_coverage_pct || 0}%` }}
            />
          </div>
        </div>

        {/* Unverified / Self-Declared */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-400">Self-Declared / Unverified</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {passport?.stats.unverified_skills || 0}
            </span>
            <span className="text-xs text-slate-400">pending proof</span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Complete courses to verify competency
          </p>
        </div>

        {/* Total Evidence Items */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-400">Evidence Records</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {passport?.stats.total_evidence_items || 0}
            </span>
            <span className="text-xs text-slate-400">verifiable items</span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Courses, certs & declarations
          </p>
        </div>

        {/* Verification Coverage */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-cyan-400">Verification Rate</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {passport?.stats.verification_coverage_pct || 0}%
            </span>
            <span className="text-xs text-slate-400">coverage</span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Confidence score across catalog
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search verified skills, courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {(["ALL", "VERIFIED", "UNVERIFIED", "EXPIRED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              }`}
            >
              {st === "ALL"
                ? "All Skills"
                : st === "VERIFIED"
                ? `Verified (${passport?.stats.verified_skills || 0})`
                : st === "UNVERIFIED"
                ? `Unverified (${passport?.stats.unverified_skills || 0})`
                : "Expired"}
            </button>
          ))}

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  All Categories
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No matching skills in passport</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "Try resetting your search or filter options to see all skills."
              : "Enroll and complete training courses or attach self-declared skills to build your passport."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSkills.map((skill) => (
            <SkillPassportCard
              key={skill.skill_id}
              skill={skill}
              onDeleteEvidence={handleDeleteEvidence}
            />
          ))}
        </div>
      )}

      {/* Add Evidence Modal */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Add Verification Evidence</h3>
              </div>
              <button
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              {/* Select Canonical Skill */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Canonical Skill <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  required
                >
                  {catalogSkills.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name} ({sk.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Evidence Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Evidence Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="CERTIFICATION">External Certification</option>
                  <option value="ASSESSMENT">Skill Assessment / Code Test</option>
                  <option value="CANDIDATE_DECLARATION">Self-Declaration</option>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Credential / Certificate Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Issuer / Authority */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Issuing Organization / Authority
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Web Services, Google, Coursera"
                  value={evidenceIssuer}
                  onChange={(e) => setEvidenceIssuer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                />
              </div>

              {/* Verification URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Verification Link / Credential URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Description or Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or credential details..."
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEvidenceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingEvidence || !evidenceTitle.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submittingEvidence ? "Attaching..." : "Save Evidence"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Verified Skill Card Component
 */
function SkillPassportCard({
  skill,
  onDeleteEvidence,
}: {
  skill: VerifiedSkillItem;
  onDeleteEvidence: (id: string) => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);

  const isVerified = skill.status === "VERIFIED";
  const isExpired = skill.status === "EXPIRED";

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-6 flex flex-col justify-between space-y-4 shadow-lg ${
        isVerified
          ? "bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-950/20"
          : isExpired
          ? "bg-slate-900/80 border-amber-500/30 hover:border-amber-500/50"
          : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div>
        {/* Card Header: Skill Name & Verification Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {skill.skill_name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {skill.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Taxonomy Type: <span className="text-slate-300 font-medium">{skill.skill_type}</span>
            </p>
          </div>

          {/* Status Badge */}
          {isVerified ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>VERIFIED</span>
            </div>
          ) : isExpired ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>EXPIRED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>UNVERIFIED</span>
            </div>
          )}
        </div>

        {/* Explainable Verification Summary */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-400 block mb-1">
            Verification Basis:
          </span>
          {skill.verification_summary}
        </div>

        {/* Metadata Details */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Method:</span>
            <span className="text-indigo-300 font-medium">
              {skill.verification_method.replace(/_/g, " ")}
            </span>
          </span>

          {skill.verified_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(skill.verified_at).toLocaleDateString()}</span>
            </span>
          )}

          <span className="text-slate-500">
            {skill.evidence_count} evidence record{skill.evidence_count === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Accordion Toggle for Underlying Evidence */}
      <div className="pt-3 border-t border-slate-800/60">
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-between w-full"
        >
          <span>
            {showEvidence ? "Hide Supporting Evidence" : "Inspect Supporting Evidence"} (
            {skill.evidence_items.length})
          </span>
          <span className="text-slate-500">{showEvidence ? "▲" : "▼"}</span>
        </button>

        {/* Evidence List */}
        {showEvidence && (
          <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-800/40">
            {skill.evidence_items.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No formal evidence items attached. Skill is self-declared by candidate.
              </p>
            ) : (
              skill.evidence_items.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 font-semibold text-[10px]">
                        {ev.evidence_type.replace(/_/g, " ")}
                      </span>
                      <h4 className="font-semibold text-slate-200">{ev.title}</h4>
                    </div>
                    {ev.description && (
                      <p className="text-slate-400 text-[11px]">{ev.description}</p>
                    )}
                    {ev.evidence_url && (
                      <a
                        href={ev.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:underline text-[11px]"
                      >
                        Verify Credential URL <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Delete button for candidate-owned manual certs */}
                  {ev.evidence_type === "CERTIFICATION" && (
                    <button
                      onClick={() => onDeleteEvidence(ev.id)}
                      title="Remove evidence"
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

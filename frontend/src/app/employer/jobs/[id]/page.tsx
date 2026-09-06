"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Save,
  CheckCircle,
  XCircle,
  Trash2,
  Users,
  Calendar,
} from "lucide-react";
import { employerAPI } from "@/lib/api";
import {
  Job,
  EmploymentType,
  ExperienceLevel,
  JobUpdatePayload,
} from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkillSelector, SelectedSkillItem } from "@/components/employer/SkillSelector";
import { getJobStatusBadge } from "@/components/employer/EmployerDashboard";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("MID");
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkillItem[]>([]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employerAPI.getJob(jobId);
      setJob(data);
      setTitle(data.title);
      setDescription(data.description);
      setLocationCity(data.location_city || "");
      setLocationState(data.location_state || "");
      setIsRemote(data.is_remote);
      setEmploymentType(data.employment_type);
      setExperienceLevel(data.experience_level);
      setSalaryMin(data.salary_min !== null && data.salary_min !== undefined ? data.salary_min.toString() : "");
      setSalaryMax(data.salary_max !== null && data.salary_max !== undefined ? data.salary_max.toString() : "");

      // Map existing skills to SelectedSkillItem
      const mappedSkills: SelectedSkillItem[] = (data.skills || []).map((sk) => ({
        skill_id: sk.skill_id,
        skill_name: sk.skill_name || "Skill",
        category: sk.category || undefined,
        is_required: sk.is_required,
        minimum_proficiency: sk.minimum_proficiency,
        weight: sk.weight,
      }));
      setSelectedSkills(mappedSkills);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Job not found or access denied");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleSaveChanges = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload: JobUpdatePayload = {
      title: title.trim(),
      description: description.trim(),
      location_city: locationCity.trim() || undefined,
      location_state: locationState.trim() || undefined,
      is_remote: isRemote,
      employment_type: employmentType,
      experience_level: experienceLevel,
      salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
      salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
      skills: selectedSkills.map((s) => ({
        skill_id: s.skill_id,
        is_required: s.is_required,
        minimum_proficiency: s.minimum_proficiency,
        weight: s.weight,
      })),
    };

    try {
      const updated = await employerAPI.updateJob(jobId, payload);
      setJob(updated);
      setSuccessMessage("Job requisition updated successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const updated = await employerAPI.publishJob(jobId);
      setJob(updated);
      setSuccessMessage("Job published successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish job");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("Are you sure you want to close this job?")) return;
    setSaving(true);
    try {
      const updated = await employerAPI.closeJob(jobId);
      setJob(updated);
      setSuccessMessage("Job closed successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close job");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this requisition?")) return;
    setSaving(true);
    try {
      await employerAPI.deleteJob(jobId);
      router.push("/employer/jobs");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete job");
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading job requisition details..." className="py-20" />;
  }

  if (error && !job) {
    return (
      <ErrorState
        title="Requisition Unavailable"
        message={error}
        onRetry={fetchJob}
        className="my-10"
      />
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link href="/employer/jobs">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              {job.title}
            </h1>
            {getJobStatusBadge(job.status)}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 ml-10">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Created {new Date(job.created_at).toLocaleDateString()}
            </span>
            <Link
              href={`/employer/applications?job_id=${job.id}`}
              className="flex items-center gap-1 text-indigo-400 hover:underline"
            >
              <Users className="w-3.5 h-3.5" />
              {job.applications_count} Candidates Applied
            </Link>
          </div>
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex items-center gap-2">
          {job.status === "DRAFT" && (
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handlePublish}
              className="bg-emerald-600 hover:bg-emerald-500 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Publish Job
            </Button>
          )}

          {job.status === "PUBLISHED" && (
            <Button
              variant="outline"
              size="sm"
              loading={saving}
              onClick={handleClose}
              className="border-rose-900/50 text-rose-300 hover:bg-rose-950/30 text-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Close Job
            </Button>
          )}

          {job.status === "CLOSED" && (
            <Button
              variant="outline"
              size="sm"
              loading={saving}
              onClick={handlePublish}
              className="border-emerald-900/50 text-emerald-300 hover:bg-emerald-950/30 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Re-open
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            loading={saving}
            onClick={handleDelete}
            className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
            title="Delete Job"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Edit Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Job Configuration & Competency Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Job Description</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Grid: Employment Type, Experience Level, Remote Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ENTRY">Entry Level</option>
                <option value="MID">Mid Level</option>
                <option value="SENIOR">Senior</option>
                <option value="LEAD">Lead / Staff</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900"
                />
                <span className="text-xs text-slate-300">Remote eligible position</span>
              </label>
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">City</label>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">State</label>
              <input
                type="text"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Salary Min ($)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Salary Max ($)</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Skill Selector Component */}
          <div className="pt-4 border-t border-slate-800">
            <SkillSelector
              selectedSkills={selectedSkills}
              onChange={setSelectedSkills}
              disabled={saving}
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800">
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSaveChanges}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Requisition Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

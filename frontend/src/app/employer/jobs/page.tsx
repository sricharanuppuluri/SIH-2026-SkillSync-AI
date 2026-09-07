"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Users,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import { employerAPI } from "@/lib/api";
import { Job, JobStatus } from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getJobStatusBadge } from "@/components/employer/EmployerDashboard";

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter === "ALL" ? undefined : statusFilter;
      const data = await employerAPI.getJobs({
        status: filter,
        search: searchTerm.trim() || undefined,
      });
      setJobs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handlePublish = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await employerAPI.publishJob(jobId);
      await fetchJobs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to publish job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (jobId: string) => {
    if (!confirm("Are you sure you want to close this job? Candidates will no longer be able to apply.")) {
      return;
    }
    setActionLoading(jobId);
    try {
      await employerAPI.closeJob(jobId);
      await fetchJobs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to close job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job requisition? This action cannot be undone.")) {
      return;
    }
    setActionLoading(jobId);
    try {
      await employerAPI.deleteJob(jobId);
      await fetchJobs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Job Requisitions Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your organization&apos;s open, draft, and closed positions.
          </p>
        </div>
        <Link href="/employer/jobs/new">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Job Requisition
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by job title or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          {(["ALL", "PUBLISHED", "DRAFT", "CLOSED"] as (JobStatus | "ALL")[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Fetching your job requisitions..." className="py-20" />
      ) : error ? (
        <ErrorState title="Failed to Load Jobs" message={error} onRetry={fetchJobs} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job requisitions found"
          description={
            searchTerm || statusFilter !== "ALL"
              ? "No jobs match your current search and filter criteria."
              : "You haven't posted any job vacancies yet. Get started by creating your first requisition."
          }
          action={
            <Link href="/employer/jobs/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Job
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="bg-slate-900/70 border-slate-800 hover:border-slate-700/80 transition-colors"
            >
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Job Metadata */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/employer/jobs/${job.id}`}
                      className="text-sm font-semibold text-white hover:text-indigo-400 transition-colors"
                    >
                      {job.title}
                    </Link>
                    {getJobStatusBadge(job.status)}
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                      {(job.employment_type || "").replace("_", " ")}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                      {job.experience_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.is_remote
                        ? "Remote"
                        : job.location_city
                          ? `${job.location_city}${job.location_state ? `, ${job.location_state}` : ""}`
                          : "Location unspecified"}
                    </span>

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>

                    <Link
                      href={`/employer/applications?job_id=${job.id}`}
                      className="flex items-center gap-1 text-indigo-400 hover:underline"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {job.applications_count} {job.applications_count === 1 ? "applicant" : "applicants"}
                    </Link>
                  </div>

                  {/* Skills tags preview */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {job.skills.slice(0, 5).map((sk) => (
                        <span
                          key={sk.id || sk.skill_id}
                          className="text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded"
                        >
                          {sk.skill_name || "Skill"}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="text-[10px] text-slate-500">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <Link href={`/employer/jobs/${job.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </Link>

                  <Link href={`/employer/jobs/${job.id}/contract`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30">
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Contract
                    </Button>
                  </Link>

                  {job.status === "DRAFT" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => handlePublish(job.id)}
                      loading={actionLoading === job.id}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Publish
                    </Button>
                  )}

                  {job.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-rose-300 hover:text-rose-200 border-rose-900/50 hover:bg-rose-950/30"
                      onClick={() => handleClose(job.id)}
                      loading={actionLoading === job.id}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Close
                    </Button>
                  )}

                  {job.status === "CLOSED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-emerald-300 hover:text-emerald-200 border-emerald-900/50 hover:bg-emerald-950/30"
                      onClick={() => handlePublish(job.id)}
                      loading={actionLoading === job.id}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Re-open
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400"
                    onClick={() => handleDelete(job.id)}
                    loading={actionLoading === job.id}
                    title="Delete requisition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

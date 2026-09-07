"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Briefcase,
  Calendar,
  Mail,
  Award,
  MapPin,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { employerAPI } from "@/lib/api";
import {
  EmployerApplication,
  ApplicationStatus,
  Job,
} from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApplicationStatusBadge } from "@/components/employer/EmployerDashboard";

const ALL_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
];

export default function EmployerApplicationsPage() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || "";

  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load jobs list for filter dropdown
  useEffect(() => {
    async function loadJobsList() {
      try {
        const jobsList = await employerAPI.getJobs();
        setJobs(jobsList);
      } catch {
        // Soft fail for dropdown options
      }
    }
    loadJobsList();
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employerAPI.getApplications({
        jobId: selectedJobId || undefined,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
      });
      setApplications(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load candidate applications");
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, selectedStatus]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    setUpdatingId(appId);
    setFeedback(null);
    try {
      await employerAPI.updateApplicationStatus(appId, newStatus);
      setFeedback(`Status updated to ${newStatus}`);
      setTimeout(() => setFeedback(null), 3000);
      await fetchApplications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update application status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Candidate Applications & Talent Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review applicant profiles, evaluate competency fit, and advance hiring stages.
          </p>
        </div>

        <Link href="/employer/jobs">
          <Button variant="outline" size="sm">
            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            Manage Jobs
          </Button>
        </Link>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">Filter Job:</span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            <option value="">All Job Requisitions</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <span className="text-xs text-slate-400 mr-1">Status:</span>
          <button
            onClick={() => setSelectedStatus("ALL")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              selectedStatus === "ALL"
                ? "bg-indigo-600 text-white font-medium shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {ALL_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                selectedStatus === st
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Fetching candidate applications..." className="py-20" />
      ) : error ? (
        <ErrorState title="Failed to Load Applications" message={error} onRetry={fetchApplications} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidate applications found"
          description={
            selectedJobId || selectedStatus !== "ALL"
              ? "No candidate applications match the selected job or status filter."
              : "No candidates have applied to your job postings yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {applications.map((app) => (
            <Card
              key={app.id}
              className="bg-slate-900/70 border-slate-800 hover:border-slate-700/80 transition-colors"
            >
              <CardContent className="p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Candidate Info */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">
                      {app.candidate.full_name}
                    </h3>
                    {getApplicationStatusBadge(app.status)}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {app.candidate.email}
                    </span>
                  </div>

                  {app.candidate.headline && (
                    <p className="text-xs text-indigo-300 font-medium">
                      {app.candidate.headline}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      Position:{" "}
                      <Link
                        href={`/employer/jobs/${app.job_id}`}
                        className="text-slate-200 font-medium hover:underline ml-1"
                      >
                        {app.job_title}
                      </Link>
                    </span>

                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      {app.candidate.experience_years} years experience
                    </span>

                    {(app.candidate.location_city || app.candidate.location_state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {[app.candidate.location_city, app.candidate.location_state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Cover Note */}
                  {app.cover_note && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                        Candidate Note:
                      </span>
                      {app.cover_note}
                    </div>
                  )}
                </div>

                {/* Status Advancement Controls */}
                <div className="flex flex-col items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                    Update Pipeline Stage
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <select
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) =>
                        handleStatusChange(app.id, e.target.value as ApplicationStatus)
                      }
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {/* Quick advance shortcut */}
                    {app.status === "APPLIED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30"
                        loading={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "SHORTLISTED")}
                      >
                        Shortlist
                      </Button>
                    )}

                    {app.status === "SHORTLISTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] border-purple-500/40 text-purple-300 hover:bg-purple-950/30"
                        loading={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "INTERVIEW")}
                      >
                        Schedule Interview
                      </Button>
                    )}

                    {app.status === "INTERVIEW" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
                        loading={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "OFFERED")}
                      >
                        Make Offer
                      </Button>
                    )}

                    {app.status === "OFFERED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30"
                        loading={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "HIRED")}
                      >
                        Mark Hired
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

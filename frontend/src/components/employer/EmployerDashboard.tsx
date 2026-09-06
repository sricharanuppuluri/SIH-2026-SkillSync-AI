"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  CheckCircle2,
  FileText,
  XCircle,
  PlusCircle,
  Building2,
  ChevronRight,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { employerAPI } from "@/lib/api";
import { EmployerDashboardData, JobStatus, ApplicationStatus } from "@/types/employer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export function getJobStatusBadge(status: JobStatus) {
  switch (status) {
    case "PUBLISHED":
      return <Badge variant="success">Published</Badge>;
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "CLOSED":
      return <Badge variant="destructive">Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function getApplicationStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case "APPLIED":
      return <Badge variant="default">Applied</Badge>;
    case "SHORTLISTED":
      return <Badge variant="indigo">Shortlisted</Badge>;
    case "INTERVIEW":
      return <Badge variant="purple">Interview</Badge>;
    case "OFFERED":
      return <Badge variant="warning">Offered</Badge>;
    case "HIRED":
      return <Badge variant="success">Hired</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function EmployerDashboard() {
  const [data, setData] = useState<EmployerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerAPI.getDashboard();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load employer dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <LoadingState message="Loading employer metrics and requisitions..." className="py-20" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Employer Dashboard Error"
        message={error}
        onRetry={fetchDashboard}
        className="my-8"
      />
    );
  }

  if (!data) return null;

  const { metrics, recent_jobs, recent_applications } = data;

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Employer Operations Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time vacancy pipeline, candidate submissions, and role competency management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/employer/jobs/new">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Job Requisition
            </Button>
          </Link>
          <Link href="/employer/profile">
            <Button variant="outline" size="sm">
              Company Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Jobs
              </p>
              <h3 className="text-2xl font-bold text-white mt-1">{metrics.total_jobs}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-emerald-950/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Active / Published
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics.published_jobs}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
                Draft Jobs
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{metrics.draft_jobs}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                Closed Jobs
              </p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">{metrics.closed_jobs}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-indigo-950/40 col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">
                Applications
              </p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                {metrics.total_applications}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status Breakdown */}
      {metrics.total_applications > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
              Application Funnel Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"].map(
                (status) => (
                  <div
                    key={status}
                    className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 flex flex-col"
                  >
                    <span className="text-[10px] text-slate-500 uppercase">{status}</span>
                    <span className="text-lg font-bold text-slate-200 mt-0.5">
                      {metrics.applications_by_status[status] || 0}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Recent Jobs & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Recent Job Requisitions
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Active and draft postings</p>
            </div>
            <Link href="/employer/jobs">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recent_jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No job requisitions created"
                description="Create your first vacancy to start receiving qualified applicants."
                action={
                  <Link href="/employer/jobs/new">
                    <Button variant="primary" size="sm">
                      Create First Job
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recent_jobs.map((job) => (
                  <div
                    key={job.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/employer/jobs/${job.id}`}
                        className="text-xs font-semibold text-slate-200 hover:text-indigo-400 truncate block transition-colors"
                      >
                        {job.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{job.location_city || "Remote"}</span>
                        <span>•</span>
                        <span>{job.skills_count} skills</span>
                        <span>•</span>
                        <span className="text-indigo-400">
                          {job.applications_count} applicants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getJobStatusBadge(job.status)}
                      <Link href={`/employer/jobs/${job.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Recent Applications
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Incoming candidate submissions</p>
            </div>
            <Link href="/employer/applications">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recent_applications.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No applications yet"
                description="Once candidates discover your published jobs, their applications will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recent_applications.map((app) => (
                  <div
                    key={app.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {app.candidate_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Applied for <span className="text-slate-300 font-medium">{app.job_title}</span>
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(app.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getApplicationStatusBadge(app.status)}
                      <Link href={`/employer/applications?job_id=${app.job_id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/employer/jobs"
          className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/50 transition-colors group"
        >
          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
            Manage All Jobs
            <ChevronRight className="w-3.5 h-3.5" />
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Publish, edit, or close existing vacancy requisitions.
          </p>
        </Link>

        <Link
          href="/employer/applications"
          className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/50 transition-colors group"
        >
          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
            Candidate Pipeline
            <ChevronRight className="w-3.5 h-3.5" />
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Screen candidates, schedule interviews, and update statuses.
          </p>
        </Link>

        <Link
          href="/employer/profile"
          className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/50 transition-colors group"
        >
          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
            Company Profile
            <ChevronRight className="w-3.5 h-3.5" />
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Update company bio, location, industry, and web address.
          </p>
        </Link>
      </div>
    </div>
  );
}

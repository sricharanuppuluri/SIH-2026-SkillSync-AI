"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { jobAPI } from "@/lib/api";
import { Job } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const data = await jobAPI.listJobs();
        setJobs(data);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to load job postings";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Job Postings & Skill Contracts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore industry demand and evaluate your skill alignment against live vacancies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "EMPLOYER" && (
            <Link href="/employer/jobs/new">
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Post New Job
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {loading && (
        <LoadingState message="Loading available job postings..." />
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10 text-xs text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-900/20">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Active Job Postings</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are currently no published job requisitions. Employers can post vacancies with required competencies.
          </p>
          {user?.role === "EMPLOYER" && (
            <Link href="/employer/jobs/new">
              <Button variant="primary" size="sm" className="mt-2 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Job Posting
              </Button>
            </Link>
          )}
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{job.title}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      {(job.location_city || job.location_state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {[job.location_city, job.location_state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {job.employment_type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="indigo" className="text-[10px] shrink-0">
                    {job.experience_level}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      Required:
                    </span>
                    {job.skills.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
                      >
                        {s.skill_name || "Skill"} ({s.minimum_proficiency})
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  {job.skills?.length || 0} skill requirements
                </span>

                <div className="flex items-center gap-2">
                  <Link href={`/candidate/jobs/${job.id}/skill-gap`}>
                    <Button variant="primary" size="sm" className="text-xs h-8">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Analyze Skill Gap
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Briefcase, Building2, MapPin, Check, ChevronDown, X } from "lucide-react";
import { jobAPI } from "@/lib/api";
import { Job } from "@/types";
import { cn } from "@/lib/utils";

interface CopilotJobSelectorProps {
  selectedJobId: string | null;
  onSelectJob: (job: Job | null) => void;
  disabled?: boolean;
}

export function CopilotJobSelector({
  selectedJobId,
  onSelectJob,
  disabled = false,
}: CopilotJobSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError(null);
      try {
        const data = await jobAPI.listJobs();
        setJobs(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm",
            selectedJob
              ? "bg-indigo-950/40 border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/50"
              : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white"
          )}
        >
          <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[200px] truncate">
            {selectedJob ? selectedJob.title : "Target Job: General Career (None)"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </button>

        {selectedJob && (
          <button
            type="button"
            onClick={() => onSelectJob(null)}
            title="Clear job selection (switch to general career mode)"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-30 p-1.5 space-y-1 max-h-80 overflow-y-auto">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-800/60 flex items-center justify-between">
              <span>Select Context Job</span>
              {loading && <span className="animate-pulse text-indigo-400">Loading...</span>}
            </div>

            {/* General Advice Option */}
            <button
              type="button"
              onClick={() => {
                onSelectJob(null);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors",
                !selectedJobId
                  ? "bg-indigo-600/20 text-indigo-300 font-medium"
                  : "text-slate-300 hover:bg-slate-800/70"
              )}
            >
              <div>
                <div className="font-medium text-slate-200">General Career Guidance</div>
                <div className="text-[10px] text-slate-400">Broad profile analysis without a specific job</div>
              </div>
              {!selectedJobId && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </button>

            {/* Job Items */}
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  onSelectJob(job);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors",
                  selectedJobId === job.id
                    ? "bg-indigo-600/20 text-indigo-300 font-medium"
                    : "text-slate-300 hover:bg-slate-800/70"
                )}
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="font-medium text-slate-200 truncate">{job.title}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                    <span className="flex items-center gap-1 shrink-0">
                      <Building2 className="w-2.5 h-2.5" />
                      {job.employer_name || "Company"}
                    </span>
                    {job.location_city && (
                      <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="w-2.5 h-2.5" />
                        {job.location_city}
                      </span>
                    )}
                  </div>
                </div>
                {selectedJobId === job.id && (
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </button>
            ))}

            {jobs.length === 0 && !loading && !error && (
              <div className="p-3 text-center text-xs text-slate-500">
                No active jobs available to select.
              </div>
            )}
            {error && (
              <div className="p-2 text-center text-[11px] text-rose-400">
                {error}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

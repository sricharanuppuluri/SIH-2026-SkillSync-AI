"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Cpu,
  Briefcase,
  GraduationCap,
  FileText,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateDashboardData } from "@/types/candidate";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProfileCompletenessBar } from "./ProfileCompletenessBar";

export function CandidateDashboard() {
  const [data, setData] = useState<CandidateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await candidateAPI.getDashboard();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load candidate dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading candidate profile and metrics..." className="py-20" />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-rose-900/40 bg-rose-950/10 space-y-4">
        <p className="text-sm text-rose-400">{error || "Unable to load dashboard data."}</p>
        <Button variant="secondary" size="sm" onClick={loadDashboard}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const {
    profile,
    completeness,
    skills_count,
    skills_by_proficiency,
    experience_count,
    education_count,
    recent_experiences,
    highest_education,
  } = data;

  return (
    <div className="space-y-6">
      {/* 1. Candidate Hero Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl shadow-inner">
            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "C"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {profile.full_name}
              </h1>
              <Badge variant="indigo">Candidate</Badge>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {profile.headline || profile.current_role || "Aspiring Professional"}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
              {(profile.location_city || profile.location_state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {[profile.location_city, profile.location_state].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {profile.experience_years > 0
                  ? `${profile.experience_years} yrs experience`
                  : "Entry Level"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/candidate/profile">
            <Button variant="secondary" size="sm" className="text-xs">
              <User className="w-3.5 h-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </Link>
          <Link href="/tools/skill-extractor">
            <Button variant="primary" size="sm" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Extractor
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Deterministic Profile Completeness Meter */}
      <ProfileCompletenessBar completeness={completeness} />

      {/* 3. Top Metrics Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Skills Metric */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Canonical Skills</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{skills_count}</div>
            <p className="text-[11px] text-slate-400">Verified competencies</p>
          </div>
        </div>

        {/* Experience Metric */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Experience</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{experience_count}</div>
            <p className="text-[11px] text-slate-400">
              {profile.current_role ? profile.current_role : "Positions logged"}
            </p>
          </div>
        </div>

        {/* Education Metric */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Education</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{education_count}</div>
            <p className="text-[11px] text-slate-400">
              {highest_education ? highest_education.degree : "Degrees / Diplomas"}
            </p>
          </div>
        </div>

        {/* Resume Metric */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Resume</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-white truncate">
              {profile.resume_filename || "Not Uploaded"}
            </div>
            <p className="text-[11px] text-slate-400">
              {profile.resume_uploaded_at ? "Ready for matching" : "Upload to boost readiness"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Detailed Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Skills & Experience Highlights */}
        <div className="lg:col-span-8 space-y-6">
          {/* Skills Breakdown Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Skills by Proficiency</h3>
                <p className="text-xs text-slate-400">Distribution across mastery levels</p>
              </div>
              <Link href="/candidate/skills">
                <Button variant="secondary" size="sm" className="text-xs">
                  Manage Skills
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Beginner
                </span>
                <div className="text-lg font-bold text-slate-200 mt-1 font-mono">
                  {skills_by_proficiency.BEGINNER || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Intermediate
                </span>
                <div className="text-lg font-bold text-indigo-300 mt-1 font-mono">
                  {skills_by_proficiency.INTERMEDIATE || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                  Advanced
                </span>
                <div className="text-lg font-bold text-sky-300 mt-1 font-mono">
                  {skills_by_proficiency.ADVANCED || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Expert
                </span>
                <div className="text-lg font-bold text-emerald-300 mt-1 font-mono">
                  {skills_by_proficiency.EXPERT || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Experience Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Work Experience</h3>
                <p className="text-xs text-slate-400">Career journey and recent achievements</p>
              </div>
              <Link href="/candidate/experience">
                <Button variant="secondary" size="sm" className="text-xs">
                  View All ({experience_count})
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            {recent_experiences.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No work experience logged yet. Add your employment history to improve matching.
              </div>
            ) : (
              <div className="space-y-3">
                {recent_experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">{exp.title}</div>
                      <div className="text-[11px] text-indigo-400 font-medium">{exp.company}</div>
                      {exp.location && (
                        <div className="text-[10px] text-slate-500">{exp.location}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={exp.is_current ? "indigo" : "secondary"}>
                        {exp.is_current
                          ? "Present"
                          : [exp.start_date, exp.end_date].filter(Boolean).join(" - ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Education & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Education Summary */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Education</h3>
              <Link href="/candidate/education">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-indigo-400">
                  Manage
                </Button>
              </Link>
            </div>

            {highest_education ? (
              <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  {highest_education.degree}
                </div>
                <div className="text-[11px] text-slate-400">
                  {highest_education.institution}
                </div>
                {highest_education.field_of_study && (
                  <div className="text-[10px] text-indigo-400 font-mono">
                    {highest_education.field_of_study}
                  </div>
                )}
                {highest_education.grade && (
                  <div className="text-[10px] text-emerald-400">
                    Grade: {highest_education.grade}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No degrees attached.
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/candidate/skills">
                <button className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/50 hover:border-slate-700 text-left transition-colors flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    Attach Canonical Skill
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </Link>
              <Link href="/candidate/experience">
                <button className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/50 hover:border-slate-700 text-left transition-colors flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    Add Work Experience
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </Link>
              <Link href="/candidate/education">
                <button className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/50 hover:border-slate-700 text-left transition-colors flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    Add Degree / Education
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </Link>
              <Link href="/jobs">
                <button className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800/50 hover:border-slate-700 text-left transition-colors flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    Explore Job Postings
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

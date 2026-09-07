"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Building2,
  AlertCircle,
  Layers,
  ChevronRight,
} from "lucide-react";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { TrainingProviderDashboardResponse } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TrainingProviderDashboardPage() {
  const [data, setData] = React.useState<TrainingProviderDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await trainingProviderAPI.getDashboard();
        setData(res);
      } catch (err: unknown) {
        console.error("Failed to load provider dashboard:", err);
        const msg = err instanceof Error ? err.message : "Failed to load live provider dashboard metrics.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading training provider metrics..." className="py-24" />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Unable to load dashboard</h2>
        <p className="text-xs text-slate-400">{error || "No data available."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, recent_courses, recent_enrollments } = data;

  const statCards = [
    {
      title: "Total Courses",
      value: metrics.total_courses,
      subtext: `${metrics.published_courses} Published • ${metrics.draft_courses} Draft`,
      icon: BookOpen,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Active Enrollments",
      value: metrics.active_enrollments,
      subtext: `${metrics.completed_enrollments} Completed (${metrics.total_enrollments} Total)`,
      icon: Users,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Completed Learners",
      value: metrics.completed_enrollments,
      subtext: "Skill evidence recorded",
      icon: CheckCircle2,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Training Seat Capacity",
      value: `${metrics.total_capacity - metrics.remaining_capacity} / ${metrics.total_capacity}`,
      subtext: `${metrics.remaining_capacity} seats available`,
      icon: Layers,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Training Provider Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Phase 11 Curriculum Module</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Curriculum & Course Management
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Design structured curricula aligned with canonical skill intelligence, publish vocational training programs, and monitor candidate progress.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/training-provider/profile"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Provider Profile</span>
          </Link>
          <Link
            href="/training-provider/courses/new"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </Link>
        </div>
      </div>

      {/* Live Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg shadow-black/20 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-lg border ${card.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight font-mono">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{card.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Courses Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Managed Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Active & Draft Courses
            </h2>
            <Link
              href="/training-provider/courses"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>View All Courses</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recent_courses.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-400 text-xs">
                <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No courses created yet</p>
                <p className="text-slate-500 mt-1 mb-4">
                  Start building your first curriculum mapped to canonical skills.
                </p>
                <Link
                  href="/training-provider/courses/new"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Course</span>
                </Link>
              </div>
            ) : (
              recent_courses.map((course) => {
                const totalLessons = (course.curriculum_modules || []).reduce(
                  (acc, m) => acc + (m.lessons?.length || 0),
                  0
                );
                return (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            course.status === "PUBLISHED"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                              : course.status === "DRAFT"
                              ? "text-amber-400 bg-amber-500/10 border-amber-500/25"
                              : "text-slate-400 bg-slate-500/10 border-slate-500/25"
                          }`}
                        >
                          {course.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {course.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{course.difficulty}</span>
                        <span>•</span>
                        <span>{course.duration_hours} hrs</span>
                        <span>•</span>
                        <span>{totalLessons} lessons</span>
                        <span>•</span>
                        <span>
                          {course.active_enrollments_count || 0}/{course.capacity} enrolled
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/training-provider/courses/${course.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-all shrink-0"
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Candidate Enrollments */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Recent Enrolled Learners
          </h2>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            {recent_enrollments.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">
                No candidate enrollments yet.
              </p>
            ) : (
              recent_enrollments.slice(0, 6).map((enr) => (
                <div
                  key={enr.id}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate">
                      {enr.candidate_name || "Learner"}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        enr.status === "COMPLETED"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-indigo-300 bg-indigo-500/10"
                      }`}
                    >
                      {enr.progress_percentage}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {enr.course?.title || "Course"}
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className={`h-full ${
                        enr.status === "COMPLETED" ? "bg-emerald-400" : "bg-indigo-500"
                      }`}
                      style={{ width: `${enr.progress_percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { Course } from "@/types";
import { CourseCard } from "@/components/training/CourseCard";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TrainingProviderCoursesPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchCourses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus;
      const res = await trainingProviderAPI.listCourses(statusParam);
      setCourses(res);
    } catch (err: unknown) {
      console.error("Failed to load provider courses:", err);
      const msg = err instanceof Error ? err.message : "Failed to load provider courses.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = React.useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.skills && c.skills.some((s) => s.name.toLowerCase().includes(q)))
    );
  }, [courses, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Course Management
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Training Programs Catalog
          </h1>
          <p className="text-xs text-slate-400">
            Create, update curriculum, map canonical skills, and publish vocational courses for candidates.
          </p>
        </div>

        <Link
          href="/training-provider/courses/new"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "DRAFT", "PUBLISHED", "CLOSED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedStatus === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, skill, category..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Courses Grid / States */}
      {isLoading ? (
        <LoadingState message="Loading courses..." className="py-20" />
      ) : error ? (
        <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-slate-300">{error}</p>
          <button
            onClick={fetchCourses}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs"
          >
            Retry
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No courses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No courses match query "${searchQuery}".`
              : "No courses have been created in this status category yet."}
          </p>
          <Link
            href="/training-provider/courses/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} isProviderView={true} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  Users,
  Layers,
  Tag,
  ChevronRight,
  Building,
} from "lucide-react";
import { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  isProviderView?: boolean;
  onEnroll?: (courseId: string) => void;
  isEnrolling?: boolean;
  isEnrolled?: boolean;
}

export function CourseCard({
  course,
  isProviderView = false,
  onEnroll,
  isEnrolling = false,
  isEnrolled = false,
}: CourseCardProps) {
  const difficultyColor = {
    BEGINNER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    INTERMEDIATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    ADVANCED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  }[course.difficulty] || "text-slate-400 bg-slate-500/10 border-slate-500/20";

  const statusColor = {
    DRAFT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    PUBLISHED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    CLOSED: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  }[course.status];

  const totalLessons = (course.curriculum_modules || []).reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  );

  const remaining = course.remaining_capacity ?? (course.capacity - (course.active_enrollments_count || 0));
  const isFull = remaining <= 0;

  return (
    <div className="flex flex-col justify-between rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all p-5 shadow-lg shadow-black/20 group">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${difficultyColor}`}>
              {course.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {(course.delivery_mode || course.mode || "ONLINE").replace("_", " ")}
            </span>
            {course.category && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-800/40">
                {course.category}
              </span>
            )}
          </div>

          {isProviderView && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
              {course.status}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
          {course.title}
        </h3>
        {course.provider_name && (
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 mb-2 font-medium">
            <Building className="w-3 h-3 text-slate-500" />
            {course.provider_name}
          </p>
        )}
        <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-4">
          {course.description || "Comprehensive hands-on training program aligned with industry-standard canonical skills."}
        </p>

        {/* Canonical Skills */}
        <div className="mb-4">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1.5 font-medium">
            <Tag className="w-3 h-3 text-indigo-400" />
            <span>Canonical Skills Covered:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(course.skills || []).slice(0, 4).map((skill) => (
              <span
                key={skill.id}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              >
                {skill.name}
              </span>
            ))}
            {(course.skills || []).length > 4 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                +{(course.skills || []).length - 4} more
              </span>
            )}
            {(!course.skills || course.skills.length === 0) && (
              <span className="text-[10px] text-slate-500 italic">No mapped skills</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{course.duration_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Users className="w-3 h-3 text-slate-500 shrink-0" />
            <span className={isFull ? "text-rose-400 font-semibold" : "text-emerald-400"}>
              {remaining}/{course.capacity} left
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isProviderView ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/training-provider/courses/${course.id}`}
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>Manage Course</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/candidate/learning/${course.id}`}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>View Details</span>
            </Link>
            {isEnrolled ? (
              <span className="py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                Enrolled
              </span>
            ) : isFull ? (
              <span className="py-1.5 px-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-semibold">
                Full
              </span>
            ) : onEnroll ? (
              <button
                type="button"
                onClick={() => onEnroll(course.id)}
                disabled={isEnrolling}
                className="py-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
              >
                <span>{isEnrolling ? "Enrolling..." : "Enroll"}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

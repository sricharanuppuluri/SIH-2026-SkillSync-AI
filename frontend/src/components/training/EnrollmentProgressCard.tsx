"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, PlayCircle, ChevronRight } from "lucide-react";
import { Enrollment } from "@/types";

interface EnrollmentProgressCardProps {
  enrollment: Enrollment;
}

export function EnrollmentProgressCard({ enrollment }: EnrollmentProgressCardProps) {
  const isCompleted = enrollment.status === "COMPLETED" || enrollment.progress_percentage === 100;
  const course = enrollment.course;

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 shadow-lg shadow-black/20 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              isCompleted
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                : "text-indigo-400 bg-indigo-500/10 border-indigo-500/25"
            }`}
          >
            {isCompleted ? "COMPLETED" : "IN PROGRESS"}
          </span>

          <span className="text-xs font-mono font-semibold text-slate-300">
            {enrollment.progress_percentage}%
          </span>
        </div>

        {/* Course Title */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
          {course?.title || "Enrolled Training Course"}
        </h3>
        {course?.provider_name && (
          <p className="text-xs text-slate-400 mb-3">By {course.provider_name}</p>
        )}

        {/* Progress Bar */}
        <div className="space-y-1 mb-4">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-sky-400"
              }`}
              style={{ width: `${enrollment.progress_percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>
              {enrollment.completed_lessons_count} of {enrollment.total_lessons_count} lessons completed
            </span>
          </div>
        </div>

        {/* Skills Tag Preview */}
        {course?.skills && course.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {course.skills.slice(0, 3).map((skill) => (
              <span
                key={skill.id}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/60"
              >
                {skill.name}
              </span>
            ))}
            {course.skills.length > 3 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500">
                +{course.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80">
        <Link
          href={`/candidate/learning/progress/${enrollment.id}`}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isCompleted
              ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Review Completed Course</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              <span>Continue Learning</span>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      </div>
    </div>
  );
}

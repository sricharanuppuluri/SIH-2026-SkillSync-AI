"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";
import { candidateLearningAPI } from "@/lib/trainingApi";
import { EnrollmentProgressDetail } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CandidateLessonProgressPage() {
  const params = useParams<{ enrollmentId: string }>();
  const enrollmentId = params.enrollmentId;

  const [data, setData] = React.useState<EnrollmentProgressDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadProgress = React.useCallback(async () => {
    if (!enrollmentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await candidateLearningAPI.getEnrollmentProgress(enrollmentId);
      setData(res);
    } catch (err: unknown) {
      console.error("Failed to load enrollment progress:", err);
      const msg = err instanceof Error ? err.message : "Failed to load learning progress.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  React.useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const handleToggleLesson = async (lessonId: string, currentCompleted: boolean) => {
    if (!enrollmentId) return;
    try {
      setIsUpdating(lessonId);
      setError(null);
      const res = await candidateLearningAPI.updateLessonProgress(
        enrollmentId,
        lessonId,
        !currentCompleted
      );
      setData(res);
    } catch (err: unknown) {
      console.error("Failed to update lesson progress:", err);
      const msg = err instanceof Error ? err.message : "Failed to update lesson completion status.";
      setError(msg);
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your interactive learning progress..." className="py-24" />;
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Enrollment Not Found</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link
          href="/candidate/learning"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Learning Hub</span>
        </Link>
      </div>
    );
  }

  const course = data?.course;
  const isCompleted = data?.status === "COMPLETED" || data?.progress_percentage === 100;
  const lessonProgressMap = data?.lesson_progress || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Top Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/candidate/learning"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Learning Hub</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Interactive Curriculum Workspace</span>
      </div>

      {/* Main Course Progress Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  isCompleted
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                    : "text-indigo-400 bg-indigo-500/10 border-indigo-500/25"
                }`}
              >
                {data?.status}
              </span>
              {course?.category && (
                <span className="text-xs font-mono text-slate-400">{course.category}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{course?.title}</h1>
            {course?.provider_name && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Offered by {course.provider_name}</span>
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-white font-mono">{data?.progress_percentage}%</div>
            <div className="text-[11px] text-slate-400">
              {data?.completed_lessons_count} of {data?.total_lessons_count} Lessons Completed
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCompleted
                ? "bg-emerald-400"
                : "bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-400"
            }`}
            style={{ width: `${data?.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 shadow-lg space-y-2 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Training Program Completed — Structured Skill Evidence Recorded!</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            You have successfully finished all curriculum lessons. Your completed training record and covered canonical skills have been safely logged into the database as training evidence for your career profile.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Link
              href="/candidate/copilot"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discuss Next Steps with Career Copilot</span>
            </Link>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Curriculum Modules Checklist */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Curriculum Modules & Lessons
        </h2>

        <div className="space-y-4">
          {(!course?.curriculum_modules || course.curriculum_modules.length === 0) ? (
            <p className="text-xs text-slate-500 italic">No curriculum modules loaded.</p>
          ) : (
            course.curriculum_modules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg shadow-black/20"
              >
                {/* Module Header */}
                <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center">
                      {mod.order_index}
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200">{mod.title}</h3>
                      {mod.description && (
                        <p className="text-[11px] text-slate-400">{mod.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {mod.lessons?.filter((l) => lessonProgressMap[l.id]).length || 0} /{" "}
                    {mod.lessons?.length || 0} Done
                  </span>
                </div>

                {/* Lessons Checklist */}
                <div className="p-3 space-y-2">
                  {(mod.lessons || []).map((lesson) => {
                    const isLessonDone = !!lessonProgressMap[lesson.id];
                    const isLessonUpdating = isUpdating === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isLessonDone
                            ? "bg-slate-950/60 border-emerald-500/25 text-slate-300"
                            : "bg-slate-950/30 border-slate-800/80 hover:border-slate-700 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            disabled={isLessonUpdating}
                            onClick={() => handleToggleLesson(lesson.id, isLessonDone)}
                            className="focus:outline-none"
                            title={isLessonDone ? "Mark as Incomplete" : "Mark as Completed"}
                          >
                            {isLessonUpdating ? (
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            ) : isLessonDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500 hover:text-indigo-400 shrink-0 transition-colors" />
                            )}
                          </button>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs font-medium truncate ${
                                isLessonDone ? "line-through text-slate-400" : "text-slate-100"
                              }`}
                            >
                              {mod.order_index}.{lesson.order_index} {lesson.title}
                            </span>
                            {lesson.description && (
                              <span className="text-[11px] text-slate-500 truncate">
                                {lesson.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                            {lesson.duration_minutes}m
                          </span>

                          <button
                            type="button"
                            disabled={isLessonUpdating}
                            onClick={() => handleToggleLesson(lesson.id, isLessonDone)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                              isLessonDone
                                ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                            }`}
                          >
                            {isLessonDone ? "Done" : "Complete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

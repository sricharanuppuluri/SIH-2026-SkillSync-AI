"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Layers,
  Users,
  Tag,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { candidateLearningAPI } from "@/lib/trainingApi";
import { Course, Enrollment } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CandidateCourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const router = useRouter();

  const [course, setCourse] = React.useState<Course | null>(null);
  const [myEnrollment, setMyEnrollment] = React.useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!courseId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [c, enrs] = await Promise.all([
        candidateLearningAPI.getCourseDetail(courseId),
        candidateLearningAPI.listMyEnrollments().catch(() => []),
      ]);
      setCourse(c);
      const existing = enrs.find((e) => e.course_id === courseId) || null;
      setMyEnrollment(existing);
    } catch (err: unknown) {
      console.error("Failed to load course details:", err);
      const msg = err instanceof Error ? err.message : "Failed to load course details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      setIsEnrolling(true);
      setError(null);
      const enr = await candidateLearningAPI.enroll(courseId);
      setMyEnrollment(enr);
      setSuccessMsg("Congratulations! You are now enrolled in this course.");
      setTimeout(() => {
        router.push(`/candidate/learning/progress/${enr.id}`);
      }, 1200);
    } catch (err: unknown) {
      console.error("Failed to enroll:", err);
      const msg = err instanceof Error ? err.message : "Enrollment failed. This course may be full or inactive.";
      setError(msg);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading course curriculum and details..." className="py-24" />;
  }

  if (error && !course) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Course Not Found</h2>
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

  const remaining = course ? (course.remaining_capacity ?? (course.capacity - (course.active_enrollments_count || 0))) : 0;
  const isFull = remaining <= 0;
  const totalLessons = (course?.curriculum_modules || []).reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Top Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/candidate/learning"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course Catalog</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Course Overview</span>
      </div>

      {/* Hero Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
              {course?.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
              {course?.delivery_mode.replace("_", " ")}
            </span>
            {course?.category && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                {course.category}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">{course?.title}</h1>
          {course?.provider_name && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Offered by <strong className="text-slate-200">{course.provider_name}</strong></span>
            </p>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          {course?.description || "Structured training curriculum aligned with canonical industry skill intelligence."}
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-mono">Duration</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{course?.duration_hours} Hours</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-mono">Lessons</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{totalLessons} Lessons</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-mono">Availability</div>
            <div className={`text-sm font-semibold mt-0.5 flex items-center gap-1 ${isFull ? "text-rose-400" : "text-emerald-400"}`}>
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{remaining} / {course?.capacity} Seats Left</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center">
            {myEnrollment ? (
              <Link
                href={`/candidate/learning/progress/${myEnrollment.id}`}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
              >
                <span>Continue Learning</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : isFull ? (
              <span className="w-full py-2 px-3 rounded-lg bg-slate-800 text-rose-400 text-xs font-semibold text-center border border-rose-500/20">
                Course Full
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20 transition-all"
              >
                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isEnrolling ? "Enrolling..." : "Enroll Now"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Canonical Skills Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-400" />
          Canonical Skills Taught in this Program
        </h2>
        <div className="flex flex-wrap gap-2">
          {(course?.skills || []).map((skill) => (
            <span
              key={skill.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25"
            >
              <Tag className="w-3 h-3 text-indigo-400" />
              <span>{skill.name}</span>
              {skill.category && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({skill.category})
                </span>
              )}
            </span>
          ))}
          {(!course?.skills || course.skills.length === 0) && (
            <p className="text-xs text-slate-500 italic">No skills listed.</p>
          )}
        </div>
      </div>

      {/* Structured Curriculum Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Structured Curriculum & Lesson Plan
        </h2>

        <div className="space-y-3">
          {(!course?.curriculum_modules || course.curriculum_modules.length === 0) ? (
            <p className="text-xs text-slate-500 italic">Curriculum content under review.</p>
          ) : (
            course.curriculum_modules.map((m) => (
              <div
                key={m.id}
                className="rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden"
              >
                <div className="p-3.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center">
                      {m.order_index}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-200">{m.title}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {m.lessons?.length || 0} Lessons
                  </span>
                </div>

                {m.description && (
                  <p className="text-[11px] text-slate-400 px-4 pt-2.5">{m.description}</p>
                )}

                <div className="p-3 space-y-1.5">
                  {(m.lessons || []).map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 text-xs hover:bg-slate-900/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-slate-500 w-5">
                          {m.order_index}.{l.order_index}
                        </span>
                        <span className="text-slate-300 truncate font-medium">{l.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {l.duration_minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

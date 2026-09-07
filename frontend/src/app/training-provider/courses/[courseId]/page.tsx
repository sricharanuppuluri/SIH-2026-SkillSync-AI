"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Send,
  Eye,
  Lock,
  RefreshCw,
} from "lucide-react";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { CourseSkillSelector } from "@/components/training/CourseSkillSelector";
import { CurriculumBuilder } from "@/components/training/CurriculumBuilder";
import {
  Course,
  SkillBrief,
  CurriculumModule,
  Enrollment,
  CourseDifficulty,
  CourseMode,
} from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [course, setCourse] = React.useState<Course | null>(null);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<CourseDifficulty>("INTERMEDIATE");
  const [deliveryMode, setDeliveryMode] = React.useState<CourseMode>("ONLINE");
  const [durationHours, setDurationHours] = React.useState<number>(40);
  const [capacity, setCapacity] = React.useState<number>(30);
  const [locationState, setLocationState] = React.useState("");

  // Skills
  const [selectedSkills, setSelectedSkills] = React.useState<SkillBrief[]>([]);

  // Curriculum
  const [modules, setModules] = React.useState<CurriculumModule[]>([]);

  // UI state
  const [activeTab, setActiveTab] = React.useState<"curriculum" | "details" | "enrollments" | "preview">("curriculum");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  const loadCourseData = React.useCallback(async () => {
    if (!courseId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [c, enrs] = await Promise.all([
        trainingProviderAPI.getCourse(courseId),
        trainingProviderAPI.getCourseEnrollments(courseId).catch(() => []),
      ]);
      setCourse(c);
      setTitle(c.title);
      setDescription(c.description || "");
      setCategory(c.category || "");
      setDifficulty(c.difficulty);
      setDeliveryMode(c.delivery_mode || c.mode || "ONLINE");
      setDurationHours(c.duration_hours);
      setCapacity(c.capacity);
      setLocationState(c.location_state || "");
      const normalizedSkills: SkillBrief[] = (c.skills || []).map((s) => ({
        id: s.skill_id || s.id,
        name: s.skill_name || s.name || "Skill",
        code: s.skill_code || s.code,
      }));
      setSelectedSkills(normalizedSkills);
      setModules(c.curriculum_modules || []);
      setEnrollments(enrs);
    } catch (err: unknown) {
      console.error("Failed to load course details:", err);
      const msg = err instanceof Error ? err.message : "Failed to load course details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Save Course Details & Skills
  const handleSaveDetails = async () => {
    if (!courseId) return;
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      // 1. Update basic details
      await trainingProviderAPI.updateCourse(courseId, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        difficulty,
        delivery_mode: deliveryMode,
        duration_hours: Number(durationHours),
        capacity: Number(capacity),
        location_state: locationState.trim() || undefined,
      });

      // 2. Map canonical skills
      const skillUpdated = await trainingProviderAPI.mapSkills(courseId, {
        skill_ids: selectedSkills.map((s) => s.skill_id || s.id),
      });

      setCourse(skillUpdated);
      setSuccessMsg("Course details & canonical skills successfully updated.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to save course:", err);
      const msg = err instanceof Error ? err.message : "Failed to save course details.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Synchronize Curriculum Changes
  const handleCurriculumChange = async (updatedModules: CurriculumModule[]) => {
    setModules(updatedModules);
  };

  // Publish Course
  const handlePublish = async () => {
    if (!courseId) return;
    try {
      setIsPublishing(true);
      setError(null);
      setSuccessMsg(null);
      const pub = await trainingProviderAPI.publishCourse(courseId);
      setCourse(pub);
      setSuccessMsg("Course published successfully! It is now live in the candidate learning catalog.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      console.error("Failed to publish course:", err);
      const msg = err instanceof Error ? err.message : "Unable to publish course. Please check requirements.";
      setError(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // Close Course
  const handleClose = async () => {
    if (!courseId || !confirm("Are you sure you want to close this course? No new candidates will be able to enroll.")) {
      return;
    }
    try {
      setIsPublishing(true);
      setError(null);
      const cl = await trainingProviderAPI.closeCourse(courseId);
      setCourse(cl);
      setSuccessMsg("Course closed. Historical enrollment data remains preserved.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to close course:", err);
      const msg = err instanceof Error ? err.message : "Failed to close course.";
      setError(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading course curriculum and settings..." className="py-24" />;
  }

  if (error && !course) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Unable to load course</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link
          href="/training-provider/courses"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Courses</span>
        </Link>
      </div>
    );
  }

  const isClosed = course?.status === "CLOSED";
  const isPublished = course?.status === "PUBLISHED";
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/training-provider/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Courses</span>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
              isPublished
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                : isClosed
                ? "text-slate-400 bg-slate-500/10 border-slate-500/25"
                : "text-amber-400 bg-amber-500/10 border-amber-500/25"
            }`}
          >
            {course?.status}
          </span>
        </div>
      </div>

      {/* Main Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-indigo-400">
              {course?.category || "Vocational Course"}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400">{course?.difficulty}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight truncate">
            {course?.title}
          </h1>
          <p className="text-xs text-slate-400 line-clamp-1">
            {course?.description || "Structured canonical training curriculum."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isClosed && !isPublished && (
            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Publish Course</span>
            </button>
          )}

          {isPublished && (
            <button
              type="button"
              disabled={isPublishing}
              onClick={handleClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Course</span>
            </button>
          )}
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-1">
        {[
          { id: "curriculum", label: `Curriculum (${modules.length} modules, ${totalLessons} lessons)`, icon: Layers },
          { id: "details", label: "Course Settings & Skills", icon: BookOpen },
          { id: "enrollments", label: `Learner Enrollments (${enrollments.length})`, icon: Users },
          { id: "preview", label: "Candidate Preview", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "curriculum" | "details" | "enrollments" | "preview")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Curriculum Builder */}
      {activeTab === "curriculum" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Manage ordered modules and lessons. Every change structures the deterministic progress tracking for learners.
            </span>
            <button
              onClick={loadCourseData}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reload</span>
            </button>
          </div>

          <CurriculumBuilder
            modules={modules}
            onChange={handleCurriculumChange}
            disabled={isClosed}
          />
        </div>
      )}

      {/* Tab 2: Settings & Canonical Skills */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Course Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  value={title}
                  disabled={isClosed}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  disabled={isClosed}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    disabled={isClosed}
                    onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Mode</label>
                  <select
                    value={deliveryMode}
                    disabled={isClosed}
                    onChange={(e) => setDeliveryMode(e.target.value as CourseMode)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="IN_PERSON">IN_PERSON</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={durationHours}
                    disabled={isClosed}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    disabled={isClosed}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    disabled={isClosed}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Canonical Skills */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Canonical Skill Mapping</h3>
            <CourseSkillSelector
              selectedSkills={selectedSkills}
              onChange={setSelectedSkills}
              disabled={isClosed}
            />
          </div>

          {!isClosed && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSaving}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Course Details</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Learner Enrollments */}
      {activeTab === "enrollments" && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Enrolled Candidates
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {course?.active_enrollments_count || 0} / {course?.capacity} Seats Occupied
            </span>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              No candidates enrolled in this course yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Enrolled On</th>
                    <th className="py-2.5 px-3">Completed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {enrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {enr.candidate_name || "Enrolled Learner"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            enr.status === "COMPLETED"
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-indigo-400 bg-indigo-500/10"
                          }`}
                        >
                          {enr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${
                                enr.status === "COMPLETED" ? "bg-emerald-400" : "bg-indigo-500"
                              }`}
                              style={{ width: `${enr.progress_percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {enr.progress_percentage}% ({enr.completed_lessons_count}/{enr.total_lessons_count})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(enr.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {enr.completed_at ? new Date(enr.completed_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Candidate Preview */}
      {activeTab === "preview" && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                {difficulty}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                {(deliveryMode || "ONLINE").replace("_", " ")}
              </span>
              <span className="text-xs text-slate-500 font-mono">• {durationHours} Hours</span>
            </div>
            <h2 className="text-xl font-bold text-white">{title || "Untitled Course"}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {description || "No description provided."}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Canonical Skills Covered
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedSkills.map((s) => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Curriculum Outline
            </h4>
            <div className="space-y-3">
              {modules.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h5 className="text-xs font-semibold text-slate-200">
                    Module {m.order_index}: {m.title}
                  </h5>
                  {m.description && <p className="text-[11px] text-slate-400">{m.description}</p>}
                  <div className="space-y-1 pt-1">
                    {(m.lessons || []).map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between text-[11px] text-slate-300 py-1 px-2 rounded bg-slate-900/60"
                      >
                        <span>
                          {m.order_index}.{l.order_index} {l.title}
                        </span>
                        <span className="font-mono text-slate-500">{l.duration_minutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

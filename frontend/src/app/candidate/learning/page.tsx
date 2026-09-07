"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Search,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { candidateLearningAPI } from "@/lib/trainingApi";
import { skillTaxonomyAPI } from "@/lib/api";
import { Course, Enrollment, Skill } from "@/types";
import { CourseCard } from "@/components/training/CourseCard";
import { EnrollmentProgressCard } from "@/components/training/EnrollmentProgressCard";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CandidateLearningHubPage() {
  const [activeTab, setActiveTab] = React.useState<"enrolled" | "catalog">("enrolled");

  // Enrollments State
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = React.useState(true);

  // Catalog State
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSkillId, setSelectedSkillId] = React.useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>("");
  const [selectedMode, setSelectedMode] = React.useState<string>("");
  const [skillsList, setSkillsList] = React.useState<Skill[]>([]);

  // Action states
  const [enrollingCourseId, setEnrollingCourseId] = React.useState<string | null>(null);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = React.useState<string | null>(null);

  // Load candidate's enrollments
  const loadEnrollments = React.useCallback(async () => {
    try {
      setIsLoadingEnrollments(true);
      const enrs = await candidateLearningAPI.listMyEnrollments();
      setEnrollments(enrs);
    } catch (err) {
      console.error("Failed to load enrollments:", err);
    } finally {
      setIsLoadingEnrollments(false);
    }
  }, []);

  // Load catalog courses
  const loadCourses = React.useCallback(async () => {
    try {
      setIsLoadingCourses(true);
      const res = await candidateLearningAPI.discoverCourses({
        search: searchQuery.trim() || undefined,
        skill_id: selectedSkillId || undefined,
        difficulty: selectedDifficulty || undefined,
        delivery_mode: selectedMode || undefined,
      });
      setCourses(res);
    } catch (err) {
      console.error("Failed to load course catalog:", err);
    } finally {
      setIsLoadingCourses(false);
    }
  }, [searchQuery, selectedSkillId, selectedDifficulty, selectedMode]);

  // Load skills taxonomy for filter dropdown
  React.useEffect(() => {
    async function loadSkills() {
      try {
        const skills = await skillTaxonomyAPI.list({ skill_status: "ACTIVE", limit: 30 });
        setSkillsList(skills || []);
      } catch (err) {
        console.error("Failed to load skills for filter:", err);
      }
    }
    loadSkills();
    loadEnrollments();
  }, [loadEnrollments]);

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingCourseId(courseId);
      setEnrollError(null);
      setEnrollSuccess(null);
      await candidateLearningAPI.enroll(courseId);
      setEnrollSuccess("Successfully enrolled! Course added to your learning dashboard.");
      await loadEnrollments();
      await loadCourses();
      setTimeout(() => setEnrollSuccess(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to enroll:", err);
      const msg = err instanceof Error ? err.message : "Enrollment failed. The course might be full or already enrolled.";
      setEnrollError(msg);
      setTimeout(() => setEnrollError(null), 5000);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Learning Hub
            </span>
            <span className="text-xs text-slate-400 font-mono">Phase 11 Curriculum Module</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Skill Development & Vocational Courses
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Bridge your skill gaps with structured curricula designed by verified training providers and mapped directly to canonical industry competencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/candidate/copilot"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Career Copilot</span>
          </Link>
        </div>
      </div>

      {/* Action alerts */}
      {enrollError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{enrollError}</span>
        </div>
      )}
      {enrollSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{enrollSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("enrolled")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "enrolled"
              ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>My Enrolled Programs ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "catalog"
              ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Explore Course Catalog</span>
        </button>
      </div>

      {/* Tab 1: My Enrolled Courses */}
      {activeTab === "enrolled" && (
        <div className="space-y-6">
          {isLoadingEnrollments ? (
            <LoadingState message="Loading your enrolled courses..." className="py-20" />
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">
                You are not enrolled in any training programs yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Explore our catalog of vocational courses mapped to canonical industry skills to close your career gaps.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold mt-2"
              >
                <Search className="w-4 h-4" />
                <span>Browse Course Catalog</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrollments.map((enr) => (
                <EnrollmentProgressCard key={enr.id} enrollment={enr} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Course Catalog & Discovery */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Discovery Filter Controls */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course title or category..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Canonical Skill Filter */}
              <div>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Canonical Skills</option>
                  {skillsList.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name} ({sk.category || "Skill"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Difficulties</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              {/* Delivery Mode Filter */}
              <div>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Delivery Modes</option>
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In Person</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoadingCourses ? (
            <LoadingState message="Discovering vocational courses..." className="py-20" />
          ) : courses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No published courses match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search filters or clearing the canonical skill selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSkillId("");
                  setSelectedDifficulty("");
                  setSelectedMode("");
                }}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isProviderView={false}
                  isEnrolled={enrolledCourseIds.has(course.id)}
                  isEnrolling={enrollingCourseId === course.id}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

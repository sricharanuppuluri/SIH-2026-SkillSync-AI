"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  BookOpen,
  Tag,
  Layers,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { CourseSkillSelector } from "@/components/training/CourseSkillSelector";
import { CurriculumBuilder } from "@/components/training/CurriculumBuilder";
import { SkillBrief, CurriculumModule, CourseDifficulty, CourseMode } from "@/types";

export default function CreateCoursePage() {
  const router = useRouter();

  // Basic Details State
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("Software Engineering");
  const [difficulty, setDifficulty] = React.useState<CourseDifficulty>("INTERMEDIATE");
  const [deliveryMode, setDeliveryMode] = React.useState<CourseMode>("ONLINE");
  const [durationHours, setDurationHours] = React.useState<number>(40);
  const [capacity, setCapacity] = React.useState<number>(30);
  const [locationState, setLocationState] = React.useState("");

  // Canonical Skills
  const [selectedSkills, setSelectedSkills] = React.useState<SkillBrief[]>([]);

  // Initial Curriculum
  const [modules, setModules] = React.useState<CurriculumModule[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Course title is required.");
      return;
    }
    if (capacity <= 0) {
      setError("Capacity must be greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Create the Course
      const newCourse = await trainingProviderAPI.createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        difficulty,
        delivery_mode: deliveryMode,
        duration_hours: Number(durationHours) || 1,
        capacity: Number(capacity),
        location_state: locationState.trim() || undefined,
        skill_ids: selectedSkills.map((s) => s.id),
      });

      // 2. Create the Curriculum Modules & Lessons if any were added
      for (const mod of modules) {
        const createdMod = await trainingProviderAPI.createModule(newCourse.id, {
          title: mod.title,
          description: mod.description || undefined,
          order_index: mod.order_index,
        });

        if (mod.lessons && mod.lessons.length > 0) {
          for (const les of mod.lessons) {
            await trainingProviderAPI.createLesson(newCourse.id, createdMod.id, {
              title: les.title,
              description: les.description || undefined,
              content_reference: les.content_reference || undefined,
              duration_minutes: les.duration_minutes,
              order_index: les.order_index,
            });
          }
        }
      }

      // Navigate to the newly created course editor page
      router.push(`/training-provider/courses/${newCourse.id}`);
    } catch (err: unknown) {
      console.error("Failed to create course:", err);
      const msg = err instanceof Error ? err.message : "Failed to create training course.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/training-provider/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Courses</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Step 1: Course Specification</span>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Curriculum Designer
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create Vocational Training Program
        </h1>
        <p className="text-xs text-slate-400 max-w-xl">
          Define program details, align with canonical skill intelligence, build the structured curriculum, and prepare for candidate enrollment.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            1. Program Information
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Course Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Python Backend & Microservices Architecture"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Course Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary of the course outcomes, target learners, and practical projects..."
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Software Engineering, Data & AI, Cloud"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location / State (for in-person or hybrid)
                </label>
                <input
                  type="text"
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                  placeholder="e.g., California, Online / Remote, Karnataka"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Structure, Difficulty & Capacity */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            2. Delivery Mode, Duration & Seat Capacity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
                onChange={(e) => setDeliveryMode(e.target.value as CourseMode)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ONLINE">ONLINE</option>
                <option value="IN_PERSON">IN_PERSON</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Duration (Hours) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Seat Capacity <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Canonical Skill Selector */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" />
              3. Canonical Skill Alignment
            </h2>
            <span className="text-[11px] text-slate-500">
              Only authorized canonical skills from Skill Intelligence
            </span>
          </div>

          <CourseSkillSelector
            selectedSkills={selectedSkills}
            onChange={setSelectedSkills}
          />
        </div>

        {/* Section 4: Initial Curriculum Builder */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              4. Curriculum Structure (Modules & Lessons)
            </h2>
          </div>

          <CurriculumBuilder modules={modules} onChange={setModules} />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/training-provider/courses"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Course & Curriculum...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Create & Save Course</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

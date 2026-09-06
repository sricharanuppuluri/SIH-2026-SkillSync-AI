"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Clock,
  BookOpen,
  Check,
  X,
  Layers,
} from "lucide-react";
import { CurriculumModule, CurriculumLesson } from "@/types";

interface CurriculumBuilderProps {
  modules: CurriculumModule[];
  onChange: (modules: CurriculumModule[]) => void;
  disabled?: boolean;
}

export function CurriculumBuilder({
  modules,
  onChange,
  disabled = false,
}: CurriculumBuilderProps) {
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = React.useState("");
  const [moduleDesc, setModuleDesc] = React.useState("");

  const [addingLessonToModuleId, setAddingLessonToModuleId] = React.useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = React.useState("");
  const [lessonDesc, setLessonDesc] = React.useState("");
  const [lessonDuration, setLessonDuration] = React.useState<number>(30);
  const [lessonContentRef, setLessonContentRef] = React.useState("");

  // Module actions
  const handleAddModule = () => {
    if (!moduleTitle.trim()) return;
    const newModule: CurriculumModule = {
      id: "mod_" + Math.random().toString(36).substring(2, 9),
      course_id: "",
      title: moduleTitle.trim(),
      description: moduleDesc.trim() || null,
      order_index: modules.length + 1,
      lessons: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...modules, newModule]);
    setModuleTitle("");
    setModuleDesc("");
  };

  const handleUpdateModule = (moduleId: string) => {
    if (!moduleTitle.trim()) return;
    onChange(
      modules.map((mod) =>
        mod.id === moduleId
          ? { ...mod, title: moduleTitle.trim(), description: moduleDesc.trim() || null }
          : mod
      )
    );
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDesc("");
  };

  const handleDeleteModule = (moduleId: string) => {
    const updated = modules
      .filter((m) => m.id !== moduleId)
      .map((m, idx) => ({ ...m, order_index: idx + 1 }));
    onChange(updated);
  };

  const handleMoveModule = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= modules.length) return;
    const updated = [...modules];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    const reindexed = updated.map((m, idx) => ({ ...m, order_index: idx + 1 }));
    onChange(reindexed);
  };

  // Lesson actions
  const handleAddLesson = (moduleId: string) => {
    if (!lessonTitle.trim()) return;
    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    const newLesson: CurriculumLesson = {
      id: "les_" + Math.random().toString(36).substring(2, 9),
      module_id: moduleId,
      title: lessonTitle.trim(),
      description: lessonDesc.trim() || null,
      content_reference: lessonContentRef.trim() || null,
      duration_minutes: Number(lessonDuration) || 30,
      order_index: (targetModule.lessons?.length || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = modules.map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...(m.lessons || []), newLesson],
        };
      }
      return m;
    });

    onChange(updated);
    setAddingLessonToModuleId(null);
    setLessonTitle("");
    setLessonDesc("");
    setLessonDuration(30);
    setLessonContentRef("");
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    const updated = modules.map((m) => {
      if (m.id === moduleId) {
        const filtered = (m.lessons || [])
          .filter((l) => l.id !== lessonId)
          .map((l, idx) => ({ ...l, order_index: idx + 1 }));
        return { ...m, lessons: filtered };
      }
      return m;
    });
    onChange(updated);
  };

  const handleMoveLesson = (moduleId: string, lessonIdx: number, direction: "up" | "down") => {
    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule || !targetModule.lessons) return;
    const newIdx = direction === "up" ? lessonIdx - 1 : lessonIdx + 1;
    if (newIdx < 0 || newIdx >= targetModule.lessons.length) return;

    const updatedLessons = [...targetModule.lessons];
    const temp = updatedLessons[lessonIdx];
    updatedLessons[lessonIdx] = updatedLessons[newIdx];
    updatedLessons[newIdx] = temp;
    const reindexedLessons = updatedLessons.map((l, idx) => ({ ...l, order_index: idx + 1 }));

    const updated = modules.map((m) =>
      m.id === moduleId ? { ...m, lessons: reindexedLessons } : m
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Structured Curriculum Modules & Lessons
        </label>
        <span className="text-xs text-slate-500 font-mono">
          {modules.length} Modules •{" "}
          {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Lessons
        </span>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {modules.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400 text-xs">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-medium text-slate-300">No curriculum modules added yet</p>
            <p className="text-slate-500 text-[11px] mt-1">
              Add ordered modules and structured lessons below. At least 1 module with lessons is required to publish.
            </p>
          </div>
        ) : (
          modules.map((mod, modIdx) => (
            <div
              key={mod.id}
              className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg shadow-black/20"
            >
              {/* Module Header */}
              <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center shrink-0">
                    {mod.order_index}
                  </span>
                  {editingModuleId === mod.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="Module title..."
                        className="px-2 py-1 text-xs rounded bg-slate-900 border border-indigo-500 text-slate-200 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateModule(mod.id)}
                        className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModuleId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {mod.title}
                      </h4>
                      {mod.description && (
                        <p className="text-[11px] text-slate-400 truncate">{mod.description}</p>
                      )}
                    </div>
                  )}
                </div>

                {!disabled && editingModuleId !== mod.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={modIdx === 0}
                      onClick={() => handleMoveModule(modIdx, "up")}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={modIdx === modules.length - 1}
                      onClick={() => handleMoveModule(modIdx, "down")}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingModuleId(mod.id);
                        setModuleTitle(mod.title);
                        setModuleDesc(mod.description || "");
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-300"
                      title="Edit Module"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(mod.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                      title="Delete Module"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Module Lessons Container */}
              <div className="p-3 space-y-2">
                {(!mod.lessons || mod.lessons.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic px-2 py-1">
                    No lessons in this module. Add a lesson below.
                  </p>
                ) : (
                  mod.lessons.map((lesson, lesIdx) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700/80 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-slate-500 w-5">
                          {mod.order_index}.{lesson.order_index}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-300 truncate">
                            {lesson.title}
                          </span>
                          {lesson.description && (
                            <span className="text-[10px] text-slate-500 truncate">
                              {lesson.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          <Clock className="w-2.5 h-2.5 text-indigo-400" />
                          {lesson.duration_minutes}m
                        </span>

                        {!disabled && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={lesIdx === 0}
                              onClick={() => handleMoveLesson(mod.id, lesIdx, "up")}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                              title="Move Lesson Up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={lesIdx === (mod.lessons?.length || 0) - 1}
                              onClick={() => handleMoveLesson(mod.id, lesIdx, "down")}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                              title="Move Lesson Down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Add Lesson to Module Form */}
                {!disabled && (
                  <div>
                    {addingLessonToModuleId === mod.id ? (
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-indigo-500/40 space-y-2 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            placeholder="Lesson Title (e.g., Introduction to FastAPI)"
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={lessonDuration}
                              onChange={(e) => setLessonDuration(Number(e.target.value))}
                              placeholder="Mins"
                              className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400 shrink-0">mins</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={lessonDesc}
                          onChange={(e) => setLessonDesc(e.target.value)}
                          placeholder="Lesson brief description / objectives (optional)"
                          className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAddingLessonToModuleId(null)}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddLesson(mod.id)}
                            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Lesson
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingLessonToModuleId(mod.id);
                          setLessonTitle("");
                          setLessonDesc("");
                          setLessonDuration(30);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Lesson to Module {mod.order_index}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Module Form */}
      {!disabled && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            Add New Curriculum Module
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="Module Title (e.g., Module 1: Foundations & Architecture)"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={moduleDesc}
              onChange={(e) => setModuleDesc(e.target.value)}
              placeholder="Module Description / Key Objectives (optional)"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddModule}
              disabled={!moduleTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Module
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

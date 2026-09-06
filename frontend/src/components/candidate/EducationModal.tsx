"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CandidateEducation, CandidateEducationCreateData } from "@/types/candidate";
import { Button } from "@/components/ui/Button";

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CandidateEducationCreateData, id?: string) => Promise<void>;
  initialData?: CandidateEducation | null;
}

export function EducationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EducationModalProps) {
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [startYear, setStartYear] = useState<number | "">("");
  const [endYear, setEndYear] = useState<number | "">("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setInstitution(initialData.institution);
      setDegree(initialData.degree);
      setFieldOfStudy(initialData.field_of_study || "");
      setStartYear(initialData.start_year || "");
      setEndYear(initialData.end_year || "");
      setIsCurrent(initialData.is_current);
      setGrade(initialData.grade || "");
      setDescription(initialData.description || "");
    } else {
      setInstitution("");
      setDegree("");
      setFieldOfStudy("");
      setStartYear("");
      setEndYear("");
      setIsCurrent(false);
      setGrade("");
      setDescription("");
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !degree.trim()) {
      setError("Institution and Degree are required.");
      return;
    }

    if (startYear && endYear && !isCurrent && Number(endYear) < Number(startYear)) {
      setError("End year cannot be earlier than start year.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(
        {
          institution: institution.trim(),
          degree: degree.trim(),
          field_of_study: fieldOfStudy.trim() || null,
          start_year: startYear ? Number(startYear) : null,
          end_year: isCurrent ? null : endYear ? Number(endYear) : null,
          is_current: isCurrent,
          grade: grade.trim() || null,
          description: description.trim() || null,
        },
        initialData?.id
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save education");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">
            {initialData ? "Edit Education" : "Add Education"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Institution / University <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Indian Institute of Technology, Madras"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Degree <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech / B.S. / M.S."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Field of Study</label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Start Year</label>
              <input
                type="number"
                min="1950"
                max="2050"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="2020"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">End Year</label>
              <input
                type="number"
                min="1950"
                max="2050"
                disabled={isCurrent}
                value={isCurrent ? "" : endYear}
                onChange={(e) => setEndYear(e.target.value ? parseInt(e.target.value) : "")}
                placeholder={isCurrent ? "Present" : "2024"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edu-is-current"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <label htmlFor="edu-is-current" className="text-xs text-slate-300 cursor-pointer">
              I am currently studying here
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Grade / CGPA</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. 8.9 CGPA or First Class"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Activities / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key coursework, honors, or thesis..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : initialData ? "Update Education" : "Add Education"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

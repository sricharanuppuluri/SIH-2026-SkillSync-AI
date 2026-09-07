"use client";

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { skillsAPI } from "@/lib/api";
import { Skill } from "@/types/employer";
import { ProficiencyLevel } from "@/types/candidate";
import { Button } from "@/components/ui/Button";

interface CandidateSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSkill: (skillId: string, proficiency: ProficiencyLevel, years: number) => Promise<void>;
  existingSkillIds: Set<string>;
}

const PROFICIENCIES: ProficiencyLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export function CandidateSkillModal({
  isOpen,
  onClose,
  onAddSkill,
  existingSkillIds,
}: CandidateSkillModalProps) {
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [proficiency, setProficiency] = useState<ProficiencyLevel>("INTERMEDIATE");
  const [yearsExperience, setYearsExperience] = useState<number>(1.0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const data = await skillsAPI.list();
        setCatalog(data);
        const firstAvailable = data.find((s) => !existingSkillIds.has(s.id));
        if (firstAvailable) setSelectedSkillId(firstAvailable.id);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load skill catalog");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [isOpen, existingSkillIds]);

  if (!isOpen) return null;

  const filtered = catalog.filter(
    (s) =>
      !existingSkillIds.has(s.id) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAddSkill(selectedSkillId, proficiency, Number(yearsExperience) || 0);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to attach skill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Add Canonical Skill</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-lg">
              {error}
            </div>
          )}

          {/* Skill Filter & Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Select Canonical Skill
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter catalog..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              disabled={loading || filtered.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {filtered.length === 0 ? (
                <option value="">
                  {loading ? "Loading catalog..." : "No matching skills available"}
                </option>
              ) : (
                filtered.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Proficiency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Proficiency Level</label>
              <select
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {PROFICIENCIES.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Years of Experience */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Years of Experience
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !selectedSkillId}
            >
              {submitting ? "Attaching..." : "Add Skill"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

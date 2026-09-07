"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Sliders,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { candidateAPI } from "@/lib/candidateApi";
import { CandidateSkill, ProficiencyLevel } from "@/types/candidate";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { CandidateSkillModal } from "@/components/candidate/CandidateSkillModal";

const PROFICIENCIES: ProficiencyLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export default function CandidateSkillsPage() {
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [proficiencyFilter, setProficiencyFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await candidateAPI.listSkills();
      setSkills(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load candidate skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleAddSkill = async (
    skillId: string,
    proficiency: ProficiencyLevel,
    years: number
  ) => {
    await candidateAPI.addSkill({
      skill_id: skillId,
      proficiency,
      years_experience: years,
    });
    await loadSkills();
    setSuccessMsg("Skill attached successfully to your profile.");
  };

  const handleUpdateProficiency = async (skillId: string, prof: ProficiencyLevel) => {
    try {
      await candidateAPI.updateSkill(skillId, { proficiency: prof });
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId || s.skill_id === skillId ? { ...s, proficiency: prof } : s))
      );
      setSuccessMsg("Skill proficiency updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update proficiency");
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm("Are you sure you want to remove this skill from your competencies?"))
      return;
    try {
      await candidateAPI.deleteSkill(skillId);
      setSkills((prev) => prev.filter((s) => s.id !== skillId && s.skill_id !== skillId));
      setSuccessMsg("Skill removed.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  const existingSkillIds = new Set(skills.map((s) => s.skill_id));

  const filtered = skills.filter((s) => {
    const matchesSearch =
      s.skill_name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchesProf =
      proficiencyFilter === "ALL" || s.proficiency === proficiencyFilter;
    return matchesSearch && matchesProf;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            My Skills & Competencies
          </h1>
          <p className="text-xs text-slate-400">
            Attach verified canonical skills, select proficiency levels, and specify experience.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/tools/skill-extractor">
            <Button variant="secondary" size="sm" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Extract from Resume
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Skill
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-500 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your skills..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={proficiencyFilter}
            onChange={(e) => setProficiencyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Proficiencies</option>
            {PROFICIENCIES.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills Grid / List */}
      {loading ? (
        <LoadingState message="Loading your competencies..." className="py-16" />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 space-y-3">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">
            {skills.length === 0 ? "No skills added yet" : "No skills match your filter"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {skills.length === 0
              ? "Add skills from the canonical catalog to qualify for AI matching and job applications."
              : "Try adjusting your search keywords or proficiency filter."}
          </p>
          {skills.length === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Attach Your First Skill
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {item.skill_name}
                    </span>
                    {item.is_verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono text-indigo-400">{item.category}</span>
                    <span>•</span>
                    <span className="text-slate-500">{item.skill_type}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSkill(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors opacity-80 group-hover:opacity-100"
                  title="Remove skill"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Proficiency:
                  </label>
                  <select
                    value={item.proficiency}
                    onChange={(e) =>
                      handleUpdateProficiency(item.id, e.target.value as ProficiencyLevel)
                    }
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {PROFICIENCIES.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  {item.years_experience > 0 ? `${item.years_experience}y exp` : "Competency"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CandidateSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSkill={handleAddSkill}
        existingSkillIds={existingSkillIds}
      />
    </div>
  );
}

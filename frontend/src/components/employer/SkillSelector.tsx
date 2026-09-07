"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Search, Plus, Trash2, CheckCircle2, Sliders } from "lucide-react";
import { skillsAPI } from "@/lib/api";
import { Skill, JobSkillRequirement } from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface SelectedSkillItem extends JobSkillRequirement {
  skill_name: string;
  category?: string;
}

interface SkillSelectorProps {
  selectedSkills: SelectedSkillItem[];
  onChange: (skills: SelectedSkillItem[]) => void;
  disabled?: boolean;
}

const PROFICIENCY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

export function SkillSelector({ selectedSkills, onChange, disabled }: SkillSelectorProps) {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for currently adding skill
  const [activeSkillId, setActiveSkillId] = useState<string>("");
  const [proficiency, setProficiency] = useState<string>("INTERMEDIATE");
  const [weight, setWeight] = useState<number>(1.0);
  const [isRequired, setIsRequired] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const catalog = await skillsAPI.list();
        if (mounted) {
          setAvailableSkills(catalog);
          setActiveSkillId((prev) => prev || (catalog.length > 0 ? catalog[0].id : ""));
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load skill catalog");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedIds = new Set(selectedSkills.map((s) => s.skill_id));

  // Filter skills not yet selected and matching search
  const filteredSkills = availableSkills.filter(
    (skill) =>
      !selectedIds.has(skill.id) &&
      (skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSkill = () => {
    if (!activeSkillId) return;
    const skillObj = availableSkills.find((s) => s.id === activeSkillId);
    if (!skillObj || selectedIds.has(activeSkillId)) return;

    const newItem: SelectedSkillItem = {
      skill_id: skillObj.id,
      skill_name: skillObj.name,
      category: skillObj.category,
      minimum_proficiency: proficiency,
      weight: Number(weight) || 1.0,
      is_required: isRequired,
    };

    const updated = [...selectedSkills, newItem];
    onChange(updated);

    // Reset selection to next available if any
    const remaining = availableSkills.filter(
      (s) => s.id !== activeSkillId && !selectedIds.has(s.id)
    );
    if (remaining.length > 0) {
      setActiveSkillId(remaining[0].id);
    } else {
      setActiveSkillId("");
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    const updated = selectedSkills.filter((s) => s.skill_id !== skillId);
    onChange(updated);
  };

  const handleUpdateProficiency = (skillId: string, prof: string) => {
    const updated = selectedSkills.map((s) =>
      s.skill_id === skillId ? { ...s, minimum_proficiency: prof } : s
    );
    onChange(updated);
  };

  const handleUpdateWeight = (skillId: string, newWeight: number) => {
    const updated = selectedSkills.map((s) =>
      s.skill_id === skillId ? { ...s, weight: newWeight } : s
    );
    onChange(updated);
  };

  const handleToggleRequired = (skillId: string) => {
    const updated = selectedSkills.map((s) =>
      s.skill_id === skillId ? { ...s, is_required: !s.is_required } : s
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Skill Addition Control Panel */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Attach Skill Requirements
          </label>
          {loading && <span className="text-xs text-indigo-400 animate-pulse">Loading catalog...</span>}
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 p-2 rounded">
            {error}
          </p>
        )}

        {/* Skill Search and Dropdown Selection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter skill catalog..."
                disabled={disabled}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={activeSkillId}
              onChange={(e) => setActiveSkillId(e.target.value)}
              disabled={disabled || filteredSkills.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {filteredSkills.length === 0 ? (
                <option value="">
                  {availableSkills.length === 0 ? "No skills loaded" : "No matching skills"}
                </option>
              ) : (
                filteredSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] text-slate-400 block">Min Proficiency</label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {PROFICIENCY_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] text-slate-400 block">Weight (0.1 - 2.0)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="2.0"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-col justify-end gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                disabled={disabled}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-slate-900"
              />
              Required skill
            </label>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddSkill}
              disabled={disabled || !activeSkillId || filteredSkills.length === 0}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Skill
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Skills List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            Selected Skills ({selectedSkills.length})
          </span>
          {selectedSkills.length > 0 && (
            <span className="text-[11px] text-slate-500">Adjust proficiency & weight per skill</span>
          )}
        </div>

        {selectedSkills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
            No skills attached yet. Add required or preferred skills above from the catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {selectedSkills.map((item) => (
              <div
                key={item.skill_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-800/80 bg-slate-950/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-medium text-slate-200">{item.skill_name}</span>
                    {item.category && (
                      <span className="text-[10px] text-slate-500 ml-2 font-mono">
                        [{item.category}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  {/* Required / Preferred toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleRequired(item.skill_id)}
                    disabled={disabled}
                    className="cursor-pointer"
                  >
                    <Badge variant={item.is_required ? "indigo" : "secondary"}>
                      {item.is_required ? "Required" : "Preferred"}
                    </Badge>
                  </button>

                  {/* Proficiency Selector */}
                  <select
                    value={item.minimum_proficiency}
                    onChange={(e) => handleUpdateProficiency(item.skill_id, e.target.value)}
                    disabled={disabled}
                    aria-label={`Proficiency for ${item.skill_name}`}
                    className="bg-slate-900 border border-slate-700/60 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                  >
                    {PROFICIENCY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>

                  {/* Weight modifier */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/60 rounded px-2 py-1">
                    <Sliders className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">Weight:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={item.weight}
                      aria-label={`Weight for ${item.skill_name}`}
                      onChange={(e) =>
                        handleUpdateWeight(item.skill_id, parseFloat(e.target.value) || 1.0)
                      }
                      disabled={disabled}
                      className="w-12 bg-transparent text-[11px] text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(item.skill_id)}
                    disabled={disabled}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove skill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Search, X, Check, Tag, AlertCircle, Loader2 } from "lucide-react";
import { skillTaxonomyAPI } from "@/lib/api";
import { Skill, SkillBrief } from "@/types";

interface CourseSkillSelectorProps {
  selectedSkills: SkillBrief[];
  onChange: (skills: SkillBrief[]) => void;
  disabled?: boolean;
}

export function CourseSkillSelector({
  selectedSkills,
  onChange,
  disabled = false,
}: CourseSkillSelectorProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Skill[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

  // Debounced search for canonical skills
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const skills = await skillTaxonomyAPI.list({
          search: query.trim(),
          skill_status: "ACTIVE",
          limit: 10,
        });
        setResults(skills || []);
      } catch (err) {
        console.error("Failed to search canonical skills:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (skill: Skill) => {
    if (selectedSkills.some((s) => s.id === skill.id)) return;
    const newBrief: SkillBrief = {
      id: skill.id,
      name: skill.name,
      category: skill.category,
      skill_type: skill.skill_type,
      is_primary: selectedSkills.length === 0,
    };
    onChange([...selectedSkills, newBrief]);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const handleRemove = (skillId: string) => {
    onChange(selectedSkills.filter((s) => s.id !== skillId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Covered Canonical Skills <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs text-slate-500 font-mono">
          {selectedSkills.length} selected
        </span>
      </div>

      {/* Selected Skill Badges */}
      <div className="flex flex-wrap gap-2 min-h-[42px] p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
        {selectedSkills.length === 0 ? (
          <span className="text-xs text-slate-500 italic py-1 px-1">
            No canonical skills mapped yet. Search below to add skills from the authorized catalog.
          </span>
        ) : (
          selectedSkills.map((skill) => (
            <span
              key={skill.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 animate-in fade-in-50"
            >
              <Tag className="w-3 h-3 text-indigo-400" />
              <span>{skill.name}</span>
              {skill.category && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({skill.category})
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(skill.id)}
                  aria-label={`Remove ${skill.name}`}
                  className="hover:text-rose-400 text-slate-400 ml-1 transition-colors focus:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {/* Search Canonical Skill Input */}
      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search canonical skill catalog (e.g., Python, Docker, SQL)..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-indigo-400 animate-spin" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {hasSearched && query.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-56 overflow-y-auto rounded-lg bg-slate-900 border border-slate-800 shadow-xl shadow-black/60 py-1">
              {results.length === 0 ? (
                <div className="p-3 text-center text-xs text-amber-400/90 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Skill not found in the canonical catalog.</span>
                </div>
              ) : (
                results.map((skill) => {
                  const isSelected = selectedSkills.some((s) => s.id === skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleSelect(skill)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-slate-950/40 text-slate-500 cursor-not-allowed"
                          : "hover:bg-slate-800/80 text-slate-200"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{skill.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {skill.category && <span>Category: {skill.category}</span>}
                          {skill.skill_type && <span>• Type: {skill.skill_type}</span>}
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] text-indigo-400 font-mono">Select +</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

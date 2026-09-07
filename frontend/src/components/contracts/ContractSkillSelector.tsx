"use client";

import * as React from "react";
import { Search, Plus, Sparkles, AlertCircle } from "lucide-react";
import { skillsAPI } from "@/lib/api";
import {
  ContractEvidenceType,
  ContractRequirementImportance,
  ContractRequirementType,
  SkillContractRequirementCreate,
} from "@/types";
import { Skill } from "@/types/employer";
import { Button } from "@/components/ui/Button";

export interface ContractRequirementItem extends SkillContractRequirementCreate {
  skill_name: string;
  category?: string | null;
  skill_type?: string | null;
}

interface ContractSkillSelectorProps {
  existingRequirements: ContractRequirementItem[];
  onAddRequirement: (item: ContractRequirementItem) => void;
  disabled?: boolean;
}

const PROFICIENCIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const IMPORTANCES: ContractRequirementImportance[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const EVIDENCE_TYPES: { label: string; value: ContractEvidenceType }[] = [
  { label: "None (Self-Reported)", value: "NONE" },
  { label: "Verified Skill (Passport)", value: "VERIFIED_SKILL" },
  { label: "Course Completion", value: "COURSE_COMPLETION" },
  { label: "Accredited Certification", value: "CERTIFICATION" },
  { label: "Portfolio / Project", value: "PROJECT" },
  { label: "Work Experience", value: "WORK_EXPERIENCE" },
];

export function ContractSkillSelector({
  existingRequirements,
  onAddRequirement,
  disabled = false,
}: ContractSkillSelectorProps) {
  const [catalog, setCatalog] = React.useState<Skill[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Selected skill to add
  const [selectedSkillId, setSelectedSkillId] = React.useState<string>("");
  const [proficiency, setProficiency] = React.useState<string>("INTERMEDIATE");
  const [reqType, setReqType] = React.useState<ContractRequirementType>("REQUIRED");
  const [importance, setImportance] = React.useState<ContractRequirementImportance>("HIGH");
  const [evidenceType, setEvidenceType] = React.useState<ContractEvidenceType>("VERIFIED_SKILL");
  const [expMonths, setExpMonths] = React.useState<number>(12);
  const [notes, setNotes] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    async function fetchSkills() {
      setLoading(true);
      setError(null);
      try {
        const skills = await skillsAPI.list();
        if (mounted) {
          setCatalog(skills);
          if (skills.length > 0) {
            setSelectedSkillId(skills[0].id);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load canonical skill catalog");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchSkills();
    return () => {
      mounted = false;
    };
  }, []);

  const existingIds = React.useMemo(
    () => new Set(existingRequirements.map((r) => r.skill_id)),
    [existingRequirements]
  );

  const filteredCatalog = React.useMemo(() => {
    if (!searchTerm.trim()) return catalog;
    const q = searchTerm.toLowerCase();
    return catalog.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [catalog, searchTerm]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;

    const skillObj = catalog.find((s) => s.id === selectedSkillId);
    if (!skillObj) return;

    if (existingIds.has(selectedSkillId)) {
      setError(`Skill "${skillObj.name}" is already in this contract.`);
      return;
    }

    onAddRequirement({
      skill_id: selectedSkillId,
      skill_name: skillObj.name,
      category: skillObj.category,
      skill_type: skillObj.skill_type,
      required_proficiency: proficiency,
      requirement_type: reqType,
      importance,
      evidence_type: evidenceType,
      minimum_experience_months: Number(expMonths) || 0,
      notes: notes.trim() || null,
    });

    setNotes("");
    setError(null);
  };

  return (
    <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Add Canonical Skill Requirement</h3>
        </div>
        <span className="text-xs text-slate-400">
          Canonical Catalog ({catalog.length} skills)
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-4">
        {/* Search & Select Skill */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Search Catalog
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by skill or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={disabled || loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Canonical Skill
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => {
                setSelectedSkillId(e.target.value);
                setError(null);
              }}
              disabled={disabled || loading || filteredCatalog.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {filteredCatalog.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={existingIds.has(s.id)}
                >
                  {s.name} {s.category ? `(${s.category})` : ""} {existingIds.has(s.id) ? "— Added" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contract Specific Properties */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Proficiency
            </label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {PROFICIENCIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Requirement Type
            </label>
            <select
              value={reqType}
              onChange={(e) => setReqType(e.target.value as ContractRequirementType)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="REQUIRED">REQUIRED</option>
              <option value="PREFERRED">PREFERRED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Importance
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as ContractRequirementImportance)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {IMPORTANCES.map((imp) => (
                <option key={imp} value={imp}>
                  {imp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Evidence Required
            </label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as ContractEvidenceType)}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {EVIDENCE_TYPES.map((ev) => (
                <option key={ev.value} value={ev.value}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Min Experience (Mos)
            </label>
            <input
              type="number"
              min="0"
              max="240"
              value={expMonths}
              onChange={(e) => setExpMonths(Math.max(0, parseInt(e.target.value) || 0))}
              disabled={disabled}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Requirement Notes / Verification Criteria
          </label>
          <input
            type="text"
            placeholder="e.g. Production async microservices, verified via passport or portfolio"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={disabled || loading || !selectedSkillId}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Contract
          </Button>
        </div>
      </form>
    </div>
  );
}

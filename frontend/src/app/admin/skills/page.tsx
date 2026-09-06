"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { skillsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Skill,
  SkillType,
  SkillStatus,
  SkillCreateInput,
  SkillUpdateInput,
} from "@/types/skill";

const CATEGORIES = [
  "All Categories",
  "Programming",
  "Web",
  "Data",
  "AI/ML",
  "Cloud/DevOps",
  "Cybersecurity",
  "Soft Skills",
  "General",
];

const SKILL_TYPES: { label: string; value: string }[] = [
  { label: "All Types", value: "" },
  { label: "Technical", value: "TECHNICAL" },
  { label: "Soft Skill", value: "SOFT" },
  { label: "Tool", value: "TOOL" },
  { label: "Domain", value: "DOMAIN" },
  { label: "Certification", value: "CERTIFICATION" },
  { label: "Other", value: "OTHER" },
];

export default function AdminSkillsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Create / Edit Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<SkillCreateInput>({
    name: "",
    slug: "",
    category: "Programming",
    subcategory: "",
    skill_type: "TECHNICAL",
    description: "",
    status: "ACTIVE",
    parent_skill_id: "",
  });

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await skillsAPI.list({
        search: searchTerm || undefined,
        category: selectedCategory !== "All Categories" ? selectedCategory : undefined,
        skill_type: selectedType || undefined,
        skill_status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        limit: 200,
      });
      setSkills(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedType, selectedStatus]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Handle Quick Status Toggle
  const handleToggleStatus = async (skill: Skill) => {
    if (!isAdmin) return;
    const newStatus: SkillStatus = skill.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await skillsAPI.update(skill.id, { status: newStatus });
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, status: newStatus } : s))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle skill status");
    }
  };

  // Handle Delete Skill
  const handleDeleteSkill = async (skill: Skill) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete canonical skill "${skill.name}"?`)) return;
    try {
      await skillsAPI.delete(skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: "",
      slug: "",
      category: "Programming",
      subcategory: "",
      skill_type: "TECHNICAL",
      description: "",
      status: "ACTIVE",
      parent_skill_id: "",
    });
    setModalError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      subcategory: skill.subcategory || "",
      skill_type: skill.skill_type,
      description: skill.description || "",
      status: skill.status,
      parent_skill_id: skill.parent_skill_id || "",
    });
    setModalError(null);
  };

  // Save (Create or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError("Skill name is required");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      if (editingSkill) {
        const updatePayload: SkillUpdateInput = {
          name: formData.name,
          slug: formData.slug || undefined,
          category: formData.category,
          subcategory: formData.subcategory || undefined,
          skill_type: formData.skill_type,
          description: formData.description || undefined,
          status: formData.status,
          parent_skill_id: formData.parent_skill_id || null,
        };
        const updated = await skillsAPI.update(editingSkill.id, updatePayload);
        setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setEditingSkill(null);
      } else {
        const createPayload: SkillCreateInput = {
          name: formData.name,
          slug: formData.slug || undefined,
          category: formData.category,
          subcategory: formData.subcategory || undefined,
          skill_type: formData.skill_type,
          description: formData.description || undefined,
          status: formData.status,
          parent_skill_id: formData.parent_skill_id || undefined,
        };
        const created = await skillsAPI.create(createPayload);
        setSkills((prev) => [created, ...prev]);
        setIsCreateOpen(false);
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Metrics
  const totalCount = skills.length;
  const activeCount = skills.filter((s) => s.status === "ACTIVE").length;
  const inactiveCount = skills.filter((s) => s.status === "INACTIVE").length;

  return (
    <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Skill Intelligence Catalog
              </h1>
              <Badge variant="indigo">Deterministic Taxonomy</Badge>
              <Badge variant="secondary">Phase 5</Badge>
            </div>
            <p className="text-sm text-slate-400">
              Canonical skill repository powering graph relationships, deterministic aliases, and semantic integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                className="shadow-lg shadow-indigo-500/20"
                id="btn-add-skill"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Canonical Skill
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Skills</span>
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{totalCount}</p>
            <span className="text-[11px] text-slate-500">In current filter</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active Skills</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{activeCount}</p>
            <span className="text-[11px] text-slate-500">Publicly available</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Inactive Skills</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-2">{inactiveCount}</p>
            <span className="text-[11px] text-slate-500">Admin-only review</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Taxonomy Roles</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400 mt-2">
              {isAdmin ? "Admin Full" : "Catalog Read"}
            </p>
            <span className="text-[11px] text-slate-500">Role-governed</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search canonical name, slug, or alias..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                id="input-skill-search"
              />
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                id="select-category-filter"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                id="select-type-filter"
              >
                {SKILL_TYPES.map((t) => (
                  <option key={t.label} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                id="select-status-filter"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                {isAdmin && <option value="INACTIVE">Inactive Only</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Content Table / States */}
        {loading ? (
          <LoadingState message="Loading canonical skill catalog..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchSkills} />
        ) : skills.length === 0 ? (
          <EmptyState
            title="No skills found"
            description="No canonical skills match the applied search and filter criteria."
            action={
              isAdmin ? (
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create New Skill
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Skill Title &amp; Slug</th>
                    <th className="py-3 px-4 font-semibold">Taxonomy</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Hierarchy Parent</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {skills.map((skill) => (
                    <tr
                      key={skill.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                      id={`skill-row-${skill.slug}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/skills/${skill.id}`}
                            className="font-medium text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{skill.name}</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                          </Link>
                          <span className="text-[11px] text-slate-500 font-mono">
                            slug: {skill.slug}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-slate-200">{skill.category}</span>
                          {skill.subcategory && (
                            <span className="text-[10px] text-slate-500">
                              {skill.subcategory}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            skill.skill_type === "TECHNICAL"
                              ? "indigo"
                              : skill.skill_type === "SOFT"
                              ? "purple"
                              : skill.skill_type === "TOOL"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {skill.skill_type}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {skill.parent_name ? (
                          <span className="text-xs text-slate-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {skill.parent_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Root taxonomy</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(skill)}
                          disabled={!isAdmin}
                          title={isAdmin ? "Click to toggle status" : undefined}
                          className={isAdmin ? "cursor-pointer" : "cursor-default"}
                        >
                          <Badge variant={skill.status === "ACTIVE" ? "success" : "destructive"}>
                            {skill.status}
                          </Badge>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/admin/skills/${skill.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              title="View Skill Details, Aliases & Graph"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            </Button>
                          </Link>

                          {isAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(skill)}
                                className="h-7 px-2 text-xs"
                                title="Edit Skill Taxonomy"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-300" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSkill(skill)}
                                className="h-7 px-2 text-xs hover:border-rose-900/60 hover:text-rose-400"
                                title="Delete Skill"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create / Edit Canonical Skill */}
        {(isCreateOpen || editingSkill) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-base font-semibold text-white">
                    {editingSkill ? `Edit "${editingSkill.name}"` : "New Canonical Skill"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingSkill(null);
                  }}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg border border-rose-900/40 bg-rose-950/30 text-xs text-rose-300">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Skill Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Python"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">
                      Slug (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.slug || ""}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g. python"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Subcategory</label>
                    <input
                      type="text"
                      value={formData.subcategory || ""}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      placeholder="e.g. Backend"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Skill Type</label>
                    <select
                      value={formData.skill_type}
                      onChange={(e) =>
                        setFormData({ ...formData, skill_type: e.target.value as SkillType })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {SKILL_TYPES.filter((t) => t.value).map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as SkillStatus })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">
                    Parent Skill (Hierarchy)
                  </label>
                  <select
                    value={formData.parent_skill_id || ""}
                    onChange={(e) => setFormData({ ...formData, parent_skill_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None (Top-Level Skill)</option>
                    {skills
                      .filter((s) => !editingSkill || s.id !== editingSkill.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Canonical definition of the skill..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingSkill(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? "Saving..." : editingSkill ? "Save Changes" : "Create Skill"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
}

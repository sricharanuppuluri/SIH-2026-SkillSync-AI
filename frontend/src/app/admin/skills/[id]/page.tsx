"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  GitFork,
  Tag,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { skillsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  SkillDetail,
  SkillCatalogItem,
  SkillRelationshipType,
} from "@/types/skill";

export default function SkillDetailPage() {
  const params = useParams<{ id: string }>();
  const skillId = params.id;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alias Form
  const [newAlias, setNewAlias] = useState("");
  const [aliasSubmitting, setAliasSubmitting] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  // Relationship Form
  const [targetSkillId, setTargetSkillId] = useState("");
  const [relType, setRelType] = useState<SkillRelationshipType>("RELATED");
  const [weight, setWeight] = useState(1.0);
  const [relSubmitting, setRelSubmitting] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);

  // Fetch Skill Details and Catalog for Relationship linking
  const fetchSkillDetails = useCallback(async () => {
    if (!skillId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailData, catalogData] = await Promise.all([
        skillsAPI.get(skillId),
        skillsAPI.catalog({ limit: 100 }),
      ]);
      setSkill(detailData);
      setCatalog(catalogData.filter((item) => item.id !== skillId));
      if (catalogData.length > 0) {
        const defaultTarget = catalogData.find((item) => item.id !== skillId);
        if (defaultTarget) setTargetSkillId(defaultTarget.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load skill details");
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchSkillDetails();
  }, [fetchSkillDetails]);

  // Handle Add Alias
  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;
    setAliasSubmitting(true);
    setAliasError(null);
    try {
      const alias = await skillsAPI.addAlias(skillId, { alias: newAlias.trim() });
      setSkill((prev) => (prev ? { ...prev, aliases: [...prev.aliases, alias] } : null));
      setNewAlias("");
    } catch (err: unknown) {
      setAliasError(err instanceof Error ? err.message : "Failed to add alias");
    } finally {
      setAliasSubmitting(false);
    }
  };

  // Handle Delete Alias
  const handleDeleteAlias = async (aliasId: string) => {
    if (!isAdmin) return;
    try {
      await skillsAPI.deleteAlias(skillId, aliasId);
      setSkill((prev) =>
        prev ? { ...prev, aliases: prev.aliases.filter((a) => a.id !== aliasId) } : null
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove alias");
    }
  };

  // Handle Add Relationship
  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSkillId) return;
    setRelSubmitting(true);
    setRelError(null);
    try {
      const rel = await skillsAPI.addRelationship(skillId, {
        target_skill_id: targetSkillId,
        relationship_type: relType,
        weight: Number(weight) || 1.0,
      });
      setSkill((prev) =>
        prev ? { ...prev, outbound_relationships: [rel, ...prev.outbound_relationships] } : null
      );
    } catch (err: unknown) {
      setRelError(err instanceof Error ? err.message : "Failed to add relationship");
    } finally {
      setRelSubmitting(false);
    }
  };

  // Handle Delete Relationship
  const handleDeleteRelationship = async (relId: string) => {
    if (!isAdmin) return;
    try {
      await skillsAPI.deleteRelationship(skillId, relId);
      setSkill((prev) =>
        prev
          ? {
              ...prev,
              outbound_relationships: prev.outbound_relationships.filter((r) => r.id !== relId),
              inbound_relationships: prev.inbound_relationships.filter((r) => r.id !== relId),
            }
          : null
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove relationship");
    }
  };

  if (loading) {
    return <LoadingState message="Loading canonical skill details..." />;
  }

  if (error || !skill) {
    return (
      <ErrorState
        message={error || "Skill not found"}
        onRetry={fetchSkillDetails}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/skills"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Taxonomy Catalog
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant={skill.status === "ACTIVE" ? "success" : "destructive"}>
              {skill.status}
            </Badge>
            <Badge variant="indigo">{skill.skill_type}</Badge>
          </div>
        </div>

        {/* Hero Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">{skill.name}</h1>
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-indigo-400">
                  /{skill.slug}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                <span>Category: <strong className="text-slate-200">{skill.category}</strong></span>
                {skill.subcategory && (
                  <>
                    <span>•</span>
                    <span>Subcategory: <strong className="text-slate-200">{skill.subcategory}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created {new Date(skill.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            {skill.description || "No official description provided for this canonical skill."}
          </p>
        </div>

        {/* 2-Column Layout for Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Hierarchy & Aliases */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hierarchy Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <GitFork className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Taxonomy Hierarchy</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Parent Skill
                  </span>
                  {skill.parent ? (
                    <Link
                      href={`/admin/skills/${skill.parent.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-indigo-500/40 text-slate-200 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-medium">{skill.parent.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({skill.parent.category})
                      </span>
                    </Link>
                  ) : (
                    <span className="text-slate-500 italic">No parent (Top-level skill)</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                    Child Skills ({skill.children.length})
                  </span>
                  {skill.children.length === 0 ? (
                    <span className="text-slate-500 italic">No child sub-skills</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skill.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/admin/skills/${child.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs transition-colors"
                        >
                          <span>{child.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Aliases Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Deterministic Aliases ({skill.aliases.length})
                  </h2>
                </div>
              </div>

              {aliasError && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-900/40 text-xs text-rose-300">
                  {aliasError}
                </div>
              )}

              {/* Add Alias Input (Admin Only) */}
              {isAdmin && (
                <form onSubmit={handleAddAlias} className="flex gap-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    placeholder="Add alias (e.g. py, python3)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    id="input-new-alias"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={aliasSubmitting || !newAlias.trim()}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </form>
              )}

              {/* Aliases Tags */}
              <div className="flex flex-wrap gap-2 pt-1">
                {skill.aliases.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No registered synonyms</span>
                ) : (
                  skill.aliases.map((alias) => (
                    <div
                      key={alias.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
                    >
                      <span>{alias.alias}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAlias(alias.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5"
                          title="Delete alias"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Graph Relationships */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Skill Graph Relationships</h2>
                </div>
                <Badge variant="outline">
                  {skill.outbound_relationships.length + skill.inbound_relationships.length} edges
                </Badge>
              </div>

              {/* Add Relationship Form (Admin Only) */}
              {isAdmin && (
                <form
                  onSubmit={handleAddRelationship}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-3"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Link New Graph Edge</span>
                  </div>

                  {relError && (
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-900/40 text-xs text-rose-300">
                      {relError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 block">
                        Target Skill
                      </label>
                      <select
                        value={targetSkillId}
                        onChange={(e) => setTargetSkillId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        id="select-target-skill"
                      >
                        {catalog.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 block">
                        Relationship Type
                      </label>
                      <select
                        value={relType}
                        onChange={(e) => setRelType(e.target.value as SkillRelationshipType)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        id="select-rel-type"
                      >
                        <option value="RELATED">RELATED</option>
                        <option value="PREREQUISITE">PREREQUISITE</option>
                        <option value="COMPLEMENTARY">COMPLEMENTARY</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 block">
                        Weight (0.1 - 2.0)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="2.0"
                        value={weight}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        id="input-rel-weight"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={relSubmitting || !targetSkillId}
                      className="h-8 text-xs"
                      id="btn-add-relationship"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Relationship Edge
                    </Button>
                  </div>
                </form>
              )}

              {/* Outbound Relationships */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Outbound Edges ({skill.name} → Target)
                </span>
                {skill.outbound_relationships.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 italic bg-slate-950/40 rounded-lg border border-slate-800/60">
                    No outbound relationships established
                  </div>
                ) : (
                  <div className="space-y-2">
                    {skill.outbound_relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              rel.relationship_type === "PREREQUISITE"
                                ? "warning"
                                : rel.relationship_type === "COMPLEMENTARY"
                                ? "purple"
                                : "default"
                            }
                          >
                            {rel.relationship_type}
                          </Badge>
                          <Link
                            href={`/admin/skills/${rel.target_skill_id}`}
                            className="text-xs font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                          >
                            {rel.target_skill_name || "Target Skill"}
                          </Link>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-400">
                            weight: {rel.weight}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Delete relationship"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inbound Relationships */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Inbound Edges (Source → {skill.name})
                </span>
                {skill.inbound_relationships.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 italic bg-slate-950/40 rounded-lg border border-slate-800/60">
                    No inbound relationships pointing here
                  </div>
                ) : (
                  <div className="space-y-2">
                    {skill.inbound_relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/skills/${rel.source_skill_id}`}
                            className="text-xs font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                          >
                            {rel.source_skill_name || "Source Skill"}
                          </Link>
                          <Badge
                            variant={
                              rel.relationship_type === "PREREQUISITE"
                                ? "warning"
                                : rel.relationship_type === "COMPLEMENTARY"
                                ? "purple"
                                : "default"
                            }
                          >
                            {rel.relationship_type}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-400">
                            weight: {rel.weight}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Delete relationship"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { candidateAPI } from "@/lib/candidateApi";
import {
  CandidateExperience,
  CandidateExperienceCreateData,
} from "@/types/candidate";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ExperienceModal } from "@/components/candidate/ExperienceModal";

export default function CandidateExperiencePage() {
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<CandidateExperience | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadExperiences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await candidateAPI.listExperience();
      setExperiences(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load experience records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const handleSave = async (data: CandidateExperienceCreateData, id?: string) => {
    if (id) {
      await candidateAPI.updateExperience(id, data);
      setSuccessMsg("Experience record updated successfully.");
    } else {
      await candidateAPI.addExperience(data);
      setSuccessMsg("Experience record added successfully.");
    }
    await loadExperiences();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this work experience entry?")) return;
    try {
      await candidateAPI.deleteExperience(id);
      setExperiences((prev) => prev.filter((e) => e.id !== id));
      setSuccessMsg("Experience entry deleted.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete experience");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Work & Professional Experience
          </h1>
          <p className="text-xs text-slate-400">
            Showcase your employment history, role responsibilities, projects, and impact.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setSelectedExp(null);
            setIsModalOpen(true);
          }}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Experience
        </Button>
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

      {/* Experience List */}
      {loading ? (
        <LoadingState message="Loading career history..." className="py-16" />
      ) : experiences.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No work experience added</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Adding past jobs, internships, or freelance roles boosts your vector similarity match score for jobs.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedExp(null);
              setIsModalOpen(true);
            }}
            className="text-xs mt-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Your First Role
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{exp.title}</h3>
                  {exp.is_current && <Badge variant="indigo">Current Role</Badge>}
                  {exp.employment_type && (
                    <Badge variant="secondary">{exp.employment_type}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{exp.company}</span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {exp.start_date || "?"} – {exp.is_current ? "Present" : exp.end_date || "?"}
                  </span>
                  {exp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {exp.location}
                    </span>
                  )}
                </div>

                {exp.description && (
                  <p className="text-xs text-slate-300 pt-2 border-t border-slate-800/60 leading-relaxed whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                <button
                  onClick={() => {
                    setSelectedExp(exp);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit experience"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete experience"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ExperienceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={selectedExp}
      />
    </div>
  );
}

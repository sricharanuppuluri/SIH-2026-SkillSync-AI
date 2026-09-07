"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building,
  CheckCircle2,
} from "lucide-react";
import { candidateAPI } from "@/lib/candidateApi";
import {
  CandidateEducation,
  CandidateEducationCreateData,
} from "@/types/candidate";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EducationModal } from "@/components/candidate/EducationModal";

export default function CandidateEducationPage() {
  const [educations, setEducations] = useState<CandidateEducation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState<CandidateEducation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadEducation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await candidateAPI.listEducation();
      setEducations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load education records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEducation();
  }, []);

  const handleSave = async (data: CandidateEducationCreateData, id?: string) => {
    if (id) {
      await candidateAPI.updateEducation(id, data);
      setSuccessMsg("Education record updated successfully.");
    } else {
      await candidateAPI.addEducation(data);
      setSuccessMsg("Education record added successfully.");
    }
    await loadEducation();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education record?")) return;
    try {
      await candidateAPI.deleteEducation(id);
      setEducations((prev) => prev.filter((e) => e.id !== id));
      setSuccessMsg("Education record deleted.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete education");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            Education & Qualifications
          </h1>
          <p className="text-xs text-slate-400">
            Document your degrees, diplomas, universities, and academic milestones.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setSelectedEdu(null);
            setIsModalOpen(true);
          }}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Education
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

      {/* Education List */}
      {loading ? (
        <LoadingState message="Loading education history..." className="py-16" />
      ) : educations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No education history added</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Adding your academic credentials validates your educational background for employer requisitions.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedEdu(null);
              setIsModalOpen(true);
            }}
            className="text-xs mt-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Your First Degree
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {educations.map((edu) => (
            <div
              key={edu.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{edu.degree}</h3>
                  {edu.is_current && <Badge variant="indigo">Currently Studying</Badge>}
                </div>

                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium">{edu.institution}</span>
                </div>

                {edu.field_of_study && (
                  <p className="text-xs text-slate-400 font-mono">
                    Field: {edu.field_of_study}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {edu.start_year || "?"} – {edu.is_current ? "Present" : edu.end_year || "?"}
                  </span>
                  {edu.grade && <span>• Grade: <strong className="text-slate-300">{edu.grade}</strong></span>}
                </div>

                {edu.description && (
                  <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    {edu.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                <button
                  onClick={() => {
                    setSelectedEdu(edu);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit education"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(edu.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete education"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <EducationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={selectedEdu}
      />
    </div>
  );
}

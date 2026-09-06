"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Save, CheckCircle } from "lucide-react";
import { employerAPI } from "@/lib/api";
import {
  EmploymentType,
  ExperienceLevel,
  JobCreatePayload,
} from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkillSelector, SelectedSkillItem } from "@/components/employer/SkillSelector";

export default function CreateJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("MID");
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkillItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: JobCreatePayload = {
      title: title.trim(),
      description: description.trim(),
      location_city: locationCity.trim() || undefined,
      location_state: locationState.trim() || undefined,
      is_remote: isRemote,
      employment_type: employmentType,
      experience_level: experienceLevel,
      status: publish ? "PUBLISHED" : "DRAFT",
      salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
      salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
      skills: selectedSkills.map((s) => ({
        skill_id: s.skill_id,
        is_required: s.is_required,
        minimum_proficiency: s.minimum_proficiency,
        weight: s.weight,
      })),
    };

    try {
      const created = await employerAPI.createJob(payload);
      router.push(`/employer/jobs/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job requisition");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Create Job Requisition
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Post a structured job vacancy with deterministic skill contracts.
          </p>
        </div>
        <Link href="/employer/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Jobs
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Job Details & Role Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Job Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Backend Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Job Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={6}
              placeholder="Describe the role responsibilities, team environment, and mission..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Grid: Employment Type, Experience Level, Remote Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ENTRY">Entry Level</option>
                <option value="MID">Mid Level</option>
                <option value="SENIOR">Senior</option>
                <option value="LEAD">Lead / Staff</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900"
                />
                <span className="text-xs text-slate-300">Remote eligible position</span>
              </label>
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">City</label>
              <input
                type="text"
                placeholder="e.g. San Francisco"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                State / Province
              </label>
              <input
                type="text"
                placeholder="e.g. California"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Salary Min ($)
              </label>
              <input
                type="number"
                placeholder="e.g. 90000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Salary Max ($)
              </label>
              <input
                type="number"
                placeholder="e.g. 140000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Skill Selector Component */}
          <div className="pt-4 border-t border-slate-800">
            <SkillSelector
              selectedSkills={selectedSkills}
              onChange={setSelectedSkills}
              disabled={loading}
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={loading}
              onClick={() => handleSubmit(false)}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={loading}
              onClick={() => handleSubmit(true)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Publish Requisition
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

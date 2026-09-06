"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Save,
  CheckCircle2,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import { candidateAPI } from "@/lib/candidateApi";
import {
  CandidateProfile,
  CandidateResumeUploadData,
  ProfileCompleteness,
} from "@/types/candidate";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProfileCompletenessBar } from "@/components/candidate/ProfileCompletenessBar";
import { ResumeUploadModal } from "@/components/candidate/ResumeUploadModal";

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [educationLevel, setEducationLevel] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [profData, compData] = await Promise.all([
        candidateAPI.getProfile(),
        candidateAPI.getCompleteness(),
      ]);
      setProfile(profData);
      setCompleteness(compData);

      setFullName(profData.full_name || "");
      setHeadline(profData.headline || "");
      setCurrentRole(profData.current_role || "");
      setBio(profData.bio || "");
      setExperienceYears(profData.experience_years ?? "");
      setEducationLevel(profData.education_level || "");
      setLocationCity(profData.location_city || "");
      setLocationState(profData.location_state || "");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load candidate profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updated = await candidateAPI.updateProfile({
        full_name: fullName.trim(),
        headline: headline.trim() || null,
        current_role: currentRole.trim() || null,
        bio: bio.trim() || null,
        experience_years: experienceYears !== "" ? Number(experienceYears) : 0,
        education_level: educationLevel.trim() || null,
        location_city: locationCity.trim() || null,
        location_state: locationState.trim() || null,
      });
      setProfile(updated);
      const newComp = await candidateAPI.getCompleteness();
      setCompleteness(newComp);
      setSuccessMsg("Profile saved successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (data: CandidateResumeUploadData) => {
    try {
      await candidateAPI.uploadResume(data);
      await loadData();
      setSuccessMsg("Resume uploaded and attached successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload resume");
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm("Are you sure you want to remove your attached resume?")) return;
    try {
      await candidateAPI.deleteResume();
      await loadData();
      setSuccessMsg("Resume removed.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove resume");
    }
  };

  if (loading) {
    return <LoadingState message="Loading candidate profile..." className="py-20" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Candidate Profile
          </h1>
          <p className="text-xs text-slate-400">
            Manage your personal identity, bio, career summary, and resume metadata.
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Completeness Bar */}
      {completeness && <ProfileCompletenessBar completeness={completeness} />}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Basic Details */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sricharan Uppuluri"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email (Account)</label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Full-Stack AI & Distributed Systems Engineer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Current Role / Title</label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. Software Engineer or Student"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Years of Experience</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) =>
                  setExperienceYears(e.target.value !== "" ? parseFloat(e.target.value) : "")
                }
                placeholder="e.g. 3.5"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Education Level</label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select highest education...</option>
                <option value="High School">High School</option>
                <option value="Diploma / Vocational">Diploma / Vocational</option>
                <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                <option value="Master's Degree">Master&apos;s Degree</option>
                <option value="Doctorate / PhD">Doctorate / PhD</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">City</label>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">State / Region</label>
              <input
                type="text"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                placeholder="e.g. Telangana"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bio / Summary */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
            Professional Summary
          </h3>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Bio / Objective (min 20 characters for completeness points)
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Highlight your technical background, domain specialization, core strengths, and career ambitions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Saving Changes..." : "Save Profile"}
          </Button>
        </div>
      </form>

      {/* Section 3: Resume Attachment */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Attached Resume</h3>
            <p className="text-xs text-slate-400">
              Manage your uploaded curriculum vitae for employer visibility
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsResumeModalOpen(true)}
            className="text-xs"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {profile?.resume_filename ? "Replace Resume" : "Upload Resume"}
          </Button>
        </div>

        {profile?.resume_filename ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200">
                  {profile.resume_filename}
                </div>
                <div className="text-[10px] text-slate-400">
                  {profile.resume_file_size
                    ? `${(profile.resume_file_size / 1024).toFixed(1)} KB`
                    : "Uploaded"}
                  {profile.resume_uploaded_at &&
                    ` • ${new Date(profile.resume_uploaded_at).toLocaleDateString()}`}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteResume}
              className="text-slate-400 hover:text-rose-400 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No resume uploaded yet.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResumeModalOpen(true)}
              className="text-xs"
            >
              Upload PDF or DOCX
            </Button>
          </div>
        )}
      </div>

      {/* Resume Modal */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onUpload={handleResumeUpload}
        currentFilename={profile?.resume_filename}
      />
    </div>
  );
}

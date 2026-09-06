"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { trainingProviderAPI } from "@/lib/trainingApi";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TrainingProviderProfilePage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Form fields
  const [orgName, setOrgName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [accreditation, setAccreditation] = React.useState("");

  React.useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        setError(null);
        const p = await trainingProviderAPI.getProfile();
        setOrgName(p.organization_name || "");
        setDescription(p.description || "");
        setWebsiteUrl(p.website_url || "");
        setContactEmail(p.contact_email || "");
        setContactPhone(p.contact_phone || "");
        setAddress(p.address || "");
        setAccreditation(p.accreditation || "");
      } catch (err: unknown) {
        console.error("Failed to load provider profile:", err);
        const msg = err instanceof Error ? err.message : "Failed to load provider profile.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      await trainingProviderAPI.updateProfile({
        organization_name: orgName.trim(),
        description: description.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        accreditation: accreditation.trim() || undefined,
      });

      setSuccessMsg("Training provider profile updated successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading training provider profile..." className="py-24" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between">
        <Link
          href="/training-provider/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Provider Settings</span>
      </div>

      {/* Main Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Institution Profile
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Training Provider Identity
        </h1>
        <p className="text-xs text-slate-400">
          Manage your organization details, accreditation, and contact information visible across published vocational curricula.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Organization / Institute Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g., California Tech Vocational Academy"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            About Organization & Mission
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specializations, industry partnerships, and pedagogical approach..."
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.edu"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Contact Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admissions@example.edu"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Accreditation / Board</label>
            <div className="relative">
              <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={accreditation}
                onChange={(e) => setAccreditation(e.target.value)}
                placeholder="e.g., State Vocational Board, ISO 9001"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Campus / Headquarters Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 500 Silicon Ave, Tech District, CA"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}

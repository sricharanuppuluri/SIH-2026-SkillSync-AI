"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Save,
  Globe,
  MapPin,
  CheckCircle,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { employerAPI } from "@/lib/api";
import { EmployerProfileUpdatePayload } from "@/types/employer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function EmployerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerAPI.getProfile();
      const p = res.profile;
      if (p) {
        setCompanyName(p.company_name || "");
        setCompanyDescription(p.company_description || "");
        setIndustry(p.industry || "");
        setLocationCity(p.location_city || "");
        setLocationState(p.location_state || "");
        setWebsiteUrl(p.website_url || "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load company profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload: EmployerProfileUpdatePayload = {
      company_name: companyName.trim(),
      company_description: companyDescription.trim() || undefined,
      industry: industry.trim() || undefined,
      location_city: locationCity.trim() || undefined,
      location_state: locationState.trim() || undefined,
      website_url: websiteUrl.trim() || undefined,
    };

    try {
      await employerAPI.updateProfile(payload);
      setSuccessMessage("Company profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading employer profile..." className="py-20" />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Company Profile & Branding
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your company details displayed on public job requisitions.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {successMessage}
        </div>
      )}

      {error && (
        <ErrorState
          title="Profile Error"
          message={error}
          onRetry={fetchProfile}
          className="my-2"
        />
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Company Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Industry */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Industry Sector
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence, FinTech, Healthcare"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Website URL
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Location City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Headquarters City
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Austin"
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  State / Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. Texas"
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Company Description / Bio */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Company Description
              </label>
              <textarea
                rows={5}
                placeholder="Tell prospective candidates about your company mission, culture, and achievements..."
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

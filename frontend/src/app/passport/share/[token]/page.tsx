"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Award,
  ShieldCheck,
  AlertCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { passportAPI } from "@/lib/passportApi";
import { PublicPassportResponse, VerifiedSkillItem } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function PublicPassportSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [passport, setPassport] = useState<PublicPassportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPublicPassport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await passportAPI.getPublicPassport(token);
      setPassport(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Shared skill passport not found or sharing has been revoked."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPublicPassport();
  }, [loadPublicPassport]);

  if (loading) {
    return <LoadingState message="Verifying shared competency credentials..." />;
  }

  if (error || !passport) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState
          title="Shared Passport Unavailable"
          message={error || "This shared skill passport could not be found."}
          onRetry={loadPublicPassport}
        />
      </div>
    );
  }

  const { candidate, stats, skills } = passport;
  const verifiedSkills = skills.filter((s) => s.status === "VERIFIED");
  const unverifiedSkills = skills.filter((s) => s.status !== "VERIFIED");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-8 sm:p-10 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-400 shadow-inner">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    VERIFIED SKILL PASSPORT
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white mt-1">
                  {candidate.full_name}
                </h1>
                {candidate.current_role && (
                  <p className="text-indigo-300 font-medium text-sm mt-0.5">
                    {candidate.current_role}
                  </p>
                )}
              </div>
            </div>

            {/* Verification Stamp */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-900/50 flex items-center gap-3 self-start sm:self-auto">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Evidence-Backed Verification</p>
                <p className="text-slate-400 text-[11px]">SkillSync AI Deterministic Engine</p>
              </div>
            </div>
          </div>

          {candidate.headline && (
            <p className="text-slate-300 text-sm italic">
              &ldquo;{candidate.headline}&rdquo;
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            {(candidate.location_city || candidate.location_state) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>
                  {[candidate.location_city, candidate.location_state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </span>
            )}

            {passport.shared_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Shared {new Date(passport.shared_at).toLocaleDateString()}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Verification Metrics Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-lg text-center space-y-1">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Verified Competencies
          </p>
          <p className="text-4xl font-extrabold text-white">
            {stats.verified_skills}
          </p>
          <p className="text-xs text-slate-400">Backed by completed training & certs</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-lg text-center space-y-1">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Evidence Items
          </p>
          <p className="text-4xl font-extrabold text-white">
            {stats.total_evidence_items}
          </p>
          <p className="text-xs text-slate-400">Auditable proof records</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/30 shadow-lg text-center space-y-1">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Verification Rate
          </p>
          <p className="text-4xl font-extrabold text-white">
            {stats.verification_coverage_pct}%
          </p>
          <p className="text-xs text-slate-400">Of total declared skillset</p>
        </div>
      </div>

      {/* Verified Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Verified Competencies</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            {verifiedSkills.length} Verified
          </span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-sm">
            No verified competencies on public record yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {verifiedSkills.map((skill) => (
              <PublicSkillCard key={skill.skill_id} skill={skill} />
            ))}
          </div>
        )}
      </div>

      {/* Self-Declared / Unverified Skills Section */}
      {unverifiedSkills.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <h2 className="text-xl font-bold text-slate-200">
                Self-Reported Skills (Unverified)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
              {unverifiedSkills.length} Self-Reported
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {unverifiedSkills.map((skill) => (
              <PublicSkillCard key={skill.skill_id} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicSkillCard({ skill }: { skill: VerifiedSkillItem }) {
  const isVerified = skill.status === "VERIFIED";

  return (
    <div
      className={`p-6 rounded-2xl border transition-all space-y-3 shadow-lg ${
        isVerified
          ? "bg-slate-900/90 border-emerald-500/40 shadow-emerald-950/10"
          : "bg-slate-900/60 border-slate-800/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{skill.skill_name}</h3>
          <p className="text-xs text-slate-400">
            {skill.category} • {skill.skill_type}
          </p>
        </div>

        {isVerified ? (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>VERIFIED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
            <span>SELF-REPORTED</span>
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
        <span className="font-semibold text-slate-400 block mb-0.5">Verification Basis:</span>
        {skill.verification_summary}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span>
          Method:{" "}
          <strong className="text-indigo-300 font-medium">
            {skill.verification_method.replace(/_/g, " ")}
          </strong>
        </span>
        {skill.verified_at && (
          <span>Verified {new Date(skill.verified_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

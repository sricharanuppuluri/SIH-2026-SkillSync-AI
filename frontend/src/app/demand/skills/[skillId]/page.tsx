"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Briefcase,
  Users,
  BookOpen,
  MapPin,
  Building2,
  Award,
  BarChart3,
  Zap,
  GraduationCap,
} from "lucide-react";
import { getSkillDemandDetail } from "@/lib/demandApi";
import type {
  SkillDemandDetailResponse,
  SkillShortageStatus,
} from "@/types/demand";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortageColor(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE": return "#ef4444";
    case "MODERATE_SHORTAGE": return "#f97316";
    case "BALANCED": return "#22c55e";
    case "SURPLUS": return "#3b82f6";
  }
}

function shortageLabel(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE": return "High Shortage";
    case "MODERATE_SHORTAGE": return "Moderate Shortage";
    case "BALANCED": return "Balanced";
    case "SURPLUS": return "Surplus";
  }
}

function ShortageIcon({ status }: { status: SkillShortageStatus }) {
  const color = shortageColor(status);
  switch (status) {
    case "HIGH_SHORTAGE":
      return <AlertTriangle className="w-5 h-5" style={{ color }} />;
    case "MODERATE_SHORTAGE":
      return <TrendingUp className="w-5 h-5" style={{ color }} />;
    case "BALANCED":
      return <CheckCircle2 className="w-5 h-5" style={{ color }} />;
    case "SURPLUS":
      return <TrendingDown className="w-5 h-5" style={{ color }} />;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: `${accent}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>{label}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon, accent = "#8b5cf6" }: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <h2
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#e2e8f0",
        fontSize: "15px",
        fontWeight: "700",
        margin: "0 0 16px",
      }}
    >
      {Icon && <Icon className="w-4 h-4" style={{ color: accent }} />}
      {children}
    </h2>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SkillDemandDetailPage() {
  const params = useParams();
  const skillId = params?.skillId as string;

  const [detail, setDetail] = useState<SkillDemandDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillId) return;
    setLoading(true);
    setError(null);
    getSkillDemandDetail(skillId)
      .then(setDetail)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to load skill detail";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [skillId]);

  const accent = detail ? shortageColor(detail.shortage_status) : "#8b5cf6";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "3px solid rgba(139,92,246,0.3)",
              borderTopColor: "#8b5cf6",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading skill intelligence…</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "#ef4444" }} />
          <h2 style={{ color: "#f1f5f9", marginBottom: "8px" }}>
            {error?.includes("404") ? "Skill Not Found" : "Failed to Load"}
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
            {error || "This skill could not be found in the catalog."}
          </p>
          <Link
            href="/demand"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(139,92,246,0.2)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#c4b5fd",
              padding: "10px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Demand Twin
          </Link>
        </div>
      </div>
    );
  }

  // Trend chart data
  const maxTrend = Math.max(...detail.historical_trends.map((t) => t.demand_count), 1);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "32px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── Back nav ── */}
        <Link
          href="/demand"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#64748b",
            textDecoration: "none",
            fontSize: "13px",
            marginBottom: "24px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#64748b")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skill Demand Twin
        </Link>

        {/* ── Hero ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent}12, rgba(255,255,255,0.03))`,
            border: `1px solid ${accent}30`,
            borderRadius: "20px",
            padding: "32px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  background: `${accent}25`,
                  border: `1px solid ${accent}50`,
                  color: accent,
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Rank #{detail.rank}
              </span>
              {detail.skill_type && (
                <span
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "3px 10px",
                    borderRadius: "6px",
                  }}
                >
                  {detail.skill_type}
                </span>
              )}
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#f1f5f9",
                letterSpacing: "-0.5px",
                margin: "0 0 6px",
              }}
            >
              {detail.skill_name}
            </h1>
            {detail.category && (
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 12px" }}>
                {detail.category}
              </p>
            )}
            {detail.description && (
              <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", margin: 0, maxWidth: "600px" }}>
                {detail.description}
              </p>
            )}
          </div>

          {/* Shortage Status */}
          <div
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}35`,
              borderRadius: "16px",
              padding: "20px 28px",
              textAlign: "center",
              minWidth: "180px",
            }}
          >
            <ShortageIcon status={detail.shortage_status} />
            <div style={{ fontSize: "16px", fontWeight: "700", color: accent, margin: "8px 0 2px" }}>
              {shortageLabel(detail.shortage_status)}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 4px" }}>
              {detail.demand_supply_ratio.toFixed(1)}x
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Demand / Supply ratio</div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <StatCard icon={Briefcase} label="Active Job Demand" value={detail.demand_count} accent="#8b5cf6" />
          <StatCard icon={Zap} label="Demand Share (%)" value={`${detail.demand_share_percentage.toFixed(1)}%`} accent="#6366f1" />
          <StatCard icon={Users} label="Verified Candidates" value={detail.supply.verified_candidates} accent="#22c55e" />
          <StatCard icon={Users} label="Unverified Candidates" value={detail.supply.unverified_candidates} accent="#64748b" />
          <StatCard icon={BookOpen} label="Training Courses" value={detail.published_courses_count} accent="#3b82f6" />
          <StatCard icon={GraduationCap} label="Training Providers" value={detail.training_providers_count} accent="#06b6d4" />
        </div>

        {/* ── Bottom Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Trend Chart */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={BarChart3} accent="#8b5cf6">
              Historical Demand Trend
            </SectionTitle>
            {detail.historical_trends.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>
                No historical data yet for this skill
              </p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px" }}>
                {detail.historical_trends.map((t) => {
                  const heightPct = Math.round((t.demand_count / maxTrend) * 100);
                  return (
                    <div
                      key={t.period_date}
                      title={`${t.period}: ${t.demand_count} jobs`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "default",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "700" }}>
                        {t.demand_count}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(heightPct, 4)}%`,
                          background: "linear-gradient(180deg, #8b5cf6, #6366f1)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.5s ease",
                          minHeight: "4px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#475569",
                          textAlign: "center",
                          transform: "rotate(-45deg)",
                          transformOrigin: "center",
                          whiteSpace: "nowrap",
                          width: "32px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={t.period}
                      >
                        {t.period.split(" ")[0].slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p style={{ color: "#475569", fontSize: "11px", marginTop: "12px" }}>
              Historical data only — no ML forecasting (Phase 14)
            </p>
          </div>

          {/* Industries */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={Building2} accent="#6366f1">
              Top Industries Demanding This Skill
            </SectionTitle>
            {detail.top_industries.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>
                No industry data available
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {detail.top_industries.map((ind) => (
                  <div key={ind.industry}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: "500" }}>
                        {ind.industry}
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {ind.demand_count} jobs ({ind.demand_share_percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${ind.demand_share_percentage}%`,
                          background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={MapPin} accent="#22c55e">
              Top Locations
            </SectionTitle>
            {detail.top_locations.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>
                No location data available
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {detail.top_locations.map((loc, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#e2e8f0" }}>
                        {loc.city}{loc.state ? `, ${loc.state}` : ""}
                        {loc.is_remote && (
                          <span style={{ marginLeft: "6px", fontSize: "10px", color: "#3b82f6", background: "rgba(59,130,246,0.15)", padding: "1px 6px", borderRadius: "4px" }}>
                            Remote
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8" }}>
                        {loc.demand_count} jobs
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {loc.demand_share_percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supply Breakdown */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={Award} accent="#22c55e">
              Candidate Supply Breakdown
            </SectionTitle>
            <p style={{ color: "#475569", fontSize: "11px", marginBottom: "16px" }}>
              Aggregate counts only — no personal data exposed
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Verified */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "13px", color: "#22c55e", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>{detail.supply.verified_candidates}</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: detail.supply.total_candidates > 0
                        ? `${(detail.supply.verified_candidates / detail.supply.total_candidates) * 100}%`
                        : "0%",
                      background: "linear-gradient(90deg, #22c55e, #16a34a)",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
              {/* Unverified */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600" }}>
                    Unverified (declared)
                  </span>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>{detail.supply.unverified_candidates}</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: detail.supply.total_candidates > 0
                        ? `${(detail.supply.unverified_candidates / detail.supply.total_candidates) * 100}%`
                        : "0%",
                      background: "rgba(100,116,139,0.5)",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
              {/* By Method */}
              {Object.keys(detail.supply.by_verification_method).length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#475569", marginBottom: "8px", fontWeight: "600" }}>
                    By Verification Method
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {Object.entries(detail.supply.by_verification_method).map(([method, count]) => (
                      <div key={method} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {method.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Related Skills */}
            {detail.related_skills.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", marginBottom: "10px" }}>
                  Related Skills
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {detail.related_skills.map((s) => (
                    <span
                      key={s}
                      style={{
                        background: "rgba(139,92,246,0.12)",
                        border: "1px solid rgba(139,92,246,0.25)",
                        color: "#c4b5fd",
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

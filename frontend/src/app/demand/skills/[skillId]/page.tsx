"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
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
  Sparkles,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  getSkillDemandDetail,
  getSkillDemandForecast,
} from "@/lib/demandApi";
import type {
  SkillDemandDetailResponse,
  SkillForecastResponse,
  SkillShortageStatus,
  DemandGrowthTrend,
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

function growthColor(trend: DemandGrowthTrend): string {
  switch (trend) {
    case "INCREASING": return "#22c55e";
    case "DECLINING": return "#ef4444";
    case "STABLE": return "#38bdf8";
  }
}

function formatModelName(model: string): string {
  switch (model) {
    case "holt": return "Holt Exponential Smoothing";
    case "linear_trend": return "Linear Trend Regression";
    case "baseline_fallback": return "Baseline Fallback";
    default: return model;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "18px 20px",
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
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon, accent = "#8b5cf6" }: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
  const [forecast, setForecast] = useState<SkillForecastResponse | null>(null);
  const [horizon, setHorizon] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkillData = useCallback(async () => {
    if (!skillId) return;
    setLoading(true);
    setError(null);
    try {
      const [dt, fc] = await Promise.all([
        getSkillDemandDetail(skillId),
        getSkillDemandForecast(skillId, 3),
      ]);
      setDetail(dt);
      setForecast(fc);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load skill detail";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  const handleHorizonChange = async (newHorizon: number) => {
    if (!skillId) return;
    setHorizon(newHorizon);
    setForecastLoading(true);
    try {
      const fc = await getSkillDemandForecast(skillId, newHorizon);
      setForecast(fc);
    } catch (err) {
      console.error("Failed to update skill forecast horizon:", err);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchSkillData();
  }, [fetchSkillData]);

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
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading skill intelligence &amp; forecast…</p>
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

  // Actual vs. Forecast combined chart points calculation
  const series = forecast?.combined_series || [];
  const maxSeriesValue = Math.max(
    ...series.map((s) => s.upper_bound ?? s.predicted_demand ?? s.actual_demand ?? 0),
    1
  );

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

          {/* Current vs Forecast Shortage Indicators */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {/* Current Shortage */}
            <div
              style={{
                background: `${accent}15`,
                border: `1px solid ${accent}35`,
                borderRadius: "16px",
                padding: "16px 20px",
                textAlign: "center",
                minWidth: "150px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Current Shortage
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: accent, margin: "6px 0 2px" }}>
                {shortageLabel(detail.shortage_status)}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 2px" }}>
                {detail.demand_supply_ratio.toFixed(1)}x
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Observed Ratio</div>
            </div>

            {/* Forecast Shortage */}
            {forecast && (
              <div
                style={{
                  background: `${shortageColor(forecast.forecasted_shortage_status)}15`,
                  border: `1px solid ${shortageColor(forecast.forecasted_shortage_status)}35`,
                  borderRadius: "16px",
                  padding: "16px 20px",
                  textAlign: "center",
                  minWidth: "150px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  <Sparkles className="w-3 h-3" />
                  Forecast Shortage
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: shortageColor(forecast.forecasted_shortage_status), margin: "6px 0 2px" }}>
                  {shortageLabel(forecast.forecasted_shortage_status)}
                </div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 2px" }}>
                  {forecast.forecasted_demand_supply_ratio.toFixed(1)}x
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Projected ({horizon}M)</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stat Cards (Observed Platform Data) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <StatCard icon={Briefcase} label="Active Job Demand" value={detail.demand_count} accent="#8b5cf6" subtitle="Actual Demand" />
          <StatCard icon={Zap} label="Demand Share (%)" value={`${detail.demand_share_percentage.toFixed(1)}%`} accent="#6366f1" subtitle="Market Share" />
          <StatCard icon={Users} label="Verified Candidates" value={detail.supply.verified_candidates} accent="#22c55e" subtitle="Verified Supply" />
          <StatCard icon={Users} label="Unverified Candidates" value={detail.supply.unverified_candidates} accent="#64748b" subtitle="Declared" />
          <StatCard icon={BookOpen} label="Training Courses" value={detail.published_courses_count} accent="#3b82f6" subtitle="Catalog" />
          <StatCard icon={GraduationCap} label="Training Providers" value={detail.training_providers_count} accent="#06b6d4" subtitle="Active Institutes" />
        </div>

        {/* ── Phase 14: Skill Demand Forecast & Projection Panel ── */}
        {forecast && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: "20px",
              padding: "28px",
              marginBottom: "24px",
            }}
          >
            {/* Forecast Panel Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles className="w-5 h-5" style={{ color: "#a855f7" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#f1f5f9", margin: 0 }}>
                    Skill Demand Forecast (1–12 Months)
                  </h2>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      background: "rgba(168,85,247,0.2)",
                      border: "1px solid rgba(168,85,247,0.4)",
                      color: "#c084fc",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      textTransform: "uppercase",
                    }}
                  >
                    Phase 14
                  </span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
                  Statistical multi-step projection with non-negative bounds and 95% confidence intervals.
                </p>
              </div>

              {/* Horizon Tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "12px", color: "#64748b", padding: "0 8px" }}>Horizon:</span>
                {[1, 3, 6, 12].map((h) => (
                  <button
                    key={h}
                    onClick={() => handleHorizonChange(h)}
                    disabled={forecastLoading}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: horizon === h ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
                      color: horizon === h ? "#ffffff" : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {h}M
                  </button>
                ))}
              </div>
            </div>

            {/* Forecast KPI Highlights */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              {/* Current Actual Demand */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Actual Demand</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#f1f5f9", marginTop: "4px" }}>{forecast.current_actual_demand}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Observed job postings</div>
              </div>

              {/* Forecast Demand */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Forecast Demand ({horizon}M)</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#c084fc", marginTop: "4px" }}>{forecast.forecasted_demand_end}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Predicted future demand</div>
              </div>

              {/* Expected Growth */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Growth</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: growthColor(forecast.growth_trend), marginTop: "4px" }}>
                  {forecast.expected_growth_percentage > 0 ? `+${forecast.expected_growth_percentage.toFixed(0)}%` : `${forecast.expected_growth_percentage.toFixed(0)}%`}
                </div>
                <div style={{ fontSize: "11px", color: growthColor(forecast.growth_trend), marginTop: "2px", fontWeight: "600" }}>
                  {forecast.growth_trend}
                </div>
              </div>

              {/* Confidence Range */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confidence Range (95%)</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#e2e8f0", marginTop: "6px" }}>
                  {forecast.monthly_forecasts[forecast.monthly_forecasts.length - 1]?.lower_bound ?? 0} – {forecast.monthly_forecasts[forecast.monthly_forecasts.length - 1]?.upper_bound ?? forecast.forecasted_demand_end}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Bounded range</div>
              </div>
            </div>

            {/* Growth Interpretation Text */}
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Activity className="w-5 h-5 flex-shrink-0" style={{ color: growthColor(forecast.growth_trend) }} />
              <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
                <span style={{ fontWeight: "700", color: "#f1f5f9" }}>Trend Signal: </span>
                {forecast.growth_interpretation}
              </div>
            </div>

            {/* ── Actual vs Forecast Chart Visualization ── */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <BarChart3 className="w-4 h-4" style={{ color: "#a855f7" }} />
                  Actual vs. Forecast Demand Progression
                </h3>
                <div style={{ display: "flex", gap: "16px", fontSize: "11px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#94a3b8" }}>
                    <span style={{ width: "10px", height: "10px", background: "#8b5cf6", borderRadius: "2px" }} />
                    Actual Demand (Observed)
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#c084fc" }}>
                    <span style={{ width: "10px", height: "10px", background: "#ec4899", borderRadius: "2px" }} />
                    Forecast Demand (Predicted)
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#64748b" }}>
                    <span style={{ width: "10px", height: "10px", background: "rgba(236,72,153,0.2)", border: "1px dashed #ec4899", borderRadius: "2px" }} />
                    95% Confidence Band
                  </span>
                </div>
              </div>

              {/* Chart Bars */}
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "14px",
                  padding: "24px 20px 16px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "10px",
                  minHeight: "180px",
                }}
              >
                {series.map((pt, idx) => {
                  const val = pt.data_type === "ACTUAL" ? (pt.actual_demand ?? 0) : (pt.predicted_demand ?? 0);
                  const heightPct = Math.round((val / maxSeriesValue) * 100);
                  const isForecast = pt.data_type === "FORECAST";

                  return (
                    <div
                      key={idx}
                      title={`${pt.month} (${pt.data_type}): ${val} ${isForecast && pt.lower_bound !== undefined ? `[${pt.lower_bound} - ${pt.upper_bound}]` : ""}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        height: "100%",
                        justifyContent: "flex-end",
                        position: "relative",
                      }}
                    >
                      {/* Value label */}
                      <span style={{ fontSize: "10px", color: isForecast ? "#ec4899" : "#8b5cf6", fontWeight: "700" }}>
                        {val}
                      </span>

                      {/* Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(heightPct, 6)}%`,
                          background: isForecast
                            ? "linear-gradient(180deg, #ec4899, #be185d)"
                            : "linear-gradient(180deg, #8b5cf6, #6366f1)",
                          borderRadius: "4px 4px 0 0",
                          border: isForecast ? "1px dashed rgba(255,255,255,0.4)" : "none",
                          transition: "height 0.4s ease",
                          minHeight: "6px",
                          position: "relative",
                        }}
                      />

                      {/* Month label */}
                      <span
                        style={{
                          fontSize: "9px",
                          color: isForecast ? "#c084fc" : "#64748b",
                          fontWeight: isForecast ? "700" : "400",
                          textAlign: "center",
                          transform: "rotate(-45deg)",
                          transformOrigin: "center",
                          whiteSpace: "nowrap",
                          width: "36px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "6px",
                        }}
                      >
                        {pt.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Metadata Disclosure Footer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                background: "rgba(0,0,0,0.2)",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.04)",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Forecasting Model: </span>
                <span style={{ color: "#cbd5e1", fontWeight: "600" }}>{formatModelName(forecast.model_used)}</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Historical Observations: </span>
                <span style={{ color: "#cbd5e1", fontWeight: "600" }}>{forecast.historical_observations_count} months</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Confidence Level: </span>
                <span style={{ color: "#cbd5e1", fontWeight: "600" }}>{(forecast.confidence_level * 100).toFixed(0)}% (±2σ)</span>
              </div>
              {forecast.evaluation_mae !== null && forecast.evaluation_mae !== undefined && (
                <div>
                  <span style={{ color: "#64748b" }}>Backtest MAE: </span>
                  <span style={{ color: "#cbd5e1", fontWeight: "600" }}>{forecast.evaluation_mae.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar className="w-3.5 h-3.5" />
              Forecasts are statistical estimates and are not guarantees of future job demand. Actual demand remains observed source of truth.
            </div>
          </div>
        )}

        {/* ── Bottom Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Historical Demand Trend (Observed) */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={BarChart3} accent="#8b5cf6">
              Observed Historical Demand
            </SectionTitle>
            {detail.historical_trends.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px", padding: "20px 0" }}>
                No historical data yet for this skill
              </p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px" }}>
                {detail.historical_trends.map((t) => {
                  const maxTrend = Math.max(...detail.historical_trends.map((tr) => tr.demand_count), 1);
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
              Observed historical job posting frequency across past 6 months.
            </p>
          </div>

          {/* Training Insight & Catalog */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <SectionTitle icon={BookOpen} accent="#3b82f6">
              Training Supply Insight
            </SectionTitle>
            {forecast ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <span style={{ color: "#94a3b8" }}>Forecast Demand ({horizon}M):</span>
                  <span style={{ color: "#c084fc", fontWeight: "700" }}>{forecast.forecasted_demand_end}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <span style={{ color: "#94a3b8" }}>Verified Candidate Supply:</span>
                  <span style={{ color: "#22c55e", fontWeight: "700" }}>{forecast.current_verified_supply}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <span style={{ color: "#94a3b8" }}>Available Training Supply:</span>
                  <span style={{ color: "#38bdf8", fontWeight: "700" }}>{forecast.available_training_courses_count} courses</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <span style={{ color: "#94a3b8" }}>Forecast Signal:</span>
                  <span style={{ color: growthColor(forecast.growth_trend), fontWeight: "700" }}>{forecast.training_insight}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: "#475569", fontSize: "13px", padding: "10px 0" }}>
                {detail.published_courses_count} courses available for this skill.
              </p>
            )}
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

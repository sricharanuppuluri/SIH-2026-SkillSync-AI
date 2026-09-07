"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Search,
  RefreshCw,
  Briefcase,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  getDemandOverview,
  listSkillDemand,
  getDemandForecastOverview,
} from "@/lib/demandApi";
import type {
  DemandOverviewResponse,
  SkillDemandSummaryItem,
  SkillShortageStatus,
  GlobalForecastOverviewResponse,
  DemandGrowthTrend,
} from "@/types/demand";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortageLabel(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE": return "High Shortage";
    case "MODERATE_SHORTAGE": return "Moderate Shortage";
    case "BALANCED": return "Balanced";
    case "SURPLUS": return "Surplus";
  }
}

function shortageColor(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE": return "#ef4444";
    case "MODERATE_SHORTAGE": return "#f97316";
    case "BALANCED": return "#22c55e";
    case "SURPLUS": return "#3b82f6";
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
    case "holt": return "Holt ES";
    case "linear_trend": return "Linear Trend";
    case "baseline_fallback": return "Baseline";
    default: return model;
  }
}

function ShortageIcon({ status }: { status: SkillShortageStatus }) {
  switch (status) {
    case "HIGH_SHORTAGE":
      return <AlertTriangle className="w-3.5 h-3.5" style={{ color: shortageColor(status) }} />;
    case "MODERATE_SHORTAGE":
      return <TrendingUp className="w-3.5 h-3.5" style={{ color: shortageColor(status) }} />;
    case "BALANCED":
      return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: shortageColor(status) }} />;
    case "SURPLUS":
      return <TrendingDown className="w-3.5 h-3.5" style={{ color: shortageColor(status) }} />;
  }
}

function KpiCard({
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
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backdropFilter: "blur(12px)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${accent}30`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: `${accent}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#f1f5f9",
            lineHeight: 1.1,
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function SkillRow({ item, index }: { item: SkillDemandSummaryItem; index: number }) {
  const barWidth = Math.min(item.demand_share_percentage * 3, 100);
  const statusColor = shortageColor(item.shortage_status);

  return (
    <Link href={`/demand/skills/${item.skill_id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr 120px 100px 100px 140px",
          alignItems: "center",
          gap: "16px",
          padding: "14px 20px",
          borderRadius: "12px",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
      >
        {/* Rank */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: index < 3 ? "#facc15" : "#64748b",
            textAlign: "center",
          }}
        >
          #{item.rank}
        </div>

        {/* Skill Name + Demand Bar */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0", marginBottom: "6px" }}>
            {item.skill_name}
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})`,
                borderRadius: "2px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* Demand count */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#e2e8f0" }}>
            {item.demand_count}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            {item.demand_share_percentage.toFixed(1)}% share
          </div>
        </div>

        {/* Supply */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>
            {item.verified_supply_count}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>verified</div>
        </div>

        {/* Ratio */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>
            {item.demand_supply_ratio.toFixed(1)}x
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>D/S ratio</div>
        </div>

        {/* Status badge */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "99px",
              background: `${statusColor}15`,
              border: `1px solid ${statusColor}40`,
              fontSize: "11px",
              fontWeight: "600",
              color: statusColor,
              whiteSpace: "nowrap",
            }}
          >
            <ShortageIcon status={item.shortage_status} />
            {shortageLabel(item.shortage_status)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DemandDashboardPage() {
  const [overview, setOverview] = useState<DemandOverviewResponse | null>(null);
  const [skills, setSkills] = useState<SkillDemandSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Phase 14 Forecast State
  const [horizon, setHorizon] = useState<number>(3);
  const [forecastData, setForecastData] = useState<GlobalForecastOverviewResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [shortageFilter, setShortageFilter] = useState<SkillShortageStatus | "">("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [activeTab, setActiveTab] = useState<"all" | "shortage" | "top">("all");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [ov, sk, fc] = await Promise.all([
        getDemandOverview(),
        listSkillDemand({ limit: 200 }),
        getDemandForecastOverview({ horizon: 3, limit: 10 }),
      ]);
      setOverview(ov);
      setSkills(sk);
      setForecastData(fc);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load demand data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleHorizonChange = async (newHorizon: number) => {
    setHorizon(newHorizon);
    setForecastLoading(true);
    try {
      const fc = await getDemandForecastOverview({ horizon: newHorizon, limit: 10 });
      setForecastData(fc);
    } catch (err) {
      console.error("Failed to update forecast horizon:", err);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSkills = React.useMemo(() => {
    let list = [...skills];
    if (activeTab === "shortage") {
      list = list.filter(
        (s) => s.shortage_status === "HIGH_SHORTAGE" || s.shortage_status === "MODERATE_SHORTAGE"
      );
    } else if (activeTab === "top") {
      list = list.filter((s) => s.demand_count > 0).slice(0, 10);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.skill_name.toLowerCase().includes(q));
    }
    if (shortageFilter) {
      list = list.filter((s) => s.shortage_status === shortageFilter);
    }
    if (sortDir === "asc") list = list.sort((a, b) => a.demand_count - b.demand_count);
    else list = list.sort((a, b) => b.demand_count - a.demand_count);
    return list;
  }, [skills, search, shortageFilter, sortDir, activeTab]);

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
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: "3px solid rgba(139,92,246,0.3)",
              borderTopColor: "#8b5cf6",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading Skill Demand Digital Twin…</p>
        </div>
      </div>
    );
  }

  if (error) {
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
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: "#ef4444" }} />
          <h2 style={{ color: "#f1f5f9", marginBottom: "8px", fontSize: "18px" }}>
            Failed to Load Demand Data
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>{error}</p>
          <button
            onClick={() => fetchData()}
            style={{
              background: "rgba(139,92,246,0.2)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#c4b5fd",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const kpis = overview?.kpis;

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
        input, select { outline: none; }
        input::placeholder { color: #475569; }
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 24px rgba(139,92,246,0.4)",
                }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: "#fff" }} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "26px",
                    fontWeight: "800",
                    color: "#f1f5f9",
                    letterSpacing: "-0.5px",
                    margin: 0,
                  }}
                >
                  Skill Demand Digital Twin &amp; Forecasting
                </h1>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                  Phases 13 &amp; 14 — Observed platform demand &amp; deterministic statistical forecasting
                </p>
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#fbbf24",
              }}
            >
              <Zap className="w-3 h-3" />
              Actual demand sourced strictly from platform data. Forecast demand generated by local statistical models.
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: "13px",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── KPI Cards (Actual Observed Platform Data) ── */}
        {kpis && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <KpiCard icon={Briefcase} label="Active Published Jobs" value={kpis.total_active_jobs} accent="#8b5cf6" subtitle="Actual Demand" />
            <KpiCard icon={Zap} label="Skills In Demand" value={kpis.unique_skills_in_demand} accent="#6366f1" subtitle="Observed Skills" />
            <KpiCard icon={Users} label="Verified Candidates" value={kpis.verified_candidate_supply} accent="#22c55e" subtitle="Verified Supply" />
            <KpiCard icon={BookOpen} label="Training Courses" value={kpis.published_training_courses} accent="#3b82f6" subtitle="Active Catalog" />
            <KpiCard icon={AlertTriangle} label="Skills in Shortage" value={kpis.skills_in_shortage} accent="#f97316" subtitle="Current Shortage" />
          </div>
        )}

        {/* ── Phase 14: Skill Demand Forecast Section ── */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Section Header with Horizon Switcher */}
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
                  Skill Demand Forecast
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
                    letterSpacing: "0.05em",
                  }}
                >
                  Phase 14
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
                Deterministic statistical projections across {horizon}-month horizon. Predictions are non-negative bounded.
              </p>
            </div>

            {/* Horizon Selector */}
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

          {/* Forecast Overview KPIs */}
          {forecastData && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Forecast Horizon</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#c4b5fd", marginTop: "4px" }}>{forecastData.horizon_months} Months</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Projected Demand</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9", marginTop: "4px" }}>{forecastData.total_forecasted_demand}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Growing Skill</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#22c55e", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {forecastData.top_growing_skills[0]?.skill_name || "N/A"}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Forecasted Shortage Skills</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#f97316", marginTop: "4px" }}>{forecastData.high_forecast_shortage_skills.length}</div>
              </div>
            </div>
          )}

          {/* Forecast Table */}
          <div
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 110px 110px 130px 130px 110px",
                gap: "12px",
                padding: "10px 16px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "11px",
                fontWeight: "600",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <div>Skill</div>
              <div style={{ textAlign: "center" }}>Actual Demand</div>
              <div style={{ textAlign: "center" }}>Forecast ({horizon}M)</div>
              <div style={{ textAlign: "center" }}>Expected Growth</div>
              <div style={{ textAlign: "center" }}>Confidence (95%)</div>
              <div style={{ textAlign: "center" }}>Forecast Shortage</div>
              <div style={{ textAlign: "center" }}>Model</div>
            </div>

            {/* Content */}
            {forecastData && forecastData.forecast_items && forecastData.forecast_items.length > 0 ? (
              forecastData.forecast_items.map((fc) => (
                <Link key={fc.skill_id} href={`/demand/skills/${fc.skill_id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 110px 110px 110px 130px 130px 110px",
                      gap: "12px",
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      alignItems: "center",
                      transition: "background 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Skill name */}
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{fc.skill_name}</span>
                      {fc.category && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{fc.category}</div>
                      )}
                    </div>

                    {/* Actual demand */}
                    <div style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
                      {fc.current_demand}
                    </div>

                    {/* Forecast Demand */}
                    <div style={{ textAlign: "center", fontSize: "14px", color: "#a855f7", fontWeight: "700" }}>
                      {fc.forecasted_demand}
                    </div>

                    {/* Growth % & badge */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: `${growthColor(fc.growth_trend)}15`,
                          color: growthColor(fc.growth_trend),
                        }}
                      >
                        {fc.growth_percentage > 0 ? `+${fc.growth_percentage.toFixed(0)}%` : `${fc.growth_percentage.toFixed(0)}%`}
                      </span>
                    </div>

                    {/* Confidence Range */}
                    <div style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                      {fc.lower_bound} – {fc.upper_bound}
                    </div>

                    {/* Forecast Shortage */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: `${shortageColor(fc.forecasted_shortage_status)}15`,
                          color: shortageColor(fc.forecasted_shortage_status),
                        }}
                      >
                        {shortageLabel(fc.forecasted_shortage_status)}
                      </span>
                    </div>

                    {/* Model */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.06)",
                          color: "#cbd5e1",
                        }}
                      >
                        {formatModelName(fc.model_used)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                No forecast projections available yet.
              </div>
            )}
          </div>

          {/* Forecast Disclaimer */}
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar className="w-3.5 h-3.5" />
            Forecasts are estimates and are not guarantees of future job demand. Actual platform job postings remain the source of truth.
          </div>
        </div>

        {/* ── Top & Shortage Leaderboard (Observed Phase 13 Data) ── */}
        {overview && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
            {/* Top Demanded */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <h3 style={{ color: "#e2e8f0", fontSize: "15px", fontWeight: "700", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                Most Demanded Skills (Observed)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {overview.top_demanded_skills.map((s, i) => (
                  <Link key={s.skill_id} href={`/demand/skills/${s.skill_id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: i === 0 ? "rgba(139,92,246,0.1)" : "transparent",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i === 0 ? "rgba(139,92,246,0.1)" : "transparent"; }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: "700", color: i === 0 ? "#facc15" : "#64748b", width: "24px", textAlign: "center" }}>
                        #{i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{s.skill_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{s.demand_count} jobs · {s.demand_share_percentage.toFixed(1)}% share</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: "#475569" }} />
                    </div>
                  </Link>
                ))}
                {overview.top_demanded_skills.length === 0 && (
                  <p style={{ color: "#475569", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                    No active job demand yet
                  </p>
                )}
              </div>
            </div>

            {/* Highest Shortage */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <h3 style={{ color: "#e2e8f0", fontSize: "15px", fontWeight: "700", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                Critical Skill Shortages (Observed)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {overview.highest_shortage_skills.map((s) => (
                  <Link key={s.skill_id} href={`/demand/skills/${s.skill_id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "transparent",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: s.shortage_status === "HIGH_SHORTAGE" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)",
                          color: s.shortage_status === "HIGH_SHORTAGE" ? "#ef4444" : "#f97316",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.shortage_status === "HIGH_SHORTAGE" ? "HIGH" : "MOD"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{s.skill_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{s.demand_supply_ratio.toFixed(1)}x ratio · {s.verified_supply_count} verified</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: "#475569" }} />
                    </div>
                  </Link>
                ))}
                {overview.highest_shortage_skills.length === 0 && (
                  <p style={{ color: "#475569", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                    No shortage skills detected
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── All Skills Table (Observed Platform Data) ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          {/* Table Header Controls */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
              {(["all", "shortage", "top"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: activeTab === tab ? "rgba(139,92,246,0.25)" : "transparent",
                    color: activeTab === tab ? "#c4b5fd" : "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "all" ? "All Skills" : tab === "shortage" ? "Shortages" : "Top 10"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <Search
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search skills…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  padding: "8px 12px 8px 36px",
                }}
              />
            </div>

            {/* Shortage Filter */}
            <select
              value={shortageFilter}
              onChange={(e) => setShortageFilter(e.target.value as SkillShortageStatus | "")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: shortageFilter ? "#e2e8f0" : "#64748b",
                fontSize: "13px",
                padding: "8px 12px",
              }}
            >
              <option value="">All Statuses</option>
              <option value="HIGH_SHORTAGE">High Shortage</option>
              <option value="MODERATE_SHORTAGE">Moderate Shortage</option>
              <option value="BALANCED">Balanced</option>
              <option value="SURPLUS">Surplus</option>
            </select>

            {/* Sort Direction */}
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
                padding: "8px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {sortDir === "desc" ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
              Demand
            </button>

            <span style={{ color: "#475569", fontSize: "12px", marginLeft: "auto" }}>
              {filteredSkills.length} skills
            </span>
          </div>

          {/* Column Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 120px 100px 100px 140px",
              gap: "16px",
              padding: "10px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {["#", "Skill", "Demand", "Supply", "D/S Ratio", "Status"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: h === "#" || h === "Demand" || h === "Supply" || h === "D/S Ratio" ? "center" : "left",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredSkills.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#475569" }}>
                <Minus className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p style={{ fontSize: "14px" }}>No skills match your filters</p>
              </div>
            ) : (
              filteredSkills.map((item, index) => (
                <SkillRow key={item.skill_id} item={item} index={index} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

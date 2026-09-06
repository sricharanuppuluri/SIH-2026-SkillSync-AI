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
  Filter,
  RefreshCw,
  Briefcase,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  BarChart3,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  getDemandOverview,
  listSkillDemand,
} from "@/lib/demandApi";
import type {
  DemandOverviewResponse,
  SkillDemandSummaryItem,
  SkillShortageStatus,
  DemandListFilters,
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

function shortageGradient(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE": return "from-red-500/20 to-red-900/5 border-red-500/30";
    case "MODERATE_SHORTAGE": return "from-orange-500/20 to-orange-900/5 border-orange-500/30";
    case "BALANCED": return "from-green-500/20 to-green-900/5 border-green-500/30";
    case "SURPLUS": return "from-blue-500/20 to-blue-900/5 border-blue-500/30";
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
  iconColor,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  iconColor: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
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
          width: "44px",
          height: "44px",
          borderRadius: "12px",
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
            fontSize: "28px",
            fontWeight: "700",
            color: "#f1f5f9",
            lineHeight: 1.1,
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{label}</div>
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

  // Filters
  const [search, setSearch] = useState("");
  const [shortageFilter, setShortageFilter] = useState<SkillShortageStatus | "">("");
  const [skillTypeFilter, setSkillTypeFilter] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [activeTab, setActiveTab] = useState<"all" | "shortage" | "top">("all");

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [ov, sk] = await Promise.all([
        getDemandOverview(),
        listSkillDemand({ limit: 200 }),
      ]);
      setOverview(ov);
      setSkills(sk);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load demand data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    if (skillTypeFilter) {
      list = list.filter((s) =>
        s.skill_type?.toLowerCase().includes(skillTypeFilter.toLowerCase())
      );
    }
    if (sortDir === "asc") list = list.sort((a, b) => a.demand_count - b.demand_count);
    else list = list.sort((a, b) => b.demand_count - a.demand_count);
    return list;
  }, [skills, search, shortageFilter, skillTypeFilter, sortDir, activeTab]);

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
                  Skill Demand Digital Twin
                </h1>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                  Phase 13 — Platform-computed demand and supply intelligence
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
              Data sourced from platform jobs, candidates &amp; courses only — not an external labor market dataset
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

        {/* ── KPI Cards ── */}
        {kpis && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <KpiCard icon={Briefcase} label="Active Published Jobs" value={kpis.total_active_jobs} iconColor="#8b5cf6" accent="#8b5cf6" />
            <KpiCard icon={Zap} label="Skills In Demand" value={kpis.unique_skills_in_demand} iconColor="#6366f1" accent="#6366f1" />
            <KpiCard icon={Users} label="Verified Candidates" value={kpis.verified_candidate_supply} iconColor="#22c55e" accent="#22c55e" />
            <KpiCard icon={BookOpen} label="Training Courses" value={kpis.published_training_courses} iconColor="#3b82f6" accent="#3b82f6" />
            <KpiCard icon={AlertTriangle} label="Skills in Shortage" value={kpis.skills_in_shortage} iconColor="#f97316" accent="#f97316" />
          </div>
        )}

        {/* ── Top & Shortage Leaderboard ── */}
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
                Most Demanded Skills
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
                Critical Skill Shortages
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {overview.highest_shortage_skills.map((s, i) => (
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

        {/* ── Skills Table ── */}
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

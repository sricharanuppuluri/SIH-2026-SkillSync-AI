"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sliders,
  RefreshCw,
  Sparkles,
  Users,
  BookOpen,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
  ShieldCheck,
  Plus,
  Trash2,
  BarChart3,
  Calendar,
} from "lucide-react";
import { listSkillDemand } from "@/lib/demandApi";
import { simulateSkillScenario, simulateMultiSkillScenario } from "@/lib/simulatorApi";
import type { SkillDemandSummaryItem, SkillShortageStatus } from "@/types/demand";
import type {
  SimulatorBaselineType,
  SkillScenarioInput,
  SkillScenarioResult,
  MultiSkillScenarioResponse,
} from "@/types/simulator";

// ─── Helpers & Visual Style ───────────────────────────────────────────────────

function shortageLabel(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE":
      return "High Shortage";
    case "MODERATE_SHORTAGE":
      return "Moderate Shortage";
    case "BALANCED":
      return "Balanced";
    case "SURPLUS":
      return "Surplus";
  }
}

function shortageColor(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE":
      return "#ef4444";
    case "MODERATE_SHORTAGE":
      return "#f97316";
    case "BALANCED":
      return "#22c55e";
    case "SURPLUS":
      return "#3b82f6";
  }
}

function shortageBg(status: SkillShortageStatus): string {
  switch (status) {
    case "HIGH_SHORTAGE":
      return "bg-red-500/10 border-red-500/30 text-red-400";
    case "MODERATE_SHORTAGE":
      return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    case "BALANCED":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "SURPLUS":
      return "bg-blue-500/10 border-blue-500/30 text-blue-400";
  }
}

function ShortageBadge({ status }: { status: SkillShortageStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${shortageBg(
        status
      )}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: shortageColor(status) }}
      />
      {shortageLabel(status)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [skills, setSkills] = useState<SkillDemandSummaryItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");

  // Simulation controls state
  const [baselineType, setBaselineType] = useState<SimulatorBaselineType>("ACTUAL");
  const [forecastHorizon, setForecastHorizon] = useState<number>(3);
  const [demandChangePercent, setDemandChangePercent] = useState<number>(20);
  const [additionalSupply, setAdditionalSupply] = useState<number>(0);
  const [additionalCapacity, setAdditionalCapacity] = useState<number>(0);

  // Results & execution state
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SkillScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-skill batch mode state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<
    Array<{
      skill_id: string;
      demand_change_percent: number;
      additional_verified_supply: number;
      additional_training_capacity: number;
    }>
  >([]);
  const [batchResult, setBatchResult] = useState<MultiSkillScenarioResponse | null>(null);

  // Fetch canonical skills list for dropdown
  const loadSkills = useCallback(async () => {
    try {
      setLoadingSkills(true);
      const data = await listSkillDemand({ limit: 100 });
      setSkills(data);
      if (data.length > 0 && !selectedSkillId) {
        setSelectedSkillId(data[0].skill_id);
      }
    } catch {
      setError("Unable to load canonical skills catalogue. Please ensure backend is running.");
    } finally {
      setLoadingSkills(false);
    }
  }, [selectedSkillId]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Execute single skill simulation
  const handleRunSimulation = async () => {
    if (!selectedSkillId) {
      setError("Please select a canonical skill to simulate.");
      return;
    }
    try {
      setSimulating(true);
      setError(null);
      const payload: SkillScenarioInput = {
        skill_id: selectedSkillId,
        baseline_type: baselineType,
        forecast_horizon: baselineType === "FORECAST" ? forecastHorizon : undefined,
        demand_change_percent: demandChangePercent,
        additional_verified_supply: additionalSupply,
        additional_training_capacity: additionalCapacity,
      };
      const res = await simulateSkillScenario(payload);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation request failed.";
      setError(msg);
    } finally {
      setSimulating(false);
    }
  };

  // Run initial simulation once skill is loaded
  useEffect(() => {
    if (selectedSkillId && !result && !simulating) {
      handleRunSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkillId]);

  // Presets Handlers
  const applyPreset = (preset: "surge" | "talent" | "slowdown" | "combined" | "reset") => {
    switch (preset) {
      case "surge":
        setDemandChangePercent(30);
        setAdditionalSupply(0);
        setAdditionalCapacity(0);
        break;
      case "talent":
        setDemandChangePercent(0);
        setAdditionalSupply(50);
        setAdditionalCapacity(100);
        break;
      case "slowdown":
        setDemandChangePercent(-25);
        setAdditionalSupply(0);
        setAdditionalCapacity(0);
        break;
      case "combined":
        setDemandChangePercent(20);
        setAdditionalSupply(40);
        setAdditionalCapacity(80);
        break;
      case "reset":
        setDemandChangePercent(0);
        setAdditionalSupply(0);
        setAdditionalCapacity(0);
        break;
    }
  };

  // Execute batch simulation
  const handleRunBatchSimulation = async () => {
    if (batchItems.length === 0) {
      setError("Add at least one skill to the multi-skill scenario.");
      return;
    }
    try {
      setSimulating(true);
      setError(null);
      const req = {
        skills: batchItems.map((b) => ({
          skill_id: b.skill_id,
          baseline_type: baselineType,
          forecast_horizon: baselineType === "FORECAST" ? forecastHorizon : undefined,
          demand_change_percent: b.demand_change_percent,
          additional_verified_supply: b.additional_verified_supply,
          additional_training_capacity: b.additional_training_capacity,
        })),
      };
      const res = await simulateMultiSkillScenario(req);
      setBatchResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Batch simulation request failed.";
      setError(msg);
    } finally {
      setSimulating(false);
    }
  };

  const addBatchSkill = () => {
    if (!selectedSkillId) return;
    if (batchItems.some((b) => b.skill_id === selectedSkillId)) return;
    setBatchItems((prev) => [
      ...prev,
      {
        skill_id: selectedSkillId,
        demand_change_percent: demandChangePercent,
        additional_verified_supply: additionalSupply,
        additional_training_capacity: additionalCapacity,
      },
    ]);
  };

  const removeBatchSkill = (id: string) => {
    setBatchItems((prev) => prev.filter((b) => b.skill_id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 font-sans">
      {/* ─── Header & Safe Non-Destructive Banner ────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-300 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                What-If Skill Demand Simulator
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Model hypothetical interventions in demand, verified supply, and training capacity
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchMode(false)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              !isBatchMode
                ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/20"
                : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Single Skill
          </button>
          <button
            onClick={() => {
              setIsBatchMode(true);
              if (batchItems.length === 0 && selectedSkillId) {
                addBatchSkill();
              }
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              isBatchMode
                ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/20"
                : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Multi-Skill Batch
          </button>
          <Link
            href="/demand"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            Demand Twin
          </Link>
        </div>
      </div>

      {/* Non-Destructive Guarantee Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200">
        <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-indigo-300">Non-Destructive Simulation Engine:</span>{" "}
          All what-if calculations run statelessly in-memory without modifying live jobs, candidate credentials,
          training courses, or database records.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline hover:text-red-100">
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Single Skill Mode ───────────────────────────────────────────────── */}
      {!isBatchMode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column (Left, 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  Scenario Configuration
                </h2>
                <span className="text-xs text-slate-500">Phase 15 Engine</span>
              </div>

              {/* 1. Skill Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Target Canonical Skill
                </label>
                {loadingSkills ? (
                  <div className="h-10 bg-slate-800/50 animate-pulse rounded-xl" />
                ) : (
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  >
                    {skills.map((s) => (
                      <option key={s.skill_id} value={s.skill_id}>
                        {s.skill_name} ({s.category || "General"}) — Shortage: {shortageLabel(s.shortage_status)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Baseline Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Baseline Data Source</span>
                  <span className="text-[10px] text-slate-400">
                    {baselineType === "ACTUAL" ? "Phase 13 Twin" : "Phase 14 Forecast"}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBaselineType("ACTUAL")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      baselineType === "ACTUAL"
                        ? "bg-violet-600/20 border-violet-500 text-violet-300 shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Current Actual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaselineType("FORECAST")}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      baselineType === "FORECAST"
                        ? "bg-violet-600/20 border-violet-500 text-violet-300 shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Forecast Baseline
                  </button>
                </div>
              </div>

              {/* 3. Forecast Horizon (Only if FORECAST) */}
              {baselineType === "FORECAST" && (
                <div className="space-y-2 p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20">
                  <label className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Forecast Horizon (Months)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForecastHorizon(m)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          forecastHorizon === m
                            ? "bg-violet-600 text-white border-violet-500"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Scenario Presets
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => applyPreset("surge")}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-left transition-all hover:bg-slate-900"
                  >
                    <div className="font-semibold text-slate-200">🚀 Demand Surge</div>
                    <div className="text-[10px] text-slate-400">+30% Demand</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("talent")}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-left transition-all hover:bg-slate-900"
                  >
                    <div className="font-semibold text-slate-200">🎓 Talent Surge</div>
                    <div className="text-[10px] text-slate-400">+50 Sup, +100 Cap</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("slowdown")}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-left transition-all hover:bg-slate-900"
                  >
                    <div className="font-semibold text-slate-200">📉 Slowdown</div>
                    <div className="text-[10px] text-slate-400">-25% Demand</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("combined")}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-violet-500/50 text-left transition-all hover:bg-slate-900"
                  >
                    <div className="font-semibold text-slate-200">⚡ Combined</div>
                    <div className="text-[10px] text-slate-400">+20% D, +40 S, +80 C</div>
                  </button>
                </div>
              </div>

              {/* 5. Scenario Variable Sliders */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* Demand Change % */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Hypothetical Demand Change</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        demandChangePercent > 0
                          ? "bg-emerald-500/10 text-emerald-400"
                          : demandChangePercent < 0
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {demandChangePercent > 0 ? `+${demandChangePercent}%` : `${demandChangePercent}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="300"
                    step="5"
                    value={demandChangePercent}
                    onChange={(e) => setDemandChangePercent(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>-100% (Zero)</span>
                    <span>0%</span>
                    <span>+100%</span>
                    <span>+300%</span>
                  </div>
                </div>

                {/* Additional Verified Supply */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Additional Verified Candidates</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 text-xs">
                      +{additionalSupply} candidates
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={additionalSupply}
                    onChange={(e) => setAdditionalSupply(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0</span>
                    <span>+100</span>
                    <span>+250</span>
                    <span>+500</span>
                  </div>
                </div>

                {/* Additional Training Capacity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Additional Training Course Seats</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-xs">
                      +{additionalCapacity} seats
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={additionalCapacity}
                    onChange={(e) => setAdditionalCapacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0</span>
                    <span>+250</span>
                    <span>+500</span>
                    <span>+1000</span>
                  </div>
                </div>
              </div>

              {/* Run Simulation Action Button */}
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating Scenario...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-violet-200" />
                    Run What-If Simulation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Column (Right, 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {result ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Result Header & Category Shift Badge */}
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                        Simulation Outcome
                      </div>
                      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {result.skill_name}
                        {result.category && (
                          <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                            {result.category}
                          </span>
                        )}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs">
                        <div className="text-slate-400">Shortage Category</div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <ShortageBadge status={result.baseline.shortage_category} />
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <ShortageBadge status={result.projected.shortage_category} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Impact Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-400">Projected Demand</div>
                      <div className="text-lg font-bold text-slate-100 mt-1">
                        {result.projected.demand}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Baseline: {result.baseline.demand}</span>
                        <span
                          className={`font-semibold ${
                            result.impact.demand_change > 0
                              ? "text-emerald-400"
                              : result.impact.demand_change < 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          ({result.impact.demand_change >= 0 ? `+${result.impact.demand_change}` : result.impact.demand_change})
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-400">Verified Supply</div>
                      <div className="text-lg font-bold text-slate-100 mt-1">
                        {result.projected.verified_supply}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Baseline: {result.baseline.verified_supply}</span>
                        <span className="font-semibold text-sky-400">
                          (+{result.impact.supply_change})
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-400">Course Capacity</div>
                      <div className="text-lg font-bold text-slate-100 mt-1">
                        {result.projected.training_capacity}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Baseline: {result.baseline.training_capacity}</span>
                        <span className="font-semibold text-indigo-400">
                          (+{result.impact.training_capacity_change})
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-400">Shortage Ratio</div>
                      <div className="text-lg font-bold text-slate-100 mt-1">
                        {result.projected.shortage_ratio.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>Was: {result.baseline.shortage_ratio.toFixed(2)}</span>
                        <span
                          className={`font-semibold ${
                            result.impact.shortage_ratio_change < 0
                              ? "text-emerald-400"
                              : result.impact.shortage_ratio_change > 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          ({result.impact.shortage_ratio_change > 0 ? `+${result.impact.shortage_ratio_change.toFixed(2)}` : result.impact.shortage_ratio_change.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Metric</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Baseline ({result.baseline.baseline_type})</th>
                          <th className="py-2.5 px-4 font-semibold text-right">What-If Projected</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                        <tr>
                          <td className="py-2.5 px-4 text-slate-300 font-sans font-medium flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            Skill Demand
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-300">{result.baseline.demand}</td>
                          <td className="py-2.5 px-4 text-right text-violet-300 font-bold">{result.projected.demand}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-300">
                            {result.impact.demand_change >= 0 ? `+${result.impact.demand_change}` : result.impact.demand_change} ({result.impact.demand_change_percent}%)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-slate-300 font-sans font-medium flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                            Verified Supply
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-300">{result.baseline.verified_supply}</td>
                          <td className="py-2.5 px-4 text-right text-sky-300 font-bold">{result.projected.verified_supply}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-sky-400">
                            +{result.impact.supply_change}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-slate-300 font-sans font-medium flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            Training Course Capacity
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-300">{result.baseline.training_capacity}</td>
                          <td className="py-2.5 px-4 text-right text-indigo-300 font-bold">{result.projected.training_capacity}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-indigo-400">
                            +{result.impact.training_capacity_change}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-slate-300 font-sans font-medium flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            Shortage Ratio (D/S)
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-300">{result.baseline.shortage_ratio.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-amber-300 font-bold">{result.projected.shortage_ratio.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-300">
                            {result.impact.shortage_ratio_change > 0 ? `+${result.impact.shortage_ratio_change.toFixed(2)}` : result.impact.shortage_ratio_change.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Chart Visualization (Baseline vs Projected) */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Visual Comparison (Baseline vs Projected)</span>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" />
                          Baseline
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                          What-If Projected
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Demand Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Demand</span>
                          <span className="font-mono">{result.baseline.demand} → {result.projected.demand}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800">
                          <div
                            className="bg-slate-600 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.baseline.demand / Math.max(result.projected.demand, result.baseline.demand, 1)) * 100))}%` }}
                          />
                          <div
                            className="bg-violet-500 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.projected.demand / Math.max(result.projected.demand, result.baseline.demand, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Supply Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Verified Supply</span>
                          <span className="font-mono">{result.baseline.verified_supply} → {result.projected.verified_supply}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800">
                          <div
                            className="bg-slate-600 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.baseline.verified_supply / Math.max(result.projected.verified_supply, result.baseline.verified_supply, 1)) * 100))}%` }}
                          />
                          <div
                            className="bg-sky-500 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.projected.verified_supply / Math.max(result.projected.verified_supply, result.baseline.verified_supply, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Training Course Capacity</span>
                          <span className="font-mono">{result.baseline.training_capacity} → {result.projected.training_capacity}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-800">
                          <div
                            className="bg-slate-600 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.baseline.training_capacity / Math.max(result.projected.training_capacity, result.baseline.training_capacity, 1)) * 100))}%` }}
                          />
                          <div
                            className="bg-indigo-500 rounded-full h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, (result.projected.training_capacity / Math.max(result.projected.training_capacity, result.baseline.training_capacity, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deterministic Explanation Panel */}
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <Info className="w-4 h-4 text-violet-400" />
                    Deterministic Impact Explanation
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    {result.explanation}
                  </p>
                </div>

                {/* Related Skills Catalog Context */}
                {result.related_skills && result.related_skills.length > 0 && (
                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-3">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Related Skills (Taxonomy Context)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.related_skills.map((relName, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
                        >
                          {relName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center">
                <div className="space-y-3 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 mx-auto flex items-center justify-center">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-slate-200">Configure Scenario Controls</div>
                  <p className="text-xs text-slate-400">
                    Select a skill and modify demand, supply, or training levers to evaluate the hypothetical outcome.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Multi-Skill Batch Mode ──────────────────────────────────────────── */}
      {isBatchMode && (
        <div className="space-y-8">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-violet-400" />
                  Multi-Skill Portfolio Scenario
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate concurrent policy interventions across multiple canonical skills
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunBatchSimulation}
                disabled={simulating || batchItems.length === 0}
                className="py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Simulating Portfolio...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-violet-200" />
                    Run Batch Simulation ({batchItems.length} Skills)
                  </>
                )}
              </button>
            </div>

            {/* Add Skill to Batch */}
            <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="w-full sm:w-1/3 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Add Canonical Skill</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  {skills.map((s) => (
                    <option key={s.skill_id} value={s.skill_id}>
                      {s.skill_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-1/5 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Demand Δ %</label>
                <input
                  type="number"
                  value={demandChangePercent}
                  onChange={(e) => setDemandChangePercent(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="w-full sm:w-1/5 space-y-1">
                <label className="text-xs font-semibold text-slate-300">+ Supply</label>
                <input
                  type="number"
                  value={additionalSupply}
                  onChange={(e) => setAdditionalSupply(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="w-full sm:w-1/5 space-y-1">
                <label className="text-xs font-semibold text-slate-300">+ Capacity</label>
                <input
                  type="number"
                  value={additionalCapacity}
                  onChange={(e) => setAdditionalCapacity(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={addBatchSkill}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-violet-400" />
                Add
              </button>
            </div>

            {/* Batch Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Skill</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Demand Δ %</th>
                    <th className="py-2.5 px-4 font-semibold text-right">+ Verified Supply</th>
                    <th className="py-2.5 px-4 font-semibold text-right">+ Course Capacity</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                  {batchItems.map((item) => {
                    const skillObj = skills.find((s) => s.skill_id === item.skill_id);
                    return (
                      <tr key={item.skill_id}>
                        <td className="py-2.5 px-4 text-slate-200 font-sans font-medium">
                          {skillObj?.skill_name || item.skill_id}
                        </td>
                        <td className="py-2.5 px-4 text-right text-violet-300 font-bold">
                          {item.demand_change_percent >= 0 ? `+${item.demand_change_percent}%` : `${item.demand_change_percent}%`}
                        </td>
                        <td className="py-2.5 px-4 text-right text-sky-300 font-bold">
                          +{item.additional_verified_supply}
                        </td>
                        <td className="py-2.5 px-4 text-right text-indigo-300 font-bold">
                          +{item.additional_training_capacity}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeBatchSkill(item.skill_id)}
                            className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {batchItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        No skills in the batch portfolio. Add skills above to evaluate multi-skill interventions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Results Output */}
          {batchResult && (
            <div className="space-y-6">
              {/* Batch KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Total Skills Evaluated</div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">{batchResult.total_skills}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400">Categories Improved</div>
                  <div className="text-2xl font-bold text-emerald-300 mt-1">{batchResult.categories_improved_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Categories Unchanged</div>
                  <div className="text-2xl font-bold text-slate-200 mt-1">{batchResult.categories_unchanged_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/70 border border-rose-500/20">
                  <div className="text-xs text-rose-400">Categories Worsened</div>
                  <div className="text-2xl font-bold text-rose-300 mt-1">{batchResult.categories_worsened_count}</div>
                </div>
              </div>

              {/* Individual Results List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batchResult.results.map((r) => (
                  <div key={r.skill_id} className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="font-bold text-slate-200">{r.skill_name}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <ShortageBadge status={r.baseline.shortage_category} />
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <ShortageBadge status={r.projected.shortage_category} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Demand</div>
                        <div className="font-bold text-slate-200 mt-0.5">{r.baseline.demand} → {r.projected.demand}</div>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Supply</div>
                        <div className="font-bold text-sky-300 mt-0.5">{r.baseline.verified_supply} → {r.projected.verified_supply}</div>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Ratio</div>
                        <div className="font-bold text-amber-300 mt-0.5">{r.baseline.shortage_ratio.toFixed(2)} → {r.projected.shortage_ratio.toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      {r.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

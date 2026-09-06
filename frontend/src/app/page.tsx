"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getSystemHealth } from "@/lib/api";
import { HealthResponse } from "@/types";

export default function Home() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    const result = await getSystemHealth();
    setBackendOnline(result.online);
    setHealthData(result.data);
    setLatency(result.latencyMs);
    setErrorMsg(result.error || null);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    checkStatus();
    // Auto-refresh every 15 seconds
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const dbConnected = healthData?.subsystems.database.status === "connected";
  const pgvectorEnabled = healthData?.subsystems.database.pgvector_enabled;
  const redisConnected = healthData?.subsystems.redis.status === "connected";
  const aiStatus = healthData?.subsystems.ai_engine.status;

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto pt-6 pb-2 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Zap className="w-3.5 h-3.5" />
          <span>Phase 0 — Project Setup & Foundation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          SkillSync <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 font-medium">
          AI-Powered Skill Development & Employment Ecosystem
        </p>

        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Aligning vocational training and curriculum design with real-time and emerging industry demand.
          Built on a completely free & open-source modular monolith architecture.
        </p>
      </div>

      {/* Dynamic Health & Connectivity Dashboard */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Runtime Subsystem Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Live end-to-end communication status between Frontend, FastAPI Backend, PostgreSQL, Redis, and Local AI.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {lastChecked && (
              <span className="text-xs text-slate-500">
                Last probe: {lastChecked.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={checkStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* 1. Frontend */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Frontend Shell
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-white">Next.js 15 App</div>
              <div className="text-xs text-slate-500 mt-0.5">Port 3000 • TypeScript + Tailwind</div>
            </div>
          </div>

          {/* 2. Backend */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-400" />
                FastAPI Backend
              </span>
              {backendOnline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-white">
                {backendOnline ? `${healthData?.service} v${healthData?.version}` : "Unreachable"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {backendOnline ? `Latency: ${latency} ms` : errorMsg || "Port 8000"}
              </div>
            </div>
          </div>

          {/* 3. Database (PostgreSQL + pgvector) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                PostgreSQL + pgvector
              </span>
              {dbConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" /> Disconnected
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>SQLAlchemy Async</span>
                {pgvectorEnabled && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                    vector
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {dbConnected
                  ? `Ping: ${healthData?.subsystems.database.latency_ms} ms`
                  : "Database service required"}
              </div>
            </div>
          </div>

          {/* 4. Redis / Local AI */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                Redis & Local AI
              </span>
              {redisConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Redis Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-700/50">
                  Graceful
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-white">
                Ollama: {aiStatus === "available" ? "Ready" : "Offline (Graceful)"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Model: {healthData?.subsystems.ai_engine.target_model || "mistral:latest"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pipeline Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Core Ecosystem Loop
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            SkillSync AI eliminates the gap between training curricula and real job vacancies by
            maintaining a closed-loop feedback mechanism:
          </p>
          <div className="space-y-2 text-xs">
            {[
              "1. Industry Demand Signals & Employer Requisitions",
              "2. NLP Skill Extraction & Gap Intelligence",
              "3. AI-Optimized Vocational Training Curricula",
              "4. Verifiable Competency Passports",
              "5. High-Dimensional Vector Job Matching",
              "6. Employment Outcome Tracking & Feedback Loop",
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60 text-slate-300 font-mono flex items-center gap-2"
              >
                <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-indigo-400" />
              Phase Roadmap & Architecture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Phase 0 establishes the completely free and open-source foundation. Future phases build
              incrementally on this modular monolith.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { name: "Phase 0: Foundation", status: "Active" },
                { name: "Phase 1: Shell & Dynamic UI", status: "Upcoming" },
                { name: "Phase 2: Auth & RBAC", status: "Upcoming" },
                { name: "Phase 3: Employer Module", status: "Upcoming" },
                { name: "Phase 4: Candidate Module", status: "Upcoming" },
                { name: "Phase 5: Skill Extraction", status: "Upcoming" },
                { name: "Phase 6: Matching Engine", status: "Upcoming" },
                { name: "Phase 7: Career Copilot", status: "Upcoming" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-950/40 border border-slate-800/40 flex items-center justify-between"
                >
                  <span className="text-slate-300 truncate">{item.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      item.status === "Active"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-slate-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>FastAPI Docs:</span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
            >
              http://localhost:8000/docs
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

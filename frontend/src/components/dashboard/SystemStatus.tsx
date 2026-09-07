"use client";

import * as React from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { getSystemHealth } from "@/lib/api";
import { HealthResponse } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBlockSkeleton } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export function SystemStatus() {
  const [healthData, setHealthData] = React.useState<HealthResponse | null>(null);
  const [online, setOnline] = React.useState<boolean>(false);
  const [latency, setLatency] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(async () => {
    setLoading(true);
    const result = await getSystemHealth();
    setOnline(result.online);
    setHealthData(result.data);
    setLatency(result.latencyMs);
    setErrorMsg(result.error || null);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchStatus();
    // Auto-refresh every 20 seconds
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const dbConnected = healthData?.subsystems.database.status === "connected";
  const pgvectorEnabled = healthData?.subsystems.database.pgvector_enabled;
  const redisConnected = healthData?.subsystems.redis.status === "connected";
  const aiStatus = healthData?.subsystems.ai_engine.status;

  return (
    <Card className="border-slate-800 bg-slate-900/80">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-indigo-400" />
            Infrastructure Health & Subsystems
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Live diagnostic connectivity across FastAPI, PostgreSQL, Redis, and Local AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="text-xs h-8 px-2.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {loading && !healthData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusBlockSkeleton />
            <StatusBlockSkeleton />
            <StatusBlockSkeleton />
            <StatusBlockSkeleton />
          </div>
        ) : !online ? (
          <ErrorState
            title="Backend Service Unreachable"
            message={
              errorMsg ||
              "Could not establish a connection to the FastAPI backend service on http://localhost:8000."
            }
            onRetry={fetchStatus}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Frontend Shell */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Frontend Shell
                </span>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-white">Next.js 15 App Router</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  TypeScript • Tailwind • Port 3000
                </div>
              </div>
            </div>

            {/* 2. FastAPI Backend */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  FastAPI Backend
                </span>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-white truncate">
                  {healthData?.service} v{healthData?.version}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Latency: {latency !== null ? `${latency} ms` : "N/A"} • Async API
                </div>
              </div>
            </div>

            {/* 3. PostgreSQL Database */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  PostgreSQL
                </span>
                {dbConnected ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>SQLAlchemy Async</span>
                  {pgvectorEnabled && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      vector
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {dbConnected
                    ? `Query: ${healthData?.subsystems.database.latency_ms} ms`
                    : "PostgreSQL port 5432"}
                </div>
              </div>
            </div>

            {/* 4. Redis & Local AI */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  Redis & Local AI
                </span>
                {redisConnected ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Redis Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Graceful Fallback
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-white truncate">
                  Ollama: {aiStatus === "available" ? "Ready" : "Offline"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  Model: {healthData?.subsystems.ai_engine.target_model || "mistral:latest"}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

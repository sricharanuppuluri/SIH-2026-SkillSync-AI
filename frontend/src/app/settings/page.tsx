import * as React from "react";
import { Settings, Server, Database, Cpu, Globe, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const configs = [
    {
      label: "Backend API Endpoint",
      value: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      icon: Server,
      desc: "FastAPI versioned REST endpoint",
    },
    {
      label: "Health Check Probe",
      value: "/api/v1/health",
      icon: Globe,
      desc: "Diagnostic endpoint across subsystems",
    },
    {
      label: "Database Layer",
      value: "PostgreSQL 15+ + pgvector",
      icon: Database,
      desc: "Relational persistence & vector similarity",
    },
    {
      label: "Local AI Inference",
      value: "Ollama (Mistral / nomic-embed-text)",
      icon: Cpu,
      desc: "Privacy-preserving on-premise AI models",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Platform Configuration & Environment
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            System endpoints, environment variables, and modular monolith architecture settings.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg, idx) => {
          const Icon = cfg.icon;
          return (
            <Card key={idx} className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate">
                      {cfg.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Active
                    </Badge>
                  </div>
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-indigo-300 truncate">
                    {cfg.value}
                  </div>
                  <p className="text-[11px] text-slate-500">{cfg.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security & Open Source Principles Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Zero Proprietary API Dependency Guarantee
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            SkillSync AI is architected exclusively with free and open-source tooling.
            All AI operations run locally through Ollama, spaCy, and Sentence Transformers.
            No paid third-party APIs (OpenAI, Gemini, Anthropic) or closed cloud databases are required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

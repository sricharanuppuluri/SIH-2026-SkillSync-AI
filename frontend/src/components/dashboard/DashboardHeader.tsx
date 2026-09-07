"use client";

import * as React from "react";
import { Zap, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function DashboardHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 sm:p-8">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Zap className="w-3.5 h-3.5" />
            <span>AI-Driven Workforce Intelligence</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-mono">Phase 1 Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Welcome to SkillSync <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Your intelligent skill-to-employment ecosystem connecting industry demand signals,
            competency-based training curricula, and verified career outcomes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Settings & Nodes
            </Button>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              FastAPI Docs
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

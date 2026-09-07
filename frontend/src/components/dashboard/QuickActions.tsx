import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  Cpu,
  GraduationCap,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  FileCode2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function QuickActions() {
  const quickLinks = [
    {
      title: "Employer Job Requisitions",
      desc: "Define skill contracts and demand requisitions",
      href: "/jobs",
      icon: Briefcase,
      phase: "Phase 3",
    },
    {
      title: "Skill Taxonomy & Extraction",
      desc: "NLP skill parsing from vacancies and syllabi",
      href: "/skills",
      icon: Cpu,
      phase: "Phase 5",
    },
    {
      title: "Curriculum Alignment",
      desc: "Industry-aligned course modules and paths",
      href: "/learning",
      icon: GraduationCap,
      phase: "Phase 8",
    },
    {
      title: "Semantic Vector Matching",
      desc: "High-dimensional candidate-job alignment",
      href: "/matching",
      icon: GitCompare,
      phase: "Phase 6",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ecosystem Architecture Loop */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Closed-Loop Ecosystem Flow
            </CardTitle>
            <Badge variant="indigo" className="text-[10px]">
              Core Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Real-time conversion of industry requirements into verified competencies.
          </p>
        </CardHeader>

        <CardContent className="space-y-2 text-xs">
          {[
            { step: "1", text: "Industry Demand Requisitions & Real-time Signals" },
            { step: "2", text: "NLP Skill Extraction & Dynamic Gap Intelligence" },
            { step: "3", text: "Vocational Training & Modernized Curriculum Alignment" },
            { step: "4", text: "Verifiable Competency Tracking & Skill Passports" },
            { step: "5", text: "High-Dimensional Vector Matching & Employment" },
            { step: "6", text: "Post-Placement Outcome Tracking & Evidence Feedback" },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-300 font-mono"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                {item.step}
              </span>
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Access Modules */}
      <Card className="border-slate-800 bg-slate-900/60 flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                Upcoming Platform Modules
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Roadmap
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Module entry points with dedicated placeholder shells ready for implementation.
            </p>
          </CardHeader>

          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                      {link.phase}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {link.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {link.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </div>

        <div className="p-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span>Backend Swagger API:</span>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium hover:underline"
          >
            http://localhost:8000/docs
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </Card>
    </div>
  );
}

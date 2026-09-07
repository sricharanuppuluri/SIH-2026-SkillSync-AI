import * as React from "react";
import { Cpu, ArrowLeft, Database, TrendingUp, Sliders, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SkillsPage() {
  const skillPortals = [
    {
      title: "Canonical Skill Taxonomy",
      description:
        "Standardized competency taxonomy graph with automated skill entity extraction, categorization, and version management.",
      href: "/admin/skills",
      icon: Database,
      badge: "Taxonomy Hub",
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Real-Time Skill Demand",
      description:
        "District-level labour market demand analytics, ARIMA/Prophet forecasting, and vacancy velocity tracking.",
      href: "/demand",
      icon: TrendingUp,
      badge: "Demand Intelligence",
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "What-If Policy Simulator",
      description:
        "Simulate curriculum interventions, vocational seat shifts, and district migration impacts on regional skill equilibrium.",
      href: "/simulator",
      icon: Sliders,
      badge: "Simulation Engine",
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-indigo-400" />
            Skill Taxonomy & Intelligence Systems
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access canonical competency graphs, labour market demand intelligence, and macroeconomic simulation.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {skillPortals.map((portal) => {
          const Icon = portal.icon;
          return (
            <div
              key={portal.title}
              className="flex flex-col justify-between rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all p-6 shadow-lg shadow-black/20 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${portal.accent}`}
                  >
                    {portal.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {portal.description}
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <Link href={portal.href}>
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs group-hover:border-indigo-500/40">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

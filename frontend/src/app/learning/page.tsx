import * as React from "react";
import { GraduationCap, ArrowLeft, BookOpen, Layers, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LearningPage() {
  const learningPortals = [
    {
      title: "Candidate Learning Catalog",
      description:
        "Browse verified vocational courses, view curriculum lesson breakdowns, track personal progress, and earn competency certifications.",
      href: "/candidate/learning",
      icon: BookOpen,
      badge: "Learner Portal",
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Training Provider Course Studio",
      description:
        "Create, publish, and manage aligned vocational curricula mapped to canonical industry skills and district capacity quotas.",
      href: "/training-provider/courses",
      icon: Layers,
      badge: "Provider Portal",
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Outcomes & Placement Intelligence",
      description:
        "Verify student employment outcomes, compute verified retention scores, and earn verifiable training outcome ratings.",
      href: "/training-provider/outcomes",
      icon: Award,
      badge: "Verification Engine",
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            Curriculum Alignment & Vocational Training
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access vocational curricula, active training courses, and verified outcome intelligence.
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
        {learningPortals.map((portal) => {
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
                    <span>Enter Portal</span>
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

import * as React from "react";
import { Cpu, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Skill Taxonomy & NLP Extraction
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Standardized competency graph and automated skill entity extraction.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <EmptyState
        icon={Cpu}
        title="Skill Taxonomy & Extraction Coming Soon"
        description="This module will employ local NLP models (spaCy and Sentence Transformers) to extract, normalize, and categorize technical and soft skills from job descriptions. Scheduled for Phase 5."
        phaseBadge="Phase 5 Roadmap"
        action={
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              Return to System Dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}

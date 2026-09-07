import * as React from "react";
import { GitCompare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function MatchingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Semantic Vector Matching Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            pgvector high-dimensional cosine similarity matching candidate competencies to job requisitions.
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
        icon={GitCompare}
        title="Matching Engine Coming Soon"
        description="This module leverages PostgreSQL + pgvector embeddings to match candidates with suitable job openings based on verified competencies and semantic relevance. Scheduled for Phase 6."
        phaseBadge="Phase 6 Roadmap"
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

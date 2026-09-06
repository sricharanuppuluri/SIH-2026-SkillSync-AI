import * as React from "react";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function LearningPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Curriculum Alignment & Vocational Training
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modernizing vocational training courses based on real-time employer skill gaps.
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
        icon={GraduationCap}
        title="Curriculum Optimizer Coming Soon"
        description="This module connects training providers with modernized curricula recommendations, district seat optimization, and learning path design. Scheduled for Phase 8."
        phaseBadge="Phase 8 Roadmap"
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

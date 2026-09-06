import * as React from "react";
import { BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Outcome Intelligence & Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            District-level demand forecasting, employment retention metrics, and ROI feedback.
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
        icon={BarChart3}
        title="Outcome Intelligence Coming Soon"
        description="This module tracks graduate employment retention, salary growth, and provides government authorities with evidence-based feedback on training program efficacy. Scheduled for Phase 11."
        phaseBadge="Phase 11 Roadmap"
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

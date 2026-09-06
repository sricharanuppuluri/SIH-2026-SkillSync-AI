import * as React from "react";
import { Award, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function PassportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Verifiable Skill Passports & Credentials
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident, portable digital competency passports for candidates.
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
        icon={Award}
        title="Skill Passport Module Coming Soon"
        description="This module creates cryptographic, verifiable skill credentials reflecting verified assessments, certified training completions, and verified employment outcomes. Scheduled for Phase 10."
        phaseBadge="Phase 10 Roadmap"
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

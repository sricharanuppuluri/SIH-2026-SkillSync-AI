import * as React from "react";
import { Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Employer Job Requisitions & Skill Contracts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured vacancy intake and industry competency specifications.
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
        icon={Briefcase}
        title="Job Requisitions Module Coming Soon"
        description="This module will allow employers to post vacancies, define structured skill requirements, and connect with trained candidates. Scheduled for Phase 3."
        phaseBadge="Phase 3 Roadmap"
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

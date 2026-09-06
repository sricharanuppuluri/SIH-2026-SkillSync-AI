"use client";

import * as React from "react";
import { Briefcase, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function JobsPage() {
  const { user } = useAuth();

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
        <div className="flex items-center gap-2">
          {user?.role === "EMPLOYER" && (
            <Link href="/employer/jobs/new">
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Post New Job
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <EmptyState
        icon={Briefcase}
        title="Employer Job Requisitions Active"
        description="Employers can create, publish, and manage structured job requisitions with required skill proficiencies and weights."
        phaseBadge="Phase 4 Live"
        action={
          <div className="flex items-center gap-3">
            <Link href="/employer/jobs">
              <Button variant="primary" size="sm">
                Open Employer Job Portal
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}

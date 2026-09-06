"use client";

import * as React from "react";
import { Briefcase, Cpu, GraduationCap, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CandidateDashboard } from "@/components/candidate/CandidateDashboard";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import TrainingProviderDashboardPage from "@/app/training-provider/dashboard/page";
import { LoadingState } from "@/components/ui/LoadingState";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const metrics = [
    {
      title: "Active Opportunities",
      value: "1,420",
      change: "+12.4%",
      trend: "up" as const,
      description: "Aggregated employer vacancies",
      icon: Briefcase,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Skills in Taxonomy",
      value: "860+",
      change: "+28 new",
      trend: "up" as const,
      description: "Standardized competency graph",
      icon: Cpu,
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Aligned Curricula",
      value: "342",
      change: "+15.0%",
      trend: "up" as const,
      description: "Vocational courses modernized",
      icon: GraduationCap,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Match Efficiency",
      value: "94.6%",
      change: "+3.2%",
      trend: "up" as const,
      description: "Vector similarity precision",
      icon: Award,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading dashboard environment..." className="py-20" />;
  }

  // If authenticated as EMPLOYER, render dedicated live Employer Dashboard
  if (user?.role === "EMPLOYER") {
    return <EmployerDashboard />;
  }

  // If authenticated as CANDIDATE, render dedicated live Candidate Dashboard
  if (user?.role === "CANDIDATE") {
    return <CandidateDashboard />;
  }

  // If authenticated as TRAINING_PROVIDER, redirect or render Training Provider Dashboard
  if (user?.role === "TRAINING_PROVIDER") {
    return <TrainingProviderDashboardPage />;
  }

  return (
    <div className="space-y-8">
      {/* 1. Welcome Header */}
      <DashboardHeader />

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <MetricCard
            key={idx}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            description={metric.description}
            icon={metric.icon}
            iconColor={metric.iconColor}
            isDemo={true}
          />
        ))}
      </div>

      {/* 3. Live System & Subsystem Diagnostic Status */}
      <SystemStatus />

      {/* 4. Ecosystem Architecture Flow & Quick Modules */}
      <QuickActions />
    </div>
  );
}

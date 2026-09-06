"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Cpu,
  GraduationCap,
  GitCompare,
  Award,
  BarChart3,
  Settings,
  Users,
  Building2,
  User as UserIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "available" | "coming-soon";
  phase?: string;
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    status: "available",
  },
  {
    title: "My Profile",
    href: "/candidate/profile",
    icon: UserIcon,
    status: "available",
  },
  {
    title: "My Skills",
    href: "/candidate/skills",
    icon: Cpu,
    status: "available",
  },
  {
    title: "Work Experience",
    href: "/candidate/experience",
    icon: Briefcase,
    status: "available",
  },
  {
    title: "Education",
    href: "/candidate/education",
    icon: GraduationCap,
    status: "available",
  },
  {
    title: "Manage Jobs",
    href: "/employer/jobs",
    icon: Briefcase,
    status: "available",
  },
  {
    title: "Review Applicants",
    href: "/employer/applications",
    icon: Users,
    status: "available",
  },
  {
    title: "Company Profile",
    href: "/employer/profile",
    icon: Building2,
    status: "available",
  },
  {
    title: "Jobs Requisitions",
    href: "/jobs",
    icon: Briefcase,
    status: "available",
  },
  {
    title: "Skill Taxonomy",
    href: "/admin/skills",
    icon: Cpu,
    status: "available",
  },
  {
    title: "AI Skill Extractor",
    href: "/tools/skill-extractor",
    icon: Sparkles,
    status: "available",
  },
  {
    title: "Semantic Matching",
    href: "/tools/semantic-skill-match",
    icon: GitCompare,
    status: "available",
  },
  {
    title: "Curriculum & Courses",
    href: "/learning",
    icon: GraduationCap,
    status: "coming-soon",
    phase: "Phase 8",
  },
  {
    title: "Skill Passport",
    href: "/passport",
    icon: Award,
    status: "coming-soon",
    phase: "Phase 10",
  },
  {
    title: "Outcome Analytics",
    href: "/analytics",
    icon: BarChart3,
    status: "coming-soon",
    phase: "Phase 11",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    status: "available",
  },
];

export const ROLE_NAV_PERMISSIONS: Record<UserRole, string[]> = {
  CANDIDATE: [
    "/dashboard",
    "/candidate/profile",
    "/candidate/skills",
    "/candidate/experience",
    "/candidate/education",
    "/tools/skill-extractor",
    "/tools/semantic-skill-match",
    "/jobs",
    "/learning",
    "/passport",
    "/settings",
  ],
  EMPLOYER: [
    "/dashboard",
    "/employer/jobs",
    "/employer/applications",
    "/employer/profile",
    "/tools/skill-extractor",
    "/tools/semantic-skill-match",
    "/jobs",
    "/settings",
  ],
  TRAINING_PROVIDER: [
    "/dashboard",
    "/tools/skill-extractor",
    "/tools/semantic-skill-match",
    "/learning",
    "/settings",
  ],
  GOVERNMENT: [
    "/dashboard",
    "/tools/skill-extractor",
    "/tools/semantic-skill-match",
    "/analytics",
    "/settings",
  ],
  ADMIN: [
    "/dashboard",
    "/candidate/profile",
    "/candidate/skills",
    "/candidate/experience",
    "/candidate/education",
    "/employer/jobs",
    "/employer/applications",
    "/employer/profile",
    "/jobs",
    "/admin/skills",
    "/tools/skill-extractor",
    "/tools/semantic-skill-match",
    "/learning",
    "/passport",
    "/analytics",
    "/settings",
  ],
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const displayedItems = React.useMemo(() => {
    if (!user || !user.role || !ROLE_NAV_PERMISSIONS[user.role]) {
      return navItems;
    }
    return navItems.filter((item) => ROLE_NAV_PERMISSIONS[user.role].includes(item.href));
  }, [user]);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-800 bg-slate-950/70 backdrop-blur-md transition-all duration-300 select-none z-30 h-screen sticky top-0",
        collapsed ? "w-18" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-semibold tracking-tight text-white text-base leading-tight">
                SkillSync <span className="text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user ? `${user.role} Portal` : "Modular Monolith"}
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-7 h-7 rounded-md border border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Platform Modules
          </div>
        )}

        {displayedItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? `${item.title}${item.phase ? ` (${item.phase})` : ""}` : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                )}
              />

              {!collapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.title}</span>
                  {item.status === "coming-soon" ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800 shrink-0">
                      Soon
                    </span>
                  ) : (
                    isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    )
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Footer Details */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>SkillSync AI</span>
            <span className="text-indigo-400 font-mono">v0.6.0</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            Phase 5 • Skill Intelligence
          </div>
        </div>
      )}
    </aside>
  );
}

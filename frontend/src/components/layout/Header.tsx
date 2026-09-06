"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { navItems } from "./Sidebar";
import { getSystemHealth } from "@/lib/api";
import { HealthResponse } from "@/types";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const pathname = usePathname();
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [online, setOnline] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    async function probe() {
      const result = await getSystemHealth();
      if (isMounted) {
        setOnline(result.online);
        setHealth(result.data);
      }
    }
    probe();
    const timer = setInterval(probe, 20000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Determine current page title
  const currentNav = navItems.find((item) => item.href === pathname);
  const pageTitle =
    pathname === "/"
      ? "Dashboard"
      : currentNav?.title || "SkillSync AI";

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open navigation drawer"
          className="md:hidden w-9 h-9 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {pageTitle}
          </h1>
          {currentNav?.phase && (
            <span className="hidden sm:inline-flex text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              {currentNav.phase}
            </span>
          )}
        </div>
      </div>

      {/* Right: Subsystem Status, Notification, Profile Demo */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time System Status Pill */}
        <div
          title={
            online
              ? `Backend: Connected • Database: ${health?.subsystems.database.status} • Redis: ${health?.subsystems.redis.status}`
              : "Backend API: Offline"
          }
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
        >
          {online ? (
            health?.status === "healthy" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Systems Healthy</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Degraded Subsystem</span>
              </>
            )
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Backend Offline</span>
            </>
          )}
        </div>

        {/* Diagnostic Link */}
        <a
          href="/dashboard"
          title="View system diagnostic details"
          className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Activity className="w-4 h-4" />
        </a>

        {/* Notifications Icon (Demo Placeholder) */}
        <button
          aria-label="Notifications"
          className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* User Profile Placeholder (Neutral Demo State) */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-semibold text-white shadow-sm">
            AI
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200 leading-tight">
              Ecosystem Demo
            </span>
            <span className="text-[10px] text-slate-500 leading-tight font-mono">
              Observer Mode
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

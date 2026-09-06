"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { navItems } from "./Sidebar";
import { getSystemHealth } from "@/lib/api";
import { HealthResponse } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
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

  const userInitials = React.useMemo(() => {
    if (!user?.full_name) return "AI";
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user]);

  const roleBadgeColor = React.useMemo(() => {
    if (!user) return "bg-slate-800 text-slate-300 border-slate-700";
    switch (user.role) {
      case "ADMIN":
        return "bg-rose-950/70 text-rose-300 border-rose-800/80";
      case "EMPLOYER":
        return "bg-amber-950/70 text-amber-300 border-amber-800/80";
      case "TRAINING_PROVIDER":
        return "bg-purple-950/70 text-purple-300 border-purple-800/80";
      case "GOVERNMENT":
        return "bg-emerald-950/70 text-emerald-300 border-emerald-800/80";
      default:
        return "bg-indigo-950/70 text-indigo-300 border-indigo-800/80";
    }
  }, [user]);

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

      {/* Right: Subsystem Status, Notifications, Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-4">
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
        <Link
          href="/dashboard"
          title="View system diagnostic details"
          className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Activity className="w-4 h-4" />
        </Link>

        {/* Notifications Icon (Demo Placeholder) */}
        <button
          aria-label="Notifications"
          className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* User Identity / Authentication State */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-semibold text-white shadow-sm shrink-0">
              {userInitials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
                {user.full_name}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded border font-mono w-fit mt-0.5 ${roleBadgeColor}`}
              >
                {user.role}
              </span>
            </div>
            <button
              onClick={() => logout()}
              title="Logout session"
              aria-label="Logout"
              className="w-8 h-8 ml-1 rounded-lg border border-slate-800 hover:border-rose-800 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

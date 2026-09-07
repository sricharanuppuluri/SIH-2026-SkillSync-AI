"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navItems, ROLE_NAV_PERMISSIONS } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const displayedItems = React.useMemo(() => {
    if (!user || !user.role || !ROLE_NAV_PERMISSIONS[user.role]) {
      return navItems;
    }
    return navItems.filter((item) => ROLE_NAV_PERMISSIONS[user.role].includes(item.href));
  }, [user]);

  // Close mobile navigation on route change
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-slate-950 border-r border-slate-800 flex flex-col z-50 h-full p-4 shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              S
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white text-base">
                SkillSync <span className="text-indigo-400">AI</span>
              </span>
              <div className="text-[10px] text-slate-400 font-mono">
                {user ? `${user.role} Portal` : "Release Candidate"}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Platform Modules
          </div>

          {displayedItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-indigo-400" : "text-slate-400"
                    )}
                  />
                  <span>{item.title}</span>
                </div>

                {item.status === "coming-soon" ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                    Soon
                  </span>
                ) : (
                  isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )
                )}
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>SkillSync AI</span>
            <span className="text-indigo-400 font-mono">v1.0.0-RC</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            SIH 2026 Release Candidate
          </p>
        </div>
      </div>
    </div>
  );
}

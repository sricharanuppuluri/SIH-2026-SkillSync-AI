"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState<boolean>(false);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const openMobileNav = React.useCallback(() => {
    setMobileNavOpen(true);
  }, []);

  const closeMobileNav = React.useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-row">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile Slide-over Drawer */}
      <MobileNav
        open={mobileNavOpen}
        onClose={closeMobileNav}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header onOpenMobileNav={openMobileNav} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950/40 py-5 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            SkillSync AI &copy; {new Date().getFullYear()} — Free & Open-Source Modular Monolith Ecosystem
          </div>
        </footer>
      </div>
    </div>
  );
}

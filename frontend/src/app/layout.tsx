import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillSync AI — AI-Powered Skill Development & Employment Ecosystem",
  description:
    "Aligning vocational training and curriculum design with real-time industry demand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen flex flex-col">
        <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
                S
              </div>
              <div>
                <span className="font-semibold tracking-tight text-white text-lg">
                  SkillSync <span className="text-indigo-400">AI</span>
                </span>
                <span className="ml-2 text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                  Phase 0
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                v0.1.0 Foundation
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            SkillSync AI &copy; {new Date().getFullYear()} — Free & Open-Source Modular Monolith Ecosystem
          </div>
        </footer>
      </body>
    </html>
  );
}

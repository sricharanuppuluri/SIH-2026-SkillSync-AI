"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-950/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800/90 shadow-2xl shadow-indigo-950/20">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/25 mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Sign in to SkillSync <span className="text-indigo-400">AI</span>
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            AI-Driven Workforce Intelligence &amp; Skill Alignment Ecosystem
          </p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-300"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full justify-center py-2.5 font-semibold text-xs shadow-md shadow-indigo-600/30"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

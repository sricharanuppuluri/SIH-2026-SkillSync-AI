"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User as UserIcon, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { UserRole } from "@/types";

const ALLOWED_REGISTRATION_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: "CANDIDATE",
    label: "Candidate / Job Seeker",
    description: "Explore AI skill gap analytics, match jobs, and build skill passport",
  },
  {
    value: "EMPLOYER",
    label: "Employer / Recruiter",
    description: "Post talent requisitions and execute semantic candidate matching",
  },
  {
    value: "TRAINING_PROVIDER",
    label: "Training Provider / Educator",
    description: "Align vocational curricula with dynamic industry demand forecasts",
  },
  {
    value: "GOVERNMENT",
    label: "Government / Policy Analyst",
    description: "Access regional workforce analytics and skill supply-demand twins",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("CANDIDATE");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-slate-950/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800/90 shadow-2xl shadow-indigo-950/20">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/25 mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Create your SkillSync account
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Join the ecosystem bridging skills and real-time industry employment
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

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="register-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-role"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Account Role
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <select
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                {ALLOWED_REGISTRATION_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {ALLOWED_REGISTRATION_ROLES.find((r) => r.value === role)?.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full justify-center py-2.5 font-semibold text-xs shadow-md shadow-indigo-600/30"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

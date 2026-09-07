import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "indigo"
    | "purple"
    | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "bg-slate-800 text-slate-300 border-slate-700",
    secondary:
      "bg-slate-900/80 text-slate-400 border-slate-800",
    success:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",
    destructive:
      "bg-rose-500/10 text-rose-400 border-rose-500/20",
    indigo:
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    purple:
      "bg-purple-500/10 text-purple-400 border-purple-500/20",
    outline:
      "border-slate-700 text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

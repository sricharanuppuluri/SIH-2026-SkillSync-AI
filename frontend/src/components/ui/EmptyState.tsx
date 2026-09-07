import * as React from "react";
import { LucideIcon, Sparkles } from "lucide-react";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  phaseBadge?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  phaseBadge,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800/80 bg-slate-900/40 p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {title}
          </h3>
          {phaseBadge && (
            <Badge variant="indigo" className="text-[10px] font-mono">
              {phaseBadge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

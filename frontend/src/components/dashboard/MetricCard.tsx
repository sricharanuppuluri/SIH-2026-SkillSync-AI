import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  isDemo?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  trend = "neutral",
  description,
  icon: Icon,
  iconColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  isDemo = true,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("hover:border-slate-700/80 transition-all group", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">{title}</span>
              {isDemo && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  Demo
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {value}
            </div>
          </div>

          <div
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105",
              iconColor
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {(change || description) && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  trend === "up" && "text-emerald-400",
                  trend === "down" && "text-rose-400",
                  trend === "neutral" && "text-slate-400"
                )}
              >
                {trend === "up" && <TrendingUp className="w-3 h-3" />}
                {trend === "down" && <TrendingDown className="w-3 h-3" />}
                {change}
              </span>
            )}
            {description && (
              <span className="text-slate-500 text-[11px] truncate">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

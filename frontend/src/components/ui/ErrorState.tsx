import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this resource. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 text-center flex flex-col items-center justify-center space-y-3",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 text-xs border-rose-800/40 hover:bg-rose-950/30 text-rose-300"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

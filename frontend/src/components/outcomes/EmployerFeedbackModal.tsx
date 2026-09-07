"use client";

import * as React from "react";
import { Star, X, Check, Loader2, AlertCircle } from "lucide-react";
import { PlacementOutcome, PlacementOutcomeSummary, RetentionStatus } from "@/types";
import { outcomeAPI } from "@/lib/outcomeApi";
import { cn } from "@/lib/utils";

interface EmployerFeedbackModalProps {
  placement: PlacementOutcome | PlacementOutcomeSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployerFeedbackModal({
  placement,
  isOpen,
  onClose,
  onSuccess,
}: EmployerFeedbackModalProps) {
  const [retentionStatus, setRetentionStatus] = React.useState<RetentionStatus>("ACTIVE");
  const [satisfaction, setSatisfaction] = React.useState<number>(5);
  const [hoverSatisfaction, setHoverSatisfaction] = React.useState<number>(0);
  const [fulfillment, setFulfillment] = React.useState<string>("100");
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (placement) {
      setRetentionStatus(placement.retention_status);
      setSatisfaction(placement.employer_satisfaction_rating || 5);
      if ("contract_fulfillment_score" in placement && placement.contract_fulfillment_score != null) {
        setFulfillment(placement.contract_fulfillment_score.toString());
      } else {
        setFulfillment("100");
      }
      if ("employer_feedback_notes" in placement && placement.employer_feedback_notes) {
        setNotes(placement.employer_feedback_notes);
      } else {
        setNotes("");
      }
      setError(null);
    }
  }, [placement, isOpen]);

  if (!isOpen || !placement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fulfillmentNum = parseFloat(fulfillment);
    if (isNaN(fulfillmentNum) || fulfillmentNum < 0 || fulfillmentNum > 100) {
      setError("Contract fulfillment score must be between 0 and 100%");
      setLoading(false);
      return;
    }

    try {
      await outcomeAPI.updateRetention(placement.id, {
        retention_status: retentionStatus,
        employer_satisfaction_rating: satisfaction,
        contract_fulfillment_score: fulfillmentNum,
        employer_feedback_notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Record Milestone & Feedback</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Candidate: <span className="text-slate-200 font-medium">{placement.candidate_name || "Graduate"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Retention Milestone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Retention Milestone
            </label>
            <select
              value={retentionStatus}
              onChange={(e) => setRetentionStatus(e.target.value as RetentionStatus)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-100"
            >
              <option value="ACTIVE">Active (Initial 30 Days)</option>
              <option value="LEFT_WITHIN_30D">Left within 30 Days</option>
              <option value="RETAINED_90D">Retained 90 Days</option>
              <option value="RETAINED_180D">Retained 180 Days</option>
              <option value="TERMINATED">Terminated / Resigned</option>
            </select>
          </div>

          {/* Employer Satisfaction Rating */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Employer Satisfaction (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverSatisfaction || satisfaction) >= star;
                return (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setSatisfaction(star)}
                    onMouseEnter={() => setHoverSatisfaction(star)}
                    onMouseLeave={() => setHoverSatisfaction(0)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-colors",
                        active
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-600 hover:text-slate-400"
                      )}
                    />
                  </button>
                );
              })}
              <span className="text-xs text-slate-400 ml-2 font-mono">
                {satisfaction} / 5
              </span>
            </div>
          </div>

          {/* Contract Fulfillment Score */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Skill Contract Fulfillment Score (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={fulfillment}
                onChange={(e) => setFulfillment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-100"
                placeholder="e.g. 95.0"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-mono">
                %
              </span>
            </div>
          </div>

          {/* Qualitative Feedback Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Qualitative Feedback & Competency Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder:text-slate-500"
              placeholder="Provide comments on candidate preparedness, skill alignment, or areas for curriculum improvement..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Milestone</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

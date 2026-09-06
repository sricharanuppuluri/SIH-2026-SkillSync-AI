"use client";

import React, { useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { CandidateResumeUploadData } from "@/types/candidate";
import { Button } from "@/components/ui/Button";

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: CandidateResumeUploadData) => Promise<void>;
  currentFilename?: string | null;
}

export function ResumeUploadModal({
  isOpen,
  onClose,
  onUpload,
  currentFilename,
}: ResumeUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !currentFilename && !resumeText.trim()) {
      setError("Please select a resume file or provide text.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpload({
        filename: file ? file.name : currentFilename || "Resume.pdf",
        file_size: file ? file.size : 150000,
        resume_text: resumeText.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">
            {currentFilename ? "Update Resume" : "Upload Resume"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-lg">
              {error}
            </div>
          )}

          {currentFilename && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="truncate text-xs">
                <span className="text-slate-400">Current file: </span>
                <span className="text-slate-200 font-medium">{currentFilename}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Select Resume File (PDF, DOCX)
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="resume-file-input"
              />
              <label htmlFor="resume-file-input" className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs text-slate-300 font-medium">
                  {file ? (
                    <span className="text-indigo-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  ) : (
                    <span>Click to browse or drop file here</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Supports PDF, DOCX up to 10MB</p>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Resume Text / Plain Content (Optional)
            </label>
            <textarea
              rows={4}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste plain text content for better local skill extraction indexing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Uploading..." : "Save Resume"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

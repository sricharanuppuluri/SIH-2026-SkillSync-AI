"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { extractSkills } from "@/lib/extractionApi";
import {
  ExtractionSourceType,
  SkillExtractionItem,
  SkillExtractionResponse,
} from "@/types/extraction";

const SOURCE_TYPES: { value: ExtractionSourceType; label: string }[] = [
  { value: "JOB", label: "Job Description" },
  { value: "RESUME", label: "Resume / CV" },
  { value: "COURSE", label: "Course Description" },
  { value: "PROFILE", label: "Profile / Bio" },
  { value: "OTHER", label: "Other" },
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 10000;

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85
      ? "#22c55e"
      : pct >= 65
      ? "#f59e0b"
      : "#ef4444";
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "1px 8px",
        fontSize: 12,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {pct}%
    </span>
  );
}

function SkillCard({ item }: { item: SkillExtractionItem }) {
  return (
    <div
      style={{
        background: item.resolved
          ? "rgba(139,92,246,0.07)"
          : "rgba(239,68,68,0.05)",
        border: `1px solid ${item.resolved ? "rgba(139,92,246,0.25)" : "rgba(239,68,68,0.2)"}`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>
          {item.canonical_skill_name || item.raw_name}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <ConfidenceBadge value={item.confidence} />
          {item.resolved ? (
            <span
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 6,
                padding: "1px 8px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ✓ Canonical
            </span>
          ) : (
            <span
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 6,
                padding: "1px 8px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ⚠ Unresolved
            </span>
          )}
        </div>
      </div>

      {item.raw_name !== item.canonical_skill_name && item.resolved && (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          Extracted as: <em>{item.raw_name}</em>
        </div>
      )}

      {item.evidence && (
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            fontStyle: "italic",
            borderLeft: "2px solid rgba(148,163,184,0.3)",
            paddingLeft: 8,
          }}
        >
          &ldquo;{item.evidence}&rdquo;
        </div>
      )}
    </div>
  );
}

export default function SkillExtractorPage() {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<ExtractionSourceType>("JOB");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkillExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const charCount = text.length;
  const overLimit = charCount > MAX_LENGTH;
  const underLimit = charCount < MIN_LENGTH && charCount > 0;

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setError(null);
    setResult(null);

    if (!text.trim() || text.trim().length < MIN_LENGTH) {
      setValidationError(`Text must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (text.length > MAX_LENGTH) {
      setValidationError(`Text must not exceed ${MAX_LENGTH} characters.`);
      return;
    }
    if (!token) {
      setError("You must be signed in to use skill extraction.");
      return;
    }

    setLoading(true);
    try {
      const res = await extractSkills(text, sourceType, token);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const resolvedSkills = result?.skills.filter((s) => s.resolved) ?? [];
  const unresolvedSkills = result?.skills.filter((s) => !s.resolved) ?? [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        padding: "40px 24px",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: "#e2e8f0",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 24,
              padding: "6px 18px",
              fontSize: 13,
              color: "#a78bfa",
              fontWeight: 600,
              marginBottom: 16,
              letterSpacing: "0.04em",
            }}
          >
            <span>⚡</span> LOCAL AI · PHASE 6
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 10px",
              lineHeight: 1.15,
            }}
          >
            Skill Extractor
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 15, margin: 0 }}>
            Paste any job description, resume, or course text. The local AI
            extracts and resolves skills against the canonical catalog — fully
            offline.
          </p>
        </div>

        {/* Form */}
        <form
          id="skill-extractor-form"
          onSubmit={handleExtract}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 28,
            marginBottom: 28,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Source type */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="source-type-select"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Source Type
            </label>
            <select
              id="source-type-select"
              value={sourceType}
              onChange={(e) =>
                setSourceType(e.target.value as ExtractionSourceType)
              }
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#e2e8f0",
                padding: "10px 14px",
                fontSize: 14,
                width: "100%",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {SOURCE_TYPES.map((st) => (
                <option
                  key={st.value}
                  value={st.value}
                  style={{ background: "#1e293b" }}
                >
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text area */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="extraction-text"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span>Source Text</span>
              <span
                style={{
                  color: overLimit ? "#f87171" : underLimit ? "#f59e0b" : "#64748b",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
              </span>
            </label>
            <textarea
              id="extraction-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setValidationError(null);
              }}
              placeholder="Paste a job description, resume excerpt, or course description here…"
              rows={10}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${overLimit ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 10,
                color: "#e2e8f0",
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          {/* Validation error */}
          {validationError && (
            <div
              id="extraction-validation-error"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {validationError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            id="extract-button"
            disabled={loading || overLimit || !text.trim()}
            style={{
              background: loading
                ? "rgba(139,92,246,0.4)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading || overLimit || !text.trim() ? "not-allowed" : "pointer",
              opacity: loading || overLimit || !text.trim() ? 0.6 : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Extracting…
              </>
            ) : (
              "⚡ Extract Skills"
            )}
          </button>
        </form>

        {/* API error */}
        {error && (
          <div
            id="extraction-api-error"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              padding: "14px 18px",
              color: "#f87171",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div id="extraction-results">
            {/* Status banner */}
            {!result.success ? (
              <div
                id="ollama-unavailable-banner"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  color: "#fbbf24",
                  fontSize: 14,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
                <div>
                  <strong>Local AI Unavailable</strong>
                  <br />
                  {result.warnings[0] ||
                    "The local Ollama service could not complete the extraction."}
                </div>
              </div>
            ) : (
              <>
                {/* Stats bar */}
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginBottom: 24,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      label: "Total Skills",
                      value: result.skills.length,
                      color: "#a78bfa",
                    },
                    {
                      label: "Resolved",
                      value: result.resolved_count,
                      color: "#22c55e",
                    },
                    {
                      label: "Unresolved",
                      value: result.unresolved_count,
                      color: "#f87171",
                    },
                    {
                      label: "Processing",
                      value: `${result.processing_time_ms.toFixed(0)} ms`,
                      color: "#60a5fa",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: "10px 18px",
                        minWidth: 110,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: stat.color,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "10px 18px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94a3b8",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {result.model}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                      Model
                    </div>
                  </div>
                </div>

                {/* Resolved skills */}
                {resolvedSkills.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h2
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#22c55e",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 12,
                      }}
                    >
                      ✓ Resolved Canonical Skills ({resolvedSkills.length})
                    </h2>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {resolvedSkills.map((skill, idx) => (
                        <SkillCard key={`resolved-${idx}`} item={skill} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Unresolved skills */}
                {unresolvedSkills.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h2
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f87171",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 12,
                      }}
                    >
                      ⚠ Unresolved Skills ({unresolvedSkills.length})
                    </h2>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10, marginTop: 0 }}>
                      These were extracted but do not match any canonical skill. They have NOT been
                      added to the catalog.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {unresolvedSkills.map((skill, idx) => (
                        <SkillCard key={`unresolved-${idx}`} item={skill} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty */}
                {result.skills.length === 0 && (
                  <div
                    id="extraction-empty-state"
                    style={{
                      textAlign: "center",
                      color: "#64748b",
                      padding: 48,
                      border: "1px dashed rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontWeight: 600 }}>No skills extracted</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>
                      The model did not identify any skills in the provided text.
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && result.success && (
              <div
                style={{
                  background: "rgba(245,158,11,0.07)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#f59e0b",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Warnings
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                  {result.warnings.map((w, i) => (
                    <li key={i} style={{ fontSize: 12, color: "#fbbf24", marginBottom: 2 }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; color: #e2e8f0; }
      `}</style>
    </div>
  );
}

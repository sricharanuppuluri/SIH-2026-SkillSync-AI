"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { semanticSkillAPI } from "@/lib/api";
import {
  MatchType,
  SemanticMatchItem,
  SemanticMatchResponse,
  SkillType,
} from "@/types";

const SKILL_TYPES: { value: SkillType | ""; label: string }[] = [
  { value: "", label: "All Skill Types" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "SOFT", label: "Soft Skill" },
  { value: "DOMAIN", label: "Domain Knowledge" },
  { value: "TOOL", label: "Tool / Software" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "OTHER", label: "Other" },
];

const TOP_K_OPTIONS = [3, 5, 10, 15, 20];

function MatchBadge({ matchType }: { matchType: MatchType }) {
  let bg = "rgba(100, 116, 139, 0.15)";
  let text = "#94a3b8";
  let border = "rgba(100, 116, 139, 0.3)";
  let label: string = matchType;

  switch (matchType) {
    case "EXACT":
      bg = "rgba(34, 197, 94, 0.15)";
      text = "#22c55e";
      border = "rgba(34, 197, 94, 0.35)";
      label = "Exact Match";
      break;
    case "ALIAS":
      bg = "rgba(139, 92, 246, 0.15)";
      text = "#a78bfa";
      border = "rgba(139, 92, 246, 0.35)";
      label = "Alias Match";
      break;
    case "STRONG_SEMANTIC":
      bg = "rgba(6, 182, 212, 0.15)";
      text = "#22d3ee";
      border = "rgba(6, 182, 212, 0.35)";
      label = "Strong Semantic";
      break;
    case "SEMANTIC":
      bg = "rgba(245, 158, 11, 0.15)";
      text = "#fbbf24";
      border = "rgba(245, 158, 11, 0.35)";
      label = "Suggested Semantic";
      break;
    default:
      label = matchType;
  }

  return (
    <span
      style={{
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? "#22c55e"
      : pct >= 85
      ? "#06b6d4"
      : pct >= 70
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.4s ease-out",
          }}
        />
      </div>
      <span
        style={{
          color,
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          minWidth: 38,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function SemanticMatchCard({ item }: { item: SemanticMatchItem }) {
  const isSemantic = item.match_type === "SEMANTIC" || item.match_type === "STRONG_SEMANTIC";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.2s, transform 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f8fafc" }}>
              {item.skill_name}
            </h3>
            <MatchBadge matchType={item.match_type} />
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                background: "rgba(255,255,255,0.05)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {item.category} · {item.skill_type}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Matched via: <span style={{ color: "#94a3b8" }}>{item.matched_via}</span>
          </div>
        </div>

        <SimilarityBar score={item.similarity} />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
        {item.explanation}
      </p>

      {isSemantic && (
        <div
          style={{
            fontSize: 11,
            color: "#fbbf24",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 6,
            padding: "4px 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
          }}
        >
          <span>ℹ</span>
          <span>
            Semantic match evidence is supporting context, not an automatic canonical confirmation.
          </span>
        </div>
      )}
    </div>
  );
}

export default function SemanticSkillMatchPage() {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [topK, setTopK] = useState(5);
  const [skillType, setSkillType] = useState<SkillType | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SemanticMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setError(null);
    setResult(null);

    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) {
      setValidationError("Skill query text must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 500) {
      setValidationError("Skill query text must not exceed 500 characters.");
      return;
    }
    if (!token) {
      setError("You must be signed in to perform semantic skill matching.");
      return;
    }

    setLoading(true);
    try {
      const payload: { text: string; top_k: number; skill_type?: SkillType } = {
        text: trimmed,
        top_k: topK,
      };
      if (skillType) {
        payload.skill_type = skillType as SkillType;
      }
      const res = await semanticSkillAPI.match(payload);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to perform semantic skill matching.");
    } finally {
      setLoading(false);
    }
  }

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
              gap: 8,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 24,
              padding: "6px 18px",
              fontSize: 13,
              color: "#818cf8",
              fontWeight: 600,
              marginBottom: 16,
              letterSpacing: "0.04em",
            }}
          >
            <span>🧠</span> LOCAL EMBEDDINGS · PHASE 9
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: "linear-gradient(135deg, #818cf8, #38bdf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 10px",
              lineHeight: 1.15,
            }}
          >
            Semantic Skill Matcher
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 15, margin: 0, maxWidth: 680, marginInline: "auto" }}>
            Test exact, alias, and local vector embedding matching against the canonical skill catalog.
            Sentence Transformers run locally with zero external API dependencies.
          </p>
        </div>

        {/* Input Form */}
        <form
          id="semantic-match-form"
          onSubmit={handleMatch}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 28,
            marginBottom: 28,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Query input */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="semantic-query-input"
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
              Skill Query / Raw Text
            </label>
            <input
              id="semantic-query-input"
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. 'NLP', 'React.js', 'PostgreSQL database development', 'Kubernetes'..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "#e2e8f0",
                padding: "12px 14px",
                fontSize: 15,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          {/* Options Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <label
                htmlFor="skill-type-select"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#94a3b8",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Skill Type Guardrail
              </label>
              <select
                id="skill-type-select"
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as SkillType | "")}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  padding: "9px 12px",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {SKILL_TYPES.map((st) => (
                  <option key={st.value} value={st.value} style={{ background: "#1e293b" }}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="top-k-select"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#94a3b8",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Top-K Candidates
              </label>
              <select
                id="top-k-select"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  padding: "9px 12px",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {TOP_K_OPTIONS.map((k) => (
                  <option key={k} value={k} style={{ background: "#1e293b" }}>
                    Top {k} results
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <div
              id="semantic-validation-error"
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

          {/* Submit button */}
          <button
            type="submit"
            id="semantic-match-submit"
            disabled={loading || !text.trim()}
            style={{
              background: loading
                ? "rgba(99,102,241,0.4)"
                : "linear-gradient(135deg, #4f46e5, #0ea5e9)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              opacity: loading || !text.trim() ? 0.6 : 1,
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
                Matching…
              </>
            ) : (
              "🔍 Find Semantic Matches"
            )}
          </button>
        </form>

        {/* API error */}
        {error && (
          <div
            id="semantic-api-error"
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

        {/* Results view */}
        {result && (
          <div id="semantic-match-results">
            {/* Model Metadata Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                Found <strong style={{ color: "#f8fafc" }}>{result.matches.length}</strong> candidate(s) for &ldquo;{result.query}&rdquo;
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  background: "rgba(255,255,255,0.04)",
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Model: <span style={{ color: "#94a3b8" }}>{result.model_name}</span>
              </div>
            </div>

            {/* Matches list */}
            {result.matches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.matches.map((item, idx) => (
                  <SemanticMatchCard key={`${item.skill_id}-${idx}`} item={item} />
                ))}
              </div>
            ) : (
              <div
                id="semantic-empty-state"
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  padding: 48,
                  border: "1px dashed rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <div style={{ fontWeight: 600, color: "#e2e8f0" }}>No matching canonical skills found</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  The input query did not meet the similarity threshold (70%) against canonical skills.
                </div>
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

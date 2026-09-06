# Phase 9 — Embeddings & Semantic Skill Matching

## 1. Purpose
Phase 9 extends **SkillSync AI** with an open-source, local semantic skill matching layer. The system allows users and upstream services to recognize semantically related skill expressions, natural language descriptions, and technical variants that may not match exact canonical names or Phase 5 aliases.

## 2. Why Semantic Matching is Needed
Exact string matching and manual aliases (Phase 5) capture known variations such as:
* `"React"` $\rightarrow$ `"React.js"`
* `"K8s"` $\rightarrow$ `"Kubernetes"`

However, candidates, job requisitions, and course descriptions frequently contain varied technical phrasing, descriptive skill expressions, and contextual synonyms:
* `"Container orchestration and cluster lifecycle"` $\rightarrow$ `"Kubernetes"`
* `"Natural Language Processing and text classification"` $\rightarrow$ `"Natural Language Processing"`
* `"PostgreSQL database architecture and query optimization"` $\rightarrow$ `"PostgreSQL"`

Semantic embedding matching evaluates contextual similarity to surface candidate canonical skills as **supporting evidence** while preserving deterministic sources of truth.

---

## 3. Exact vs Alias vs Semantic Matching Hierarchy

The matching engine enforces a strict 3-tier precedence hierarchy:

```
                  ┌──────────────────────────────┐
                  │       Raw Query Input        │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Tier 1: Exact Canonical Match│ ──[Found]──> MatchType: EXACT (1.0)
                  └──────────────┬───────────────┘
                                 │ [Not Found]
                                 ▼
                  ┌──────────────────────────────┐
                  │  Tier 2: Canonical Alias     │ ──[Found]──> MatchType: ALIAS (1.0)
                  └──────────────┬───────────────┘
                                 │ [Not Found / Top-K Fill]
                                 ▼
                  ┌──────────────────────────────┐
                  │ Tier 3: Vector Cosine Search │
                  └──────────────┬───────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         Cosine Score >= 0.85      0.70 <= Score < 0.85
                    │                         │
                    ▼                         ▼
         STRONG_SEMANTIC Match                 SEMANTIC Match
                    │                         │
                    └────────────┬────────────┘
                                 │
                         Score < 0.70 ──> Filtered Out (NO_MATCH)
```

**Precedence Rules**:
1. **Tier 1 (Exact Match)**: Matches `Skill.normalized_name`. Returns similarity `1.0` and `MatchType.EXACT`.
2. **Tier 2 (Alias Match)**: Matches `SkillAlias.normalized_alias`. Returns similarity `1.0` and `MatchType.ALIAS`.
3. **Tier 3 (Semantic Search)**: Computes dot-product cosine similarity over 384-dimensional unit vectors.
   * $\ge 0.85$: `STRONG_SEMANTIC`
   * $0.70 - 0.8499$: `SEMANTIC` (Suggested match)
   * $< 0.70$: Discarded (NO_MATCH)

---

## 4. Architecture
The semantic matching subsystem runs entirely **in-process** without any external SaaS APIs or cloud vector databases:

```
[Client / UI / API]
       │
       ▼
[FastAPI / JWT Auth & RBAC]
       │
       ▼
[SemanticSkillService] ─── (Precedence Hierarchy & Tie-Breaking)
       │
       ├── Tier 1 & Tier 2: PostgreSQL (skills & skill_aliases)
       │
       └── Tier 3: [EmbeddingService (Singleton)]
                        │
                        ▼
           [SentenceTransformers: all-MiniLM-L6-v2]
                        │  (384-dimensional unit vector)
                        ▼
           [PostgreSQL: skill_embeddings table]
                        │  (pgvector / Float Array storage)
                        ▼
           [Cosine Dot Product Calculation & Thresholds]
```

---

## 5. Embedding Model
* **Model**: `sentence-transformers/all-MiniLM-L6-v2`
* **Local Execution**: Yes, running via PyTorch / HuggingFace Transformers.
* **External Runtime Dependency**: None. Once downloaded, inference runs fully offline.
* **Singleton Lifecycle**: The `SentenceTransformer` instance is lazily loaded once per process inside `EmbeddingService` with thread-safe double-checked locking to avoid repeated disk reads.

---

## 6. Model Dimensionality & Normalization
* **Embedding Dimension**: 384
* **Vector Normalization**: Vectors are generated with `normalize_embeddings=True`, guaranteeing unit Euclidean norm ($\|v\| = 1.0$).
* **Text Normalization**: Sanitizes extra whitespace while preserving technical syntax tokens:
  * `C++`, `C#`, `.NET`, `Node.js`, `React.js`, `TCP/IP`

---

## 7. PostgreSQL Database Schema & Migration
* **Table**: `skill_embeddings`
* **Migration**: `0007_skill_embeddings` (extends `0006_candidate_module`)
* **Model Schema**:
  ```python
  class SkillEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
      __tablename__ = "skill_embeddings"

      skill_id: Mapped[uuid.UUID] = mapped_column(
          UUID(as_uuid=True),
          ForeignKey("skills.id", ondelete="CASCADE"),
          nullable=False,
          index=True,
      )
      embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
      source_text: Mapped[str] = mapped_column(Text, nullable=False)
      model_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
      embedding_dimension: Mapped[int] = mapped_column(Integer, nullable=False, default=384)
  ```
* **Constraints**: Unique constraint `uq_skill_embedding_model` on `(skill_id, model_name)`.

---

## 8. Deterministic Source Text Representation
To capture both the skill name, hierarchy, taxonomy category, and aliases in vector space, source text is constructed deterministically:

```python
source_text = f"{skill.name}. {skill.skill_type.title()} skill. Category: {skill.category}. Aliases: {sorted_aliases}."
```
*Example*:
`"Python. Technical skill. Category: Software Engineering. Aliases: CPython, Python 3, Python Programming."`

---

## 9. Embedding Generation CLI Command
To populate or refresh embeddings for the canonical skill catalog:

```bash
uv run python -m app.scripts.generate_skill_embeddings [--force]
```

**Features**:
* **Idempotent**: Existing, up-to-date embeddings are skipped.
* **Stale Detection**: Detects if `source_text` or `model_name` has changed and updates the stored embedding.
* **Force Option**: `--force` regenerates all active embeddings.

---

## 10. Semantic Safety & Anti-False-Equivalence Rules
Semantic similarity is **evidence, not equivalence**:
1. **Related is Not Equivalent**: Python and Django or PostgreSQL and MySQL are related in vocabulary but distinct skills.
2. **Lexical Distinction**: Java vs JavaScript are kept separate.
3. **Skill Type Guardrail**: Requests can pass `skill_type` to prevent technical queries from matching soft skills or certifications.
4. **Deterministic Tie-Breaking**: Candidates with equal similarity are sorted by:
   1. `similarity` DESC
   2. `skill_name` ASC (case-insensitive)
   3. `skill_id` ASC

---

## 11. API Endpoints

### 1. Match Skill (Authenticated)
`POST /api/v1/skills/semantic-match`

**Request**:
```json
{
  "text": "container orchestration",
  "top_k": 5,
  "skill_type": "TECHNICAL"
}
```

**Response**:
```json
{
  "query": "container orchestration",
  "normalized_query": "container orchestration",
  "matches": [
    {
      "skill_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "skill_name": "Docker",
      "skill_type": "TECHNICAL",
      "category": "DevOps & Cloud",
      "similarity": 0.8124,
      "match_type": "SEMANTIC",
      "matched_via": "Local vector embedding",
      "explanation": "Suggested semantic match with 81.2% similarity. Review recommended before confirmation."
    }
  ],
  "model_name": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### 2. Embedding Coverage Status (Admin Only)
`GET /api/v1/skills/embeddings/status`

**Response**:
```json
{
  "total_active_skills": 387,
  "embedded_skills": 387,
  "missing_embeddings": 0,
  "model_name": "sentence-transformers/all-MiniLM-L6-v2",
  "dimension": 384,
  "is_model_available": true
}
```

---

## 12. Frontend User Experience
* **Route**: `/tools/semantic-skill-match`
* **Navigation**: Available in the sidebar under Tools.
* **Features**:
  * Real-time query input with length validation (2 to 500 chars).
  * Configurable Top-K selector (3, 5, 10, 15, 20).
  * Optional skill type guardrail selector.
  * Distinct color-coded match type badges (`Exact Match`, `Alias Match`, `Strong Semantic`, `Suggested Semantic`).
  * Visual animated similarity progress bars.
  * Clear UX disclaimer that semantic matches are suggestions and not confirmed canonical skills.

---

## 13. Testing and Validation
* **Backend Pytest**: 107 tests passing (100% pass rate).
* **Frontend Vitest**: 75 tests passing (100% pass rate).
* **Ruff Check & Format**: 100% compliant.
* **ESLint**: 0 errors.
* **TypeScript Compiler (`npx tsc --noEmit`)**: 0 errors.
* **Next.js Production Build (`npm run build`)**: Succeeded with 26 static routes.

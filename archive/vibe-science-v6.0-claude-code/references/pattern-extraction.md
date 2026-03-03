# Cross-Session Pattern Extraction — Reference Protocol

Pattern extraction identifies recurring behaviors across sessions — failures that keep happening, actions that repeat, claims that die for the same reason. These patterns are the system's long-term memory. Without them, each session starts from scratch and repeats the same mistakes.

---

## The Four Pattern Types

### 1. GATE_FAILURE_CLUSTER

**Definition:** The same gate failing across 2 or more sessions.

**Why it matters:** A gate that fails repeatedly is not a random event — it signals a systematic issue in the research process. Either the researcher consistently misses a step, or the data has a recurring property that triggers the gate.

**Evidence structure:**

```json
{
  "gate_id": "DQ1",
  "sessions": [
    {"session_id": "abc123", "fail_count": 3, "timestamp": "2026-01-15T10:00:00Z"},
    {"session_id": "def456", "fail_count": 2, "timestamp": "2026-01-18T14:00:00Z"}
  ],
  "common_failure_reasons": ["zero_variance_columns", "missing_values_above_threshold"]
}
```

**Confidence formula:** `confidence = min(1.0, fail_count * 0.2)`

Where `fail_count` is the total number of failures across all sessions. Examples:
- 2 failures across 2 sessions: confidence = 0.4
- 5 failures across 3 sessions: confidence = 1.0

**Actionable output:** "Gate DQ1 has failed in 3 of the last 5 sessions, primarily due to zero-variance columns. Consider adding a pre-extraction variance filter."

---

### 2. REPEATED_ACTION

**Definition:** The same action type with the same input summary appearing across 2 or more sessions.

**Why it matters:** Repeated actions suggest either (a) the agent is re-doing work it already completed, or (b) there is a recurring need that should be automated or cached.

**Evidence structure:**

```json
{
  "action_type": "literature_search",
  "input_summary": "CRISPR off-target effects single-cell",
  "sessions": [
    {"session_id": "abc123", "occurrences": 4, "timestamp": "2026-01-15T10:00:00Z"},
    {"session_id": "def456", "occurrences": 2, "timestamp": "2026-01-18T14:00:00Z"}
  ]
}
```

**Confidence formula:** `confidence = min(1.0, occurrences * 0.15)`

Where `occurrences` is the total count across all sessions. Examples:
- 3 occurrences across 2 sessions: confidence = 0.45
- 7 occurrences across 3 sessions: confidence = 1.0

**Actionable output:** "Literature search for 'CRISPR off-target effects single-cell' has been performed 6 times across 3 sessions. Consider caching results or refining the query."

---

### 3. CLAIM_LIFECYCLE

**Definition:** Claims being killed for the same reason across sessions.

**Why it matters:** If claims keep dying from the same cause (e.g., CONFOUNDED, INSUFFICIENT_EVIDENCE), the research strategy has a systematic blind spot. The pattern points to where the researcher needs to change approach, not just fix individual claims.

**Evidence structure:**

```json
{
  "kill_reason": "CONFOUNDED",
  "confounder_type": "batch_effect",
  "sessions": [
    {"session_id": "abc123", "claim_ids": ["C-003", "C-007"], "timestamp": "2026-01-15T10:00:00Z"},
    {"session_id": "def456", "claim_ids": ["C-002"], "timestamp": "2026-01-18T14:00:00Z"}
  ]
}
```

**Confidence formula:** `confidence = min(1.0, kill_count * 0.25)`

Where `kill_count` is the total number of claims killed for this reason. Examples:
- 2 kills across 2 sessions: confidence = 0.5
- 4 kills across 3 sessions: confidence = 1.0

**Actionable output:** "3 claims have been killed for CONFOUNDED (batch_effect) across 2 sessions. Batch effects are a systematic confounder in this dataset. Consider batch correction before any further differential analyses."

---

### 4. INSTINCT

**Definition:** Learned behavior pattern from cross-session observation.

**Why it matters:** Instincts are high-confidence patterns that have been validated across multiple sessions and promoted from other pattern types. They represent the system's accumulated wisdom about how to conduct research effectively in the current domain. When an instinct is relevant to the current context, the agent should apply it proactively rather than rediscovering the lesson.

**Evidence structure:**

```json
{
  "instinct_description": "Always run batch correction before differential expression",
  "source_pattern_type": "CLAIM_LIFECYCLE",
  "sessions": [
    {"session_id": "abc123", "outcome": "applied", "timestamp": "2026-01-15T10:00:00Z"},
    {"session_id": "def456", "outcome": "confirmed", "timestamp": "2026-01-18T14:00:00Z"}
  ],
  "promotion_reason": "Pattern confirmed across 4+ sessions with confidence >= 0.7"
}
```

**Confidence formula:** `confidence = min(0.9, base_confidence + 0.1 * confirmations)`

Where `base_confidence` is inherited from the source pattern and `confirmations` is the number of sessions where the instinct was applied successfully. Instinct confidence is capped at 0.9 — no instinct should be treated as absolute truth.

**Actionable output:** "Instinct: Always run batch correction before differential expression (confidence: 0.8, confirmed in 4 sessions). Applying proactively."

---

## Database Schema

Patterns are stored in the `research_patterns` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `pattern_type` | TEXT NOT NULL | One of: `GATE_FAILURE_CLUSTER`, `REPEATED_ACTION`, `CLAIM_LIFECYCLE`, `INSTINCT` |
| `description` | TEXT NOT NULL | Human-readable summary of the pattern |
| `evidence` | TEXT (JSON) | Structured evidence (see examples above) |
| `confidence` | REAL NOT NULL | Confidence score, 0.0 to 1.0 |
| `occurrences` | INTEGER NOT NULL | Total occurrence count across all sessions |
| `first_seen` | TEXT NOT NULL | ISO 8601 timestamp of first observation |
| `last_seen` | TEXT NOT NULL | ISO 8601 timestamp of most recent observation |
| `project_path` | TEXT NOT NULL | Path to the RQ directory this pattern belongs to |
| `active` | INTEGER NOT NULL DEFAULT 1 | 1 = active, 0 = archived |

**Index:** Unique index on `(pattern_type, description, project_path)` for upsert operations.

---

## Extraction Process

Pattern extraction runs in the **Stop hook** (see `hook-system.md`), after the narrative summary is generated.

### Step 1: Gather Session Data

Query the research spine for the current session:
- All gate results (pass/fail, gate_id, failure reasons)
- All tool invocations (action_type, input summary)
- All claim status changes (claim_id, old_status, new_status, reason)

### Step 2: Identify Candidates

For each pattern type, identify candidates from the current session:
- **GATE_FAILURE_CLUSTER:** Any gate that failed at least once in this session.
- **REPEATED_ACTION:** Any action_type + input_summary pair that appeared at least twice in this session.
- **CLAIM_LIFECYCLE:** Any claim killed with a specific reason in this session.

### Step 3: Cross-Reference with Existing Patterns

For each candidate, check the `research_patterns` table:
- If a matching pattern exists (same type + description + project): this is an **upsert** (update existing).
- If no match: this is an **insert** (new pattern).

### Step 4: Upsert

**For existing patterns:**
1. Increment `occurrences` by the current session's count.
2. Update `confidence` to `min(1.0, max(old_confidence, new_confidence) + 0.1)`.
3. Merge evidence: append current session's evidence to the existing array, keeping only the last 20 entries (FIFO).
4. Update `last_seen` to current timestamp.

**For new patterns:**
1. Insert with initial confidence from the type-specific formula.
2. Set `occurrences` to the current session's count.
3. Set `first_seen` and `last_seen` to current timestamp.
4. Set `active` = 1.

---

## Confidence Decay

Pattern confidence decays over time to prevent stale patterns from dominating.

**Rate:** -0.02 per week (applied at query time, not stored).

**Formula:** `effective_confidence = confidence * exp(-0.02 * weeks_since_last_seen)`

Where `weeks_since_last_seen = (now - last_seen) / (7 * 24 * 60 * 60 * 1000)`.

**Archival threshold:** When `effective_confidence` drops below 0.2, the pattern is archived (`active` = 0). Archived patterns are not surfaced in SessionStart but remain in the DB for historical analysis.

**Reactivation:** If an archived pattern matches a new observation, it is reactivated: `active` = 1, confidence recalculated from the new observation, `last_seen` updated.

---

## Surfacing in SessionStart

The SessionStart hook queries active patterns and includes them in the `[PATTERNS]` block of the progressive context:

```
[PATTERNS] 3 active patterns:
  GATE_FAILURE_CLUSTER: DQ1 fails on zero-variance columns (confidence: 0.6, last: 2 days ago)
  REPEATED_ACTION: Literature search "CRISPR off-target" repeated 6x (confidence: 0.9, last: 1 day ago)
  CLAIM_LIFECYCLE: Claims killed for CONFOUNDED/batch_effect 3x (confidence: 0.75, last: 3 days ago)
```

Only patterns with `effective_confidence >= 0.3` are surfaced. Lower-confidence patterns are available via direct DB query but not proactively shown.

---

## Integration

- **Stop hook** runs extraction (this protocol).
- **SessionStart hook** surfaces patterns in progressive context.
- **Instinct model** (`instinct-model.md`) can promote high-confidence patterns to instincts.
- **R2 calibration** (`r2-calibration.md`) uses a related but separate decay mechanism for review quality data.
- **Observer** flags patterns that have been active for more than 5 sessions without resolution.

---

*This protocol is domain-agnostic. Pattern types may be extended in future versions, but the extraction-upsert-decay-surface lifecycle is stable.*

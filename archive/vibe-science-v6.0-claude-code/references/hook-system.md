# Hook-Based Enforcement System — Reference Protocol

The hook system is the enforcement backbone of Vibe Science. Five hooks intercept the agent lifecycle at critical points — session start, prompt submission, tool use, context compaction, and session end — to enforce the Immutable Laws without relying on the agent's memory or goodwill. Hooks operate outside the context window. They are infrastructure, not suggestions.

---

## Architecture Overview

```
Session Start ──► UserPromptSubmit ──► [Agent works] ──► PostToolUse (per tool)
                                                              │
                                                              ▼
                                              PreCompact (if compaction triggered)
                                                              │
                                                              ▼
                                                            Stop
```

All hooks communicate with the agent through two mechanisms:

1. **Exit code 0** — Hook ran successfully. Any output in `hookSpecificOutput.additionalContext` is injected into the agent's context.
2. **Exit code 2 + stderr** — Advisory feedback. The tool already ran (for PostToolUse) or the action is blocked (for Stop). The stderr message is surfaced to the agent as guidance.

Hooks never use exit code 1 (hard crash) in production. Infrastructure failure degrades gracefully.

---

## Hook 1: SessionStart (`session-start.js`)

**When:** Runs once at the beginning of every session.

**Laws enforced:** LAW 7 (Fresh Context Resilience), LAW 12 (Instinct Model).

**What it does:**

1. **Auto-setup** — If the SQLite database does not exist, runs first-time setup: creates tables, initializes schemas, writes default configuration. This means `vibe-science` is zero-config — the first session bootstraps everything.
2. **Opens DB** — Connects to the project database at `.vibe-science/vibe.db`.
3. **Creates session record** — Generates a UUID for the current session. All subsequent entries (spine, claims, reviews) reference this session ID.
4. **Builds progressive context** — Queries the DB to assemble a context block (~700 tokens) containing:
   - **State snapshot** from the last session (last STATE.md content, truncated)
   - **Observer alerts** — Any unresolved warnings from previous sessions (stale files, desync, orphaned data)
   - **R2 calibration data** — Temporal-decay-weighted weakness summary (see `r2-calibration.md`), with hints like "R2 historically weak on batch-effect confounders"
   - **Cross-session patterns** — Extracted patterns from the `research_patterns` table (see `pattern-extraction.md`)
   - **Pending serendipity seeds** — Any seeds from previous sessions that were never followed up
5. **Loads domain config** — Reads `domain-config.json` if present, applies domain-specific thresholds.
6. **Injects context** — The assembled context is returned via `hookSpecificOutput.additionalContext`, making it available to the agent without consuming the prompt.

**Exit behavior:** Always exits 0. SessionStart must never block — a failed session start is worse than a session without context.

**Output format:**

```
[SESSION] id=abc123-... | project=RQ-001 | resumed_from=prev-session-id
[STATE] Last stage: T3 | Active claims: 3 | Pending seeds: 1
[OBSERVER] WARN: STATE.md last modified 3 days ago (threshold: 1 day)
[R2-CAL] Weakness: insufficient confounder checks (weight: 2.1) | SFI: missed SIGN_REVERSAL 2/3 times
[PATTERNS] GATE_FAILURE_CLUSTER: DQ1 failed in 3/5 recent sessions (confidence: 0.6)
[SEEDS] Pending: SEED-007 "Unexpected correlation between batch and treatment" (age: 2 sessions)
```

---

## Hook 2: UserPromptSubmit (`prompt-submit.js`)

**When:** Runs before each user prompt is processed by the agent.

**Laws enforced:** LAW 10 (Crystallize or Lose), LAW 7 (Fresh Context Resilience).

**What it does:**

1. **Role identification** — Analyzes the prompt for explicit role markers (e.g., "As R2, review...") or implicit role keywords (e.g., "review", "destroy", "scan anomalies"). Maps to one of: RESEARCHER, R2, SERENDIPITY, EXPERIMENTER, LEAD, JUDGE. Defaults to RESEARCHER if ambiguous.
2. **Prompt logging** — Computes a SHA-256 hash of the prompt text and logs the hash (not the text) to the DB. This is privacy-preserving: it enables deduplication and pattern analysis without storing user content.
3. **Semantic recall** — Takes the first 500 characters of the prompt and performs vector similarity search against the embedding store. Returns the top 3-5 most relevant memories from previous sessions. This surfaces prior work that the agent may not remember after context loss.
4. **Returns recalled memories** — Relevant memories are injected via `hookSpecificOutput.additionalContext`.

**Exit behavior:** Always exits 0. Prompt submission must not be blocked by recall failures.

**Output format:**

```
[ROLE] Detected: RESEARCHER (explicit marker)
[RECALL] 3 relevant memories found:
  - Session abc123 (2 days ago): "DQ1 failed on zero-variance columns in batch 3"
  - Session def456 (5 days ago): "R2 demanded propensity matching for age confounder"
  - Session ghi789 (1 week ago): "Serendipity seed: unexpected sex-differential response"
```

---

## Hook 3: PostToolUse (`post-tool-use.js`)

**When:** Runs after every tool invocation by the agent.

**Laws enforced:** LAW 3 (Gates Block), LAW 6 (Artifacts Over Prose), LAW 10 (Crystallize or Lose).

**What it does:** Four independent sections, each checking different aspects:

### Section 1: Gate Enforcement

- **DQ4 sync check** — If the tool wrote to FINDINGS.md or CLAIM-LEDGER.md, verifies that all numbers in the markdown match the structured JSON source (see `ssot.md`). Desync triggers a WARN.
- **CLAIM-LEDGER prerequisite gates** — If the tool attempted to promote a claim (status change to D1+), checks that all prerequisite gates passed. Missing prerequisites block the promotion.
- **L-1 literature search gate** — If the tool created a new direction node (tree branch), checks that at least one literature search was performed for that direction. Directions without literature grounding are flagged.

### Section 2: Permission Enforcement

- **Role-based access control** — In TEAM mode (multi-agent), enforces the Agent Permission Model:
  - Researcher: READ+WRITE on Claim Ledger, READ on R2 Reports, READ on Schemas
  - R2 Ensemble: READ only on Claim Ledger, WRITE on R2 Reports, READ on Schemas
  - R3 Judge: READ only on both Claim Ledger and R2 Reports, READ on Schemas
  - Orchestrator: READ+WRITE on Claim Ledger, READ on R2 Reports, READ (enforce) on Schemas
- Unauthorized writes are blocked with a descriptive error message.

### Section 3: Auto-Logging

- **Research spine entries** — Every tool invocation is logged as a spine entry in the DB: timestamp, tool name, input summary (truncated), output summary (truncated), session ID.
- **Embedding queue** — Significant entries (file writes, claim updates, finding formulations) are queued for embedding. The embedding is computed asynchronously and stored for future semantic recall.

### Section 4: Observer Checks

Periodic health checks that run every N tool invocations (configurable, default: 10):

- **Stale STATE.md** — If STATE.md has not been modified in more than 1 day (configurable), emit WARN.
- **FINDINGS/JSON desync** — Compare modification timestamps of FINDINGS.md and its JSON source. If FINDINGS.md is newer, numbers may have been manually edited.
- **Orphaned data** — Check for data files in `.vibe-science/` that are not referenced by any claim or finding.
- **Design-execution drift** — Compare the planned tree path (from TREE-STATE.json) with actual executed steps. Flag divergences.
- **Literature staleness** — Check if literature searches are older than the configured threshold (default: 14 days for active RQs).

**Exit behavior:** Exit 2 + stderr for advisory feedback. The tool has already executed; the hook provides post-hoc guidance. Exit 0 if no issues found.

**Output format (stderr, on issues):**

```
[GATE] DQ4-SYNC: FINDINGS.md line 23 contains "0.891" — not found in results.json (closest: 0.847)
[PERM] BLOCKED: R2 agent attempted WRITE to CLAIM-LEDGER.md — only Orchestrator/Researcher may write
[OBSERVER] WARN: STATE.md last modified 26 hours ago — consider updating
[OBSERVER] WARN: orphaned file detected: .vibe-science/data/old_extraction.json
```

---

## Hook 4: Stop (`stop.js`)

**When:** Runs when the agent is about to end a session.

**Laws enforced:** LAW 4 (R2 is Co-Pilot), LAW 7 (Fresh Context Resilience), LAW 12 (Instinct Model).

**What it does:**

### Step 1: Narrative Summary

Generates a template-based narrative summary of the session:
- What was investigated
- What claims were created, promoted, killed, or disputed
- What gates passed or failed
- What serendipity seeds were found
- What the next logical steps are

The summary is saved to the DB (sessions table) and queued for embedding. This summary is what SessionStart will load for the next session.

### Step 2: Enforcement Check

Queries the CLAIM-LEDGER for any claims with status CREATED that have not been submitted to R2 review. If unreviewed claims exist:

- **Exit code 2** — Blocks the session stop.
- **stderr message** — Lists the unreviewed claims and demands R2 review before session end.
- This enforces LAW 4: R2 is co-pilot. No claim leaves a session without adversarial review.

The agent must either submit claims to R2 or explicitly kill them before the session can end.

### Step 3: State Export

Updates `.vibe-science/STATE.md` from the current DB state:
- Current stage and cycle
- Active claims with confidence levels
- Pending gates
- Open serendipity seeds
- Last observer warnings

This ensures LAW 7: even if the DB is lost, STATE.md on disk contains enough to resume.

### Step 4: Pattern Extraction

Extracts cross-session patterns from the current session's spine data (see `pattern-extraction.md`):
- Gate failure clusters
- Repeated actions
- Claim lifecycle patterns

Patterns are upserted to the `research_patterns` DB table for surfacing in future SessionStart hooks.

**Exit behavior:** Exit 0 if all checks pass. Exit 2 + stderr if unreviewed claims exist (blocks stop).

---

## Hook 5: PreCompact (`pre-compact.js`)

**When:** Runs immediately before context compaction (when the context window is about to be truncated).

**Laws enforced:** LAW 7 (Fresh Context Resilience), LAW 10 (Crystallize or Lose).

**What it does:**

Context compaction erases the buffer. This hook ensures that nothing important is lost.

1. **Snapshots active claims** — Queries the CLAIM-LEDGER for all claims with status CREATED (not yet KILLED, DISPUTED, or R2_REVIEWED). Records their claim IDs, descriptions, confidence levels, and current evidence chains.
2. **Snapshots pending serendipity seeds** — Queries SERENDIPITY.md or the DB for seeds that have not been followed up.
3. **Records spine entry count** — Logs the total number of spine entries in the current session, so the next context knows how much work was done.
4. **Captures STATE.md content** — Reads the current STATE.md and stores it (truncated to 10KB if necessary).
5. **Saves as COMPACT_SNAPSHOT** — All of the above is bundled into a single spine entry with type `COMPACT_SNAPSHOT` and saved to the DB.
6. **Queues for embedding** — The snapshot is queued for embedding so it can be recalled by semantic search in future sessions.

**Exit behavior:** Always exits 0. PreCompact must never block compaction — losing context is bad, but freezing the agent is worse.

**Output format:**

```
[COMPACT] Snapshot saved: 4 active claims, 2 pending seeds, 147 spine entries
[COMPACT] STATE.md captured (2.3KB)
[COMPACT] Snapshot queued for embedding
```

---

## Graceful Degradation

All hooks are designed to degrade gracefully when infrastructure is unavailable:

| Failure | Behavior |
|---------|----------|
| DB file missing | SessionStart auto-creates it. Other hooks skip DB operations and log a warning. |
| DB locked (concurrent access) | Retry 3 times with 100ms backoff. If still locked, skip DB operations. |
| `better-sqlite3` not installed | All hooks skip DB operations entirely. File-based enforcement (STATE.md, TREE-STATE.json) still works. |
| Embedding service unavailable | Entries are queued but not embedded. Queue persists for next attempt. |
| STATE.md missing | SessionStart creates a minimal one. Other hooks warn but continue. |
| TREE-STATE.json missing | Hooks that need tree data skip those checks. Observer flags the absence. |
| Malformed JSON in DB | Affected records are skipped with a warning. Other records still process. |

**The design principle:** Infrastructure failure should never block the agent. A degraded session is better than no session. The agent can always fall back to manual file-based operation per LAW 7.

---

## Dual-Config Strategy

Hooks are defined in two places for different deployment modes:

1. **`.claude/settings.json`** — Project-level hooks for dev mode (working within this repo). Uses `$CLAUDE_PROJECT_DIR` as the path root.
2. **`plugin/hooks/hooks.json`** — Plugin hooks for installed mode (when vibe-science is installed as a Claude Code plugin via marketplace). Uses `${CLAUDE_PLUGIN_ROOT}` as the path root.

Both configurations point to the same scripts in `plugin/scripts/`. The hook behavior is identical regardless of deployment mode.

---

## Hook Execution Summary

| Hook | Trigger | Can Block? | Exit Codes | Primary Laws |
|------|---------|------------|------------|-------------|
| SessionStart | Session begins | No | 0 only | LAW 7, LAW 12 |
| UserPromptSubmit | Before each prompt | No | 0 only | LAW 10, LAW 7 |
| PostToolUse | After each tool | No (advisory) | 0, 2 | LAW 3, LAW 6, LAW 10 |
| PreCompact | Before compaction | No | 0 only | LAW 7, LAW 10 |
| Stop | Session ending | Yes (LAW 4) | 0, 2 | LAW 4, LAW 7, LAW 12 |

---

*This protocol is infrastructure-level. Individual hooks may evolve, but the enforcement architecture — intercept, check, advise, never crash — is permanent.*

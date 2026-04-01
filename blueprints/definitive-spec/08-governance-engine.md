# 08 — Governance Engine

---

## Purpose

Ensure the Vibe Research Environment operates safely around the kernel.

This document intentionally separates:
- **kernel prerequisites** the outer project depends on but does NOT own
- **outer-project safeguards** the new repo owns directly

**Source:** Patterns from gstack (anti-pattern tables), superpowers (verification gates), paperclip (budget enforcement, lifecycle state machines), ECC (hook profiles, governance capture), hermes-agent (Unicode normalization), strix (structured report validation).

---

## Kernel Prerequisites (Dependency, Not Ownership)

The following capabilities belong to the Vibe Science kernel. The Vibe Research Environment depends on them, but does NOT implement them in its own repo.

**Note on Laws:** LAW 1-12 (Immutable Laws) and the confounder harness (LAW 9) are defined in the kernel's `CLAUDE.md` constitution. This spec references them by number but does NOT redefine them. See the kernel's CLAUDE.md for authoritative definitions.

Minimum requirement for the future separate repo:
- compatible Vibe Science version exposing governance profiles
- append-only governance event storage
- kernel-side config protection
- kernel-side claim event sequence enforcement

---

## Kernel Prerequisite: Governance Profiles

Hooks execute conditionally based on the active profile.

| Profile | When to use | What runs |
|---------|-------------|-----------|
| `minimal` | Quick exploration, literature scan | SessionStart, Stop, + NON-NEGOTIABLE hooks (see below) |
| `standard` | Normal research session (DEFAULT) | All hooks, warnings on violations |
| `strict` | Validation, publication prep, final review | All hooks + halt on any infrastructure failure |

Set via: `VBS_GOVERNANCE_PROFILE=standard` (default)

### Non-Negotiable Hooks (ALL profiles, including minimal)

These CANNOT be disabled by any profile:
- **PreToolUse confounder check** on CLAIM-LEDGER writes (LAW 9)
- **Stop hook** unreviewed-claims blocking (LAW 4)
- **Integrity degradation** tracking
- **Schema file protection** (LAW 3)

Only ADVISORY hooks are profile-gated: observer scans, pattern extraction, calibration hints, memory sync reminders.

### Surgical Suppression

For noisy advisory hooks: `VBS_DISABLED_HOOKS=hook-a,hook-b`

Never allows disabling non-negotiable hooks. If attempted, log governance event and ignore the suppression.

---

## Kernel Prerequisite: Governance Audit Trail

Every governance-relevant event is persisted to an **append-only** table.

```sql
CREATE TABLE IF NOT EXISTS governance_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  tool_name TEXT,
  severity TEXT,    -- 'info', 'warning', 'critical'
  details TEXT,
  timestamp REAL NOT NULL
);
```

**Append-only rule:** No UPDATE or DELETE on this table.
- Primary guarantee: storage-level immutability (SQLite trigger or equivalent write policy)
- Secondary guarantee: if PostToolUse detects a DELETE/UPDATE targeting `governance_events`, it blocks with exit code 2

### Tracked Events

| Event type | Trigger |
|-----------|---------|
| `claim_without_harness` | Claim written to CLAIM-LEDGER without confounder_status (kernel LAW 9 — confounder harness is kernel-owned, defined in CLAUDE.md) |
| `schema_modification_attempt` | Write/Edit targeting immutable schema files |
| `r2_bypass_attempt` | Claim promotion without R2_REVIEWED event |
| `law_violation` | Detected violation of any Immutable Law |
| `profile_transition` | Governance profile changed during session |
| `force_stop_override` | User set VBS_FORCE_STOP=1 to bypass stop blocking |
| `stale_mirror_warning` | Memory mirror >24h stale when sync attempted |

---

## Kernel Prerequisite: Claim Event Sequence Validation

Claims move through a validated event sequence. The kernel's structured-block-parser enforces this; the outer project depends on that guarantee and never redefines it.

### Valid Event Sequences

```
CREATED → R2_REVIEWED → PROMOTED   (passed review + confounder harness)
CREATED → R2_REVIEWED → KILLED     (evidence insufficient)
CREATED → R2_REVIEWED → DISPUTED   (R2 deadlock, circuit breaker)
DISPUTED → R2_REVIEWED → PROMOTED|KILLED  (new evidence breaks deadlock)
```

### Invalid Sequences (BLOCKED)

```
CREATED → PROMOTED                 (no R2_REVIEWED — violates LAW 4)
KILLED → PROMOTED                  (dead claims don't resurrect)
KILLED → R2_REVIEWED               (review dead claim is waste — create new)
```

### Implementation Note

In v7, `claim_events` records EVENT TYPES, not states. Current status is DERIVED from the latest event. The outer project reads derived status via `reader.listClaimHeads()`.

---

## Kernel Prerequisite: Config Protection

PreToolUse MUST block Write/Edit targeting immutable files:

| Protected file | Reason |
|---------------|--------|
| `skills/vibe/assets/schemas/*.schema.json` | Read-only gate schemas |
| `skills/vibe/assets/fault-taxonomy.yaml` | SFI definitions (HUMAN-ONLY) |
| `skills/vibe/assets/judge-rubric.yaml` | R3 scoring rubric |

**Block message:** "These files are IMMUTABLE. Fix the claim/analysis, not the schema."

**Log to governance_events** as `schema_modification_attempt`.

---

## Outer-Project Safeguards

The following safeguards are owned by the Vibe Research Environment itself. They never mutate kernel truth; they regulate how the shell behaves around kernel truth.

---

## Profile Transition Safety

When governance profile changes from lower to higher level:

1. Log the transition as governance event (`profile_transition`)
2. Do NOT retroactively validate old claims
3. Claims created under a lower profile carry `governance_profile_at_creation` metadata
4. Export-eligibility MUST check: claims created under `minimal` require explicit R2 review before export, regardless of current profile
5. Claims created under `minimal` MUST also pass fresh schema validation at export time

Minimum contract consequence:
- the kernel must expose `governance_profile_at_creation` to the outer project
  through claim metadata or a companion projection before the profile-safety
  extension can be considered fully implemented
- the outer project records fresh validation artifacts at
  `.vibe-science-environment/governance/schema-validation/<claimId>.json`
  using `environment/schemas/schema-validation-record.schema.json`

---

## Relationship Validators (CI)

Validators that run in CI to prevent spec/runtime drift:

| Validator | What it checks |
|-----------|---------------|
| `validate-references.js` | Every referenced file in specs actually exists |
| `validate-roles.js` | Every role in roles.md maps to a known permission-engine role |
| `validate-templates.js` | Every template in environment/templates/ is valid JSON |
| `validate-runtime-contracts.js` | Runtime schemas and append-only files match spec contracts |
| `validate-install-bundles.js` | Every bundle manifest references real repo paths |
| `validate-bundle-ownership.js` | No two bundles claim the same owned path |
| `validate-no-personal-paths.js` | No hardcoded user paths in committed files |
| `validate-counts.js` | Counts in system-map match actual file counts |
| `validate-no-kernel-writes.js` | No outer-project code bypasses read-only rule |

---

## Outer-Project Telemetry Discipline

The control plane emits structured events to:

`.vibe-science-environment/control/events.jsonl`

This is not generic logging. It is operational telemetry with stable event
types, append-only writes, and attempt linkage.

Minimum event types:
- `attempt_opened`
- `attempt_updated`
- `session_snapshot_published`
- `degraded_mode_entered`
- `budget_stop_triggered`
- `operator_override`

Rules:
1. events are observational only — they never create truth
2. events are append-only
3. if an event references an attempt, it MUST include `attemptId`
4. budget and lifecycle policy consume these events instead of scraping prompt transcripts

---

## Shared Policy Middleware

All outer-project lifecycle-sensitive commands MUST run through the same
middleware chain, not re-encode policy in markdown shims.

Implementation:
- `environment/control/middleware.js`
- `environment/control/capabilities.js`
- `environment/control/events.js`
- `environment/control/session-snapshot.js`

Minimum chain:
1. refresh capability snapshot
2. open/update attempt
3. enforce budget and degraded-mode policy
4. execute command-specific logic
5. append telemetry events
6. republish canonical session snapshot

This is how the shell stays operationally consistent without gaining epistemic
authority.

---

## Budget Guardrails

| Threshold | Action |
|-----------|--------|
| 80% of cycle tool-call budget | ADVISORY: "Approaching budget. Consider wrapping up." |
| 100% of cycle tool-call budget | HARD STOP: "Budget exceeded. R2 review required." |
| 3 failed analysis attempts on same claim | ESCALATION: "3 attempts failed. Change approach or escalate." |

Track per session: tool_calls, claims_produced, claims_killed, r2_reviews, estimated_cost_usd.

Storage: `.vibe-science-environment/metrics/costs.jsonl` (append-only, one row per session stop).
**Schema:** `environment/schemas/costs-record.schema.json`

### Enforcement Owner

Budget guardrails are an **outer-project safeguard**, not a kernel hook.

Owner:
- `environment/lib/session-metrics.js` accumulates per-session metrics
- `environment/lib/token-counter.js` chooses provider-native counting when available
- `environment/control/events.js` records budget-relevant events
- each `/flow-*` command checks budget before starting expensive new work
- `/flow-status` surfaces the current budget state from the canonical session snapshot
- `costs.jsonl` records whether counting was `provider_native` or `char_fallback`

Meaning of the hard stop:
- it blocks additional outer-project flow work for the current session
- it does NOT override or interfere with kernel hooks
- it is cleared only by explicit reviewer intervention, session rollover, or a
  user-approved reset recorded in operator validation artifacts

---

## Seven Core Invariants (from broader-system governance)

Every new feature must pass this test:

| Invariant | Rule |
|-----------|------|
| A | Protected Truth Model — claim, citation, gate, confounder, stop, integrity, R2 are kernel-owned |
| B | Canonical Sources — runtime DB and canonical artifacts only; markdown is mirror |
| C | Shell Features Downstream — shell reads, mirrors, packages; never judges or promotes |
| D | Adapters Not Judges — external tools never validate claims/evidence/citations |
| E | Automation Accelerates, Never Self-Legitimates — reminders yes, autonomous approval no |
| F | Soft Shell, Hard Kernel — shell failure degrades UX, not truth |
| G | Breadth Without Softness — more workflows, not less rigor |

### Acceptance Test for New Features

Before any feature is added, answer these six questions:
1. Does it read kernel state or does it try to WRITE kernel truth?
2. Does it degrade gracefully if removed?
3. Does it create a parallel truth path?
4. Does it tempt users to skip the hard kernel?
5. Does it add workflow capability WITHOUT adding epistemic authority?
6. If it fails, does kernel truth remain intact?

All six must be "safe" or the feature is rejected.

---

## Invariants

1. Non-negotiable hooks run in ALL profiles
2. Governance events are append-only (never deleted or modified)
3. Claim transitions follow validated event sequences
4. Schema files are immutable to outer project
5. Profile transitions are logged and affect export eligibility
6. Budget guardrails prevent runaway sessions
7. Every new feature passes the 6-question acceptance test
8. Lifecycle-sensitive commands share one middleware chain instead of re-encoding policy per prompt
9. Outer-project telemetry is append-only, structured, and never a second truth layer

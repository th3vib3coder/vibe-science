# 02 — Kernel Contract

---

## Purpose

This document defines how the Vibe Research Environment talks to the Vibe Science kernel. Every interaction goes through this contract. No exceptions.

---

## The Read-Only Rule

This project READS kernel state. It NEVER WRITES kernel truth.

**Allowed:**
- Read projections via `core-reader.js` or `core-reader-cli.js`
- Read workspace files like `STATE.md`, `CLAIM-LEDGER.md` (for display, not mutation)
- Write to `.vibe-science-environment/` (our own workspace)
- Write normal workspace artifacts (notes, drafts, experiment logs)

**Forbidden:**
- Direct writes to kernel SQLite tables
- Direct mutation of `STATE.md` (it's a kernel projection, not our file)
- Marking claims promoted/killed/reviewed
- Marking citations verified
- Marking gates passed
- Setting session integrity or closure state
- Bypassing hook-controlled enforcement paths

**Short version:** No outer layer may self-legitimate scientific truth.

---

## The Core-Reader API

The kernel exposes a read-only projection layer. This is our ONLY structured interface.

### JavaScript API: `plugin/lib/core-reader.js`

```js
// Path relative to project root — adjust based on import context
import { createReader } from '../../plugin/lib/core-reader.js';

const reader = createReader(projectPath);
// reader.dbAvailable — boolean
// reader.error — string or null

// 8 projection functions (all return arrays or objects, never throw):
reader.getProjectOverview(options)      // where am I, what's pending
reader.listClaimHeads(options)          // latest lifecycle state per claim
reader.listUnresolvedClaims(options)    // claims kernel considers unresolved
reader.listGateChecks(options)          // recent gate history
reader.listLiteratureSearches(options)  // search history
reader.listObserverAlerts(options)      // unresolved and recent alerts
reader.listCitationChecks(options)      // citation verification state
reader.getStateSnapshot()              // kernel STATE.md content

reader.close()                         // release DB handle
```

When DB is unavailable, functions return empty arrays/objects (never throw).

### Capability Snapshot (outer-project wrapper)

The current kernel contract exposes `dbAvailable` and stable projection
functions. That is sufficient for a prototype, but not for a serious control
plane.

Phase 1 of the Vibe Research Environment therefore wraps the current reader into a
capability snapshot written by:

`environment/control/capabilities.js`

Minimum outer-project capability shape:

```json
{
  "kernel": {
    "dbAvailable": true,
    "projections": {
      "overview": true,
      "claimHeads": true,
      "unresolvedClaims": true,
      "citationChecks": true
    },
    "advanced": {
      "governanceProfileAtCreation": false,
      "claimSearch": false
    }
  }
}
```

Rules:
- documented projection functions default to `true` only when callable
- undocumented advanced features default to conservative `false`
- outer-project commands branch on the capability snapshot, not on guessed
  internals of the reader

If the kernel later exposes a native `reader.capabilities`, the wrapper may pass
it through. Until then, the wrapper remains outer-project-owned.

### CLI Bridge: `plugin/scripts/core-reader-cli.js`

For prompt-driven command shims that can't import JS modules:

```bash
node plugin/scripts/core-reader-cli.js overview --project .
node plugin/scripts/core-reader-cli.js claim-heads --project . --limit 20
node plugin/scripts/core-reader-cli.js unresolved-claims --project .
node plugin/scripts/core-reader-cli.js citation-checks --project . --claim-id C-003
```

**Stable envelope contract:**
```json
{
  "ok": true,
  "projection": "overview",
  "projectPath": "/path/to/project",
  "data": { ... }
}
```

Exit codes: 0 = success, 1 = runtime error, 2 = validation error.

The canonical operator query surface is NOT a kernel CLI concern. It is defined
by the outer-project control plane in [03A-control-plane-and-query-surface.md](./03A-control-plane-and-query-surface.md)
and composes these kernel projections with outer-project state.

---

## Degradation Rules

### Detection and Scope

Degradation is detected **per-command**, not per-session. Each flow command checks `reader.dbAvailable` independently. If a CLI bridge call fails mid-command, that command degrades but the next command may succeed.

### When the kernel is unavailable (DB missing, better-sqlite3 not installed, etc.):

1. `reader.dbAvailable` returns `false`
2. All projection functions return empty results (not errors)
3. `reader.error` contains the reason string
4. The Vibe Research Environment MUST degrade honestly:
   - Show "kernel DB unavailable — structured projections skipped" once per command
   - Do NOT try to infer kernel state from CLAIM-LEDGER.md prose
   - Do NOT fabricate unresolved-claims from markdown parsing
   - Fall back to workspace-first mode (read files, skip structured projections)

---

## What the Kernel Owns (Do Not Touch)

| Domain | Kernel table | What it tracks |
|--------|-------------|----------------|
| Sessions | `sessions` | lifecycle, integrity, narrative |
| Claims | `claim_events` | lifecycle transitions (CREATED → R2_REVIEWED → PROMOTED/KILLED/DISPUTED) |
| Reviews | `r2_reviews` | R2 verdicts, J0 scores, SFI results |
| Seeds | `serendipity_seeds` | salvaged discoveries from killed claims |
| Gates | `gate_checks` | pass/fail results per gate per session |
| Citations | `citation_checks` | verification status, resolver, retraction |
| Literature | `literature_searches` | search queries, sources, key papers |
| Alerts | `observer_alerts` | stale state, desync, drift warnings |
| Patterns | `research_patterns` | cross-session learned patterns |
| Spine | `spine_entries` | append-only action log |
| Benchmarks | `benchmark_runs` | eval results |

**Protected write paths (kernel-only):**
- `plugin/db/schema.sql`
- `plugin/lib/db.js`, `gate-engine.js`, `permission-engine.js`
- `plugin/scripts/` (all 7 hook scripts + support scripts)
- Claim/citation truth flows
- Integrity and stop semantics

---

## Safe Interaction Patterns

### Pattern 1: Read projection, display to researcher
```
flow-status → reader.getProjectOverview() → render markdown summary
```

### Pattern 2: Read projection, compute derived policy
```
flow-writing → reader.listClaimHeads() + reader.listUnresolvedClaims()
             + reader.listCitationChecks() → compute export-eligibility
```

### Pattern 2A: Read projections, publish canonical operator snapshot
```
flow-status/control-plane → reader.getProjectOverview() + reader.listClaimHeads()
                          + workspace flow state + session metrics
                          → publish .vibe-science-environment/control/session.json
```

Do not confuse:
- `reader.getStateSnapshot()` — kernel-authored projection of kernel session state
- `.vibe-science-environment/control/session.json` — outer-project control-plane merge for operator workflow state

### Pattern 3: Write to our own workspace
```
flow-experiment → write manifest to .vibe-science-environment/experiments/manifests/
```

### Pattern 4: Read kernel file for display (not mutation)
```
flow-status → Read .vibe-science/STATE.md → display first 30 lines
```

### Pattern 5: Degrade when kernel unavailable
```
flow-status → reader.dbAvailable === false → show "kernel DB unavailable"
            → fall back to reading workspace files only
```

---

## Governance-Sensitive Artifacts

Some workspace files are too close to kernel truth. These MUST NOT be written by outer project code without going through kernel-observed paths:

- `.vibe-science/CLAIM-LEDGER.md` — claim lifecycle truth
- `.vibe-science/STATE.md` — kernel-authored session projection
- Review artifacts that feed lifecycle ingestion
- Any file consumed by kernel hook enforcement

The outer project may STAGE or DRAFT around these files (e.g., prepare a claim summary from projections). It may NOT silently write through to them.

---

## Contract Versioning

The core-reader API is kernel-owned. When signatures or return shapes change:
1. The kernel updates `CORE-READER-INTERFACE-SPEC.md` with the change
2. Existing return shapes are NOT removed without a deprecation cycle (minimum 1 phase)
3. New fields may be ADDED to return objects without a breaking change
4. Removing or renaming existing fields is a BREAKING change requiring outer project update
5. The CLI bridge envelope (`{ok, projection, projectPath, data}`) is stable indefinitely

**Rule:** If the kernel needs to break the contract, it must: document the break, provide migration guidance, and give the outer project at least one phase to adapt.

---

## Full Reference

For complete function signatures, return shapes, and option types:
- See `blueprints/CORE-READER-INTERFACE-SPEC.md` (kernel-authoritative)
- See `blueprints/VIBE-SCIENCE-CORE-CONTRACT.md` (kernel-authoritative)
- See [03A-control-plane-and-query-surface.md](./03A-control-plane-and-query-surface.md) for the outer-project query layer built on top of this contract

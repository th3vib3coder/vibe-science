# Core Reader Interface Spec

**Status:** Implemented V1 runtime surface  
**Date:** 2026-03-28  
**Scope:** Define and document the read-only kernel interface used by the outer research environment

---

## Purpose

`core-reader.js` is the kernel-side read-only contract surface for the outer project.

It exists to solve one problem:

**the outer project must be able to consume kernel truth without coupling itself directly to raw table layout.**

This file defines:

- where `core-reader.js` lives
- what functions exist in Phase 1
- what each function accepts and returns
- what is explicitly out of scope

---

## Placement

`core-reader.js` is a **kernel-side module**.

Implemented location:

- `plugin/lib/core-reader.js`

Reason:

- the kernel owns the read contract
- the outer project consumes the contract
- exposing read models is kernel work, but it is **contract-surface work**, not truth-semantic work

---

## Claude Code Execution Bridge

The outer project does **not** run as a normal JavaScript application with imports and a call stack.

In this repo, flow entrypoints are Claude Code command files (`commands/*.md`) with frontmatter plus prompt instructions. They execute by telling Claude which tools to use (`Read`, `Write`, `Edit`, `Bash`, and so on).

That means:

- command files do **not** import `createReader()` directly
- the command layer needs a prompt-friendly bridge to the kernel reader
- inline `node -e "import(...)"` snippets are technically possible but architecturally ugly and should not become the contract

V1 decision:

- `plugin/lib/core-reader.js` remains the canonical JavaScript read contract
- a thin CLI wrapper exists at `plugin/scripts/core-reader-cli.js`
- Claude Code command shims invoke that wrapper through `Bash`, consume JSON on stdout, and continue the flow

Example command shape:

```bash
node plugin/scripts/core-reader-cli.js overview --project .
node plugin/scripts/core-reader-cli.js claim-heads --project . --limit 20
node plugin/scripts/core-reader-cli.js unresolved-claims --project .
```

Minimum CLI contract:

- subcommands mirror reader projections rather than inventing a second vocabulary:
  - `overview`
  - `claim-heads`
  - `unresolved-claims`
  - `gate-checks`
  - `literature-searches`
  - `observer-alerts`
  - `citation-checks`
- all subcommands accept `--project <path>`
- projection-specific flags such as `--limit`, `--claim-id`, or `--statuses` are allowed, but the top-level command shape stays uniform

Stdout contract:

```json
{
  "ok": true,
  "projection": "overview",
  "projectPath": "C:/example/project",
  "data": {}
}
```

Error envelope:

```json
{
  "ok": false,
  "projection": "overview",
  "projectPath": "C:/example/project",
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Unknown projection: overveiw"
  },
  "data": null
}
```

Rules:

- stdout should contain JSON only, so prompt-driven command shims can read it reliably
- stderr is for human diagnostics only
- normal "no data yet" conditions still return `ok: true` with an empty projection or degraded object shape
- programmer/configuration errors return a non-zero exit code **and** the JSON error envelope
- command shims should depend on this stable envelope, not on incidental formatting details

Expected wrapper behavior:

- parse command-line flags
- call `createReader(projectPath)`
- execute one reader projection
- print normalized JSON to stdout
- exit non-zero only for programmer/configuration errors, not for normal "no data yet" conditions

This is the execution bridge that makes a kernel-side JavaScript reader usable from prompt-driven Claude Code commands without coupling the outer project to raw schema or ad hoc shell one-liners.

---

## Design Rules

1. **Read-only only**
   No writes, no side effects, no state mutation.

2. **Projection-oriented**
   Expose stable read models, not raw table dumps.

3. **Minimal Phase 1 surface**
   Only ship what the Flow Engine MVP and project overview actually need.

4. **Canonical inputs**
   The public factory `createReader(projectPath)` accepts a raw workspace path and canonicalizes it using kernel rules.
   Lower-level helper signatures shown below assume that canonicalization has already happened.

5. **Predictable return behavior**
   - singular lookups return `null` when missing, unless the function explicitly defines a stable degraded object shape
   - collection lookups return `[]`
   - reader functions do not silently mutate, fallback-write, or heal state

6. **Plain JavaScript objects**
   Return normalized objects in camelCase, not raw SQLite row shape where avoidable.

---

## Bootstrap: `createReader`

The outer project must not import `openAndInit` from `db.js` or `canonicalizeProjectPath` from `path-utils.js` directly. That would couple the outer project to kernel internal module structure, defeating the purpose of this contract surface.

Instead, `core-reader.js` exports a factory function:

```js
export function createReader(projectPath)
```

Purpose:

- canonicalize the project path using kernel rules
- open (or reuse) the kernel DB for that project
- return an object with all reader methods bound to the correct `db` and `projectPath`

Returns:

```js
{
  projectPath,       // canonicalized
  dbAvailable,       // true when the kernel DB is readable; false when DB is missing or corrupt
  error,             // null when healthy; short diagnostic string when degraded
  getProjectOverview(options = {}),
  listClaimHeads(options = {}),
  listUnresolvedClaims(options = {}),
  listGateChecks(options = {}),
  listLiteratureSearches(options = {}),
  listObserverAlerts(options = {}),
  listCitationChecks(options = {}),
  getStateSnapshot(),
  close()            // explicit cleanup; required when the caller is done with this reader
}
```

Direct JavaScript callers inside kernel-owned scripts, tests, or the CLI bridge may call `createReader(process.cwd())` (or another workspace path) and use the returned object. Prompt-driven command shims do not call it directly; they go through `plugin/scripts/core-reader-cli.js`. In all cases, outer logic never touches `db.js` or `path-utils.js` directly.

`createReader` always returns a reader object, never `null`:

- when the DB is present: `dbAvailable = true`, all methods work normally
- when the DB is missing or corrupt: `dbAvailable = false`, DB-backed methods return empty projections or documented degraded objects, and `getStateSnapshot()` still works because it reads from the filesystem
- `close()` is part of the contract, not a courtesy: callers should invoke it when they are done with the reader
- `close()` should be idempotent: safe to call multiple times without throwing
- if the implementation later adds handle reuse or caching, that remains an internal kernel concern; the caller contract does not change

This avoids a brittle `null` bootstrap contract and lets the outer project degrade gracefully instead of branching around reader existence.

### Ownership rule

`createReader()` owns the lifecycle of the DB handle it opens or acquires on the caller's behalf.

- outer callers must not import or call `closeDB()` directly
- outer callers must call `reader.close()` when they are done
- if the kernel internally pools or reuses handles, `reader.close()` should release that lease/ref safely rather than exposing pooling semantics to callers

---

## Required V1 Reader Functions

The agreed V1 reader surface includes at least these functions. They may be implemented incrementally across the early outer-project phases, but these shapes are part of the contract now. In the signatures below, `db` and `projectPath` are shown for clarity but are already bound by `createReader` — outer callers use the bound methods.

### 1. `getProjectOverview`

```js
export function getProjectOverview(db, projectPath, options = {})
```

Purpose:

- power the "where am I, what's pending, what's blocked" overview

Inputs:

- `db`
- `projectPath`
- `options.recentGateLimit = 5`

Returns:

```js
{
  projectPath,
  lastSession: {
    id,
    startedAt,
    endedAt,
    integrityStatus,
    narrativeSummary,
    totalActions,
    claimsCreated,
    claimsKilled,
    gatesPassed,
    gatesFailed
  } | null,
  activeClaimCount,
  unresolvedAlertCount,
  pendingSeedCount,
  activePatternCount,
  recentGateFailures: [
    { sessionId, gateId, claimId, status, timestamp } // status is always `FAIL` in this projection
  ]
}
```

Degraded behavior:

- this function should still return an object when project data is unavailable
- degraded shape: `{ projectPath, lastSession: null, activeClaimCount: 0, unresolvedAlertCount: 0, pendingSeedCount: 0, activePatternCount: 0, recentGateFailures: [] }`
- callers should not have to branch on `null` just to render a basic project overview

Implementation mapping:

- `getLastSession`
- `getUnresolvedAlerts`
- `getActivePatterns`
- `loadPendingSeeds`
- new lightweight query for recent gate failures joined through `sessions`, filtered to `gate_checks.status = 'FAIL'`
- `activeClaimCount` should be derived from `listClaimHeads` current-status logic, not from raw event counts

### 2. `listClaimHeads`

```js
export function listClaimHeads(db, projectPath, options = {})
```

Purpose:

- provide the latest visible lifecycle state per claim for Flow Engine, project overview, and writing handoff

Inputs:

- `db`
- `projectPath`
- `options.limit = 100`
- `options.statuses = null` (filters derived `currentStatus`, not raw event types)

Returns:

```js
[
  {
    claimId,
    sessionId,
    currentStatus,
    statusSourceEventType,
    confidence,
    r2Verdict,
    killReason,
    gateId,
    narrative,
    timestamp, // timestamp of the state-bearing head row
    isActive
  }
]
```

Field definitions:

- `currentStatus` — the `new_status` value from the latest **state-bearing row** for this claim
- `statusSourceEventType` — the `event_type` stored on that same state-bearing row
- `timestamp` — timestamp of that same state-bearing head row
- `isActive` — `true` when `currentStatus` is NOT in `['KILLED', 'DISPUTED']`. Active claims are those that are still live in the research pipeline (including draft, under review, promoted, robust). Killed and disputed claims are explicitly inactive.
- `confidence`, `r2Verdict`, `killReason`, `gateId`, `narrative`, and `timestamp` come from that same head row
- these fields are **not** backfilled from older rows; if the head row does not carry one of them, the projection returns `null` for that field

State-bearing row rule:

- a claim-event row is state-bearing if and only if `new_status IS NOT NULL`
- rows with `new_status = NULL` are audit/context rows and must not determine the visible claim head
- the reader contract deliberately does **not** duplicate a hardcoded whitelist of event types from ingestion logic
- this keeps the read contract aligned with kernel truth even if event taxonomy evolves

Implementation note:

- this is **not** the full timeline
- it must represent the **current visible lifecycle state**, not a merged summary of every orthogonal kernel judgment
- derive the head from the latest project-scoped claim-event row where `new_status IS NOT NULL`
- use a deterministic tie-breaker such as `ORDER BY timestamp DESC, id DESC`
- `statusSourceEventType` remains useful for auditability, but it is descriptive metadata, not the rule that decides whether a row is lifecycle-bearing

### 3. `listUnresolvedClaims`

```js
export function listUnresolvedClaims(db, projectPath, options = {})
```

Purpose:

- expose which claims the kernel currently considers unresolved under stop-hook semantics
- preserve the kernel's current definition of "needs review" without making outer callers reimplement it

Inputs:

- `db`
- `projectPath`
- `options.limit = 100`

Returns:

```js
[
  {
    claimId,
    latestEventType,
    latestEventTimestamp
  }
]
```

Field definitions:

- `latestEventType` — the latest raw `claim_events.event_type` for this claim
- `latestEventTimestamp` — timestamp of that latest raw claim-event row

Kernel rule mirrored here:

- this projection intentionally mirrors the current `stop.js` rule
- a claim is unresolved when its latest raw event type is **not** in `['R2_REVIEWED', 'KILLED', 'DISPUTED']`
- this is a kernel judgment about review resolution, not a lifecycle-head derivation

Implementation mapping:

- use the same query shape as `stop.js`: latest raw row per `claim_id`, project-scoped through `sessions`, then filter by event type
- use the same deterministic tie-breaker as the hook: `ORDER BY ce.timestamp DESC, ce.id DESC`
- if the kernel later centralizes this rule, `listUnresolvedClaims` should wrap that shared helper instead of duplicating SQL

Default ordering:

- `latestEventTimestamp DESC, claimId ASC`

### 4. `listGateChecks`

```js
export function listGateChecks(db, projectPath, options = {})
```

Purpose:

- surface recent gate history for overview, debugging, and workflow diagnosis

Inputs:

- `db`
- `projectPath`
- `options.gateIds = null`
- `options.statuses = null` (null = no filter; pass `['FAIL']` or `['FAIL', 'WARN']` to filter)
- `options.limit = 50`

Returns:

```js
[
  {
    sessionId,
    gateId,
    claimId,
    status,
    checksPassed,
    checksWarned,
    checksFailed,
    details,
    timestamp
  }
]
```

Implementation mapping:

- new read query over `gate_checks JOIN sessions`

Default ordering:

- `timestamp DESC, id DESC`

### 5. `listLiteratureSearches`

```js
export function listLiteratureSearches(db, projectPath, options = {})
```

Purpose:

- support the literature flow with actual search history instead of note-taking guesses

Inputs:

- `db`
- `projectPath`
- `options.limit = 50`
- `options.searchLayers = null`
- `options.gateContext = null`

Returns:

```js
[
  {
    sessionId,
    query,
    sources,
    resultsCount,
    relevantCount,
    keyPapers,
    searchLayer,
    gateContext,
    timestamp
  }
]
```

Implementation note:

- `sources` and `keyPapers` should be parsed from stored JSON where valid

Default ordering:

- `timestamp DESC, id DESC`

### 6. `listObserverAlerts`

```js
export function listObserverAlerts(db, projectPath, options = {})
```

Purpose:

- expose unresolved and recent alerts as workflow blockers or hygiene warnings

Inputs:

- `db`
- `projectPath`
- `options.unresolvedOnly = true`
- `options.limit = 50`

Returns:

```js
[
  {
    id,
    level,
    message,
    resolved,
    resolvedAt,
    createdAt
  }
]
```

Implementation mapping:

- `observer_alerts` has its own `project_path` column — no JOIN through `sessions` needed (unlike `claim_events` or `gate_checks`)
- `getUnresolvedAlerts` in `db.js` already queries this table
- broader listing (including resolved alerts) needs a small additional read query

Default ordering:

- unresolved view: preserve the kernel helper behavior, `level DESC, created_at DESC, id DESC`
- broader mixed view: still keep severity first, then recency

### 7. `listCitationChecks`

```js
export function listCitationChecks(db, projectPath, options = {})
```

Purpose:

- expose citation verification state so the writing handoff knows which claims have verified vs unverified citations
- a claim that looks promotable on lifecycle status alone is not automatically safe to write about in Results when citations remain non-verified (`PENDING`, `UNRESOLVED`, `ERROR`, or `RETRACTED`)

Inputs:

- `db`
- `projectPath`
- `options.claimId = null` (filter to a specific claim)
- `options.verificationStatuses = null` (null = all; pass `['VERIFIED']` or `['PENDING', 'UNRESOLVED']` to filter)
- `options.limit = 100`

Returns:

```js
[
  {
    citationId,
    claimId,
    rawRef,
    citationType,       // DOI / PMID / ARXIV / URL / OTHER
    normalizedId,
    verificationStatus, // PENDING / VERIFIED / UNRESOLVED / RETRACTED / ERROR
    resolver,
    resolvedTitle,
    retractionStatus,   // RETRACTED / CLEAR / UNKNOWN / null
    checkedAt,
    createdAt
  }
]
```

Implementation mapping:

- `citation_checks` should always be project-scoped through `sessions` first
- `claim_id` is an optional narrowing filter inside that project scope, not a substitute for project scoping
- `getCitationChecks` in `db.js` already exists but uses a different filter shape — adapt or wrap

Default ordering:

- most recent verification activity first: `COALESCE(checked_at, created_at) DESC, id DESC`

Why this is Phase 1 required, not optional:

- `listClaimHeads` tells you the claim's lifecycle head
- `listUnresolvedClaims` tells you which claims the kernel still considers unresolved under stop semantics
- `listCitationChecks` supplies the per-citation verification facts the writing handoff must aggregate per claim
- without all three, the writing handoff cannot responsibly determine whether a claim is safe to export into Results

Important boundary:

- `listCitationChecks` does **not** itself compute a final safe/unsafe writing verdict for a claim
- it exposes the underlying citation-state facts so the writing handoff can aggregate them explicitly

### 8. `getStateSnapshot`

```js
export function getStateSnapshot(projectPath)
```

Note: this function does NOT take `db` — it reads from the filesystem (`STATE.md`), not from the database. This is intentional: `STATE.md` is a workspace projection, not a DB artifact.

Purpose:

- expose the latest kernel-authored `STATE.md` projection to the outer project without turning it into truth authority

Inputs:

- `projectPath`

Returns:

```js
{
  exists,           // true if STATE.md file exists, false otherwise
  path,             // resolved path to STATE.md
  updatedAt,        // file mtime as ISO string, null if file doesn't exist
  content           // file content as string, null if file doesn't exist
}
```

Always returns an object, never `null`. When the file doesn't exist: `{ exists: false, path: '...', updatedAt: null, content: null }`. This is consistent with the degraded-reader pattern — the caller checks `exists`, not truthiness of the return value.

Implementation mapping:

- `loadStateMdSnapshot` logic in `session-start.js` should be factored or reused

---

## Phase 1 Optional Extension Functions

These are useful, but not required to start Phase 1:

- `listPendingSeeds(db, projectPath, options = {})`
- `listPatterns(db, projectPath, options = {})`
- `getSessionSummary(db, sessionId)`
- `getHarnessHints(db, projectPath)`

They should not block the first Flow Engine MVP.

---

## Explicitly Out Of Scope For Phase 1

Do **not** include these in the first implementation round:

- raw SQL pass-through helpers
- direct table-export helpers
- write helpers of any kind
- prompt-log access
- calibration-log access
- benchmark history
- semantic memory search
- anything that resolves, promotes, kills, verifies, or mutates

The point of Phase 1 is to expose the minimum stable read contract, not to publish the whole database.

---

## Return-Shape Conventions

- **sort order**: each `list*` function defines its own default ordering using that projection's real recency field and any domain-specific secondary sort. Do not force a fake global `timestamp DESC` rule onto projections that use `created_at`, `checked_at`, severity-first ordering, or other legitimate shapes.
- timestamps are returned as stored ISO-like text strings
- JSON-bearing fields such as `sources`, `keyPapers`, and `details` should be parsed when safe
- malformed JSON should degrade gracefully to the original string or `null`
- no function may mutate stored data while normalizing output

---

## Error Behavior

`core-reader.js` should follow these rules:

- invalid arguments may throw programmer-facing errors
- missing project data should not throw; return empty projections or documented degraded objects instead
- reader failure must never degrade kernel truth
- outer callers remain responsible for handling unavailable projections gracefully

---

## Why This Is Enough For Phase 1

With `createReader` + the implemented CLI bridge + eight required functions, the outer project can:

- expose structured kernel facts to prompt-driven command shims without raw SQL or inline module-import hacks
- show a project overview (claims, alerts, gate failures, session history)
- power the literature flow (search history, gap surfacing)
- power the experiment flow (claims tied to gates and alerts, blocker identification)
- provide the facts needed for writing export-eligibility decisions (lifecycle head via `listClaimHeads`, unresolved-review set via `listUnresolvedClaims`, citation verification facts via `listCitationChecks`)
- expose the human-readable STATE.md snapshot

That is enough to start validating the Flow Engine MVP without overdesigning the contract.

---

## Current Consequence

This document no longer describes a planned interface only.

It now documents the implemented kernel read surface:

1. `plugin/lib/core-reader.js`
2. `plugin/scripts/core-reader-cli.js`
3. tests that validate both against the kernel data model

The next step after this document is not to redesign the reader again unless a real caller pressure appears. The right discipline now is:

1. keep the runtime and this spec aligned
2. add new projections only when a concrete flow or command shim truly needs them
3. reuse shared helpers (for example unresolved-claim logic) rather than duplicating SQL across scripts

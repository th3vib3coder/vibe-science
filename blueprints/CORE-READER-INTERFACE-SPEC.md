# Core Reader Interface Spec

**Status:** Phase 0 design decision  
**Date:** 2026-03-27  
**Scope:** Define the minimal read-only kernel interface required before the outer research environment starts implementation

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

Planned location:

- `plugin/lib/core-reader.js`

Reason:

- the kernel owns the read contract
- the outer project consumes the contract
- exposing read models is kernel work, but it is **contract-surface work**, not truth-semantic work

---

## Design Rules

1. **Read-only only**
   No writes, no side effects, no state mutation.

2. **Projection-oriented**
   Expose stable read models, not raw table dumps.

3. **Minimal Phase 1 surface**
   Only ship what the Flow Engine MVP and project overview actually need.

4. **Canonical inputs**
   `projectPath` must already be canonicalized according to kernel rules.

5. **Predictable return behavior**
   - singular lookups return `null` when missing
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
  getProjectOverview(options = {}),
  listClaimHeads(options = {}),
  listGateChecks(options = {}),
  listLiteratureSearches(options = {}),
  listObserverAlerts(options = {}),
  listCitationChecks(options = {}),
  getStateSnapshot(),
  close()            // releases the DB handle
}
```

The outer project calls `createReader(process.cwd())` once and uses the returned object. It never touches `db.js` or `path-utils.js` directly.

If the DB does not exist or cannot be opened, `createReader` returns `null` and the outer project degrades gracefully (shows "no kernel state available" instead of crashing).

---

## Phase 1 Required Functions

Phase 1 requires at least these functions. In the signatures below, `db` and `projectPath` are shown for clarity but are already bound by `createReader` — outer callers use the bound methods.

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
    { sessionId, gateId, claimId, status, timestamp }
  ]
}
```

Implementation mapping:

- `getLastSession`
- `getUnresolvedAlerts`
- `getActivePatterns`
- `loadPendingSeeds`
- new lightweight query for recent gate failures joined through `sessions`

### 2. `listClaimHeads`

```js
export function listClaimHeads(db, projectPath, options = {})
```

Purpose:

- provide the latest visible state per claim for Flow Engine, project overview, and writing handoff

Inputs:

- `db`
- `projectPath`
- `options.limit = 100`
- `options.statuses = null`

Returns:

```js
[
  {
    claimId,
    sessionId,
    latestEventType,
    oldStatus,
    newStatus,
    confidence,
    r2Verdict,
    killReason,
    gateId,
    narrative,
    timestamp
  }
]
```

Implementation note:

- this is **not** the full timeline
- it is the latest event per claim, scoped to the project through `sessions`

### 3. `listGateChecks`

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

### 4. `listLiteratureSearches`

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

### 5. `listObserverAlerts`

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

### 7. `getStateSnapshot`

```js
export function getStateSnapshot(projectPath)
```

Note: this function does NOT take `db` — it reads from the filesystem (`STATE.md`), not from the database. This is intentional: STATE.md is a workspace projection, not a DB artifact.

Purpose:

- expose the latest kernel-authored `STATE.md` projection to the outer project without turning it into truth authority

Inputs:

- `projectPath`

Returns:

```js
{
  exists,
  path,
  updatedAt,
  content
} | null
```

Implementation mapping:

- `loadStateMdSnapshot` logic in `session-start.js` should be factored or reused

---

### 6. `listCitationChecks`

```js
export function listCitationChecks(db, projectPath, options = {})
```

Purpose:

- expose citation verification state so the writing handoff knows which claims have verified vs unverified citations
- a PROMOTED claim with RETRACTED or UNVERIFIED citations is NOT safe to write about in Results — Story 4 requires this

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
    checkedAt
  }
]
```

Implementation mapping:

- `citation_checks` joins through `sessions` for project scoping, or can filter by `claim_id` directly (indexed: `idx_citations_claim`)
- `getCitationChecks` in `db.js` already exists but uses a different filter shape — adapt or wrap

Why this is Phase 1 required, not optional:

- `listClaimHeads` tells you a claim is PROMOTED
- `listCitationChecks` tells you its citations are actually VERIFIED
- without both, the writing handoff cannot answer "is this claim safe to write about?"

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

- timestamps are returned as stored ISO-like text strings
- JSON-bearing fields such as `sources`, `keyPapers`, and `details` should be parsed when safe
- malformed JSON should degrade gracefully to the original string or `null`
- no function may mutate stored data while normalizing output

---

## Error Behavior

`core-reader.js` should follow these rules:

- invalid arguments may throw programmer-facing errors
- missing project data should not throw; return empty projections instead
- reader failure must never degrade kernel truth
- outer callers remain responsible for handling unavailable projections gracefully

---

## Why This Is Enough For Phase 1

With `createReader` + seven required functions, the outer project can:

- bootstrap itself with a single call (`createReader(process.cwd())`) — no kernel internal imports needed
- show a project overview (claims, alerts, gate failures, session history)
- power the literature flow (search history, gap surfacing)
- power the experiment flow (claims tied to gates and alerts, blocker identification)
- answer "is this claim safe to write about?" (claim status via `listClaimHeads` + citation verification via `listCitationChecks`)
- expose the human-readable STATE.md snapshot

That is enough to start validating the Flow Engine MVP without overdesigning the contract.

---

## Phase 0 Consequence

This document closes the last open Phase 0 design gate:

- `core-reader.js` function signatures and return shapes are now explicit

The next step after this document is not more spec.

It is:

1. decide exact file placement under `plugin/lib/`
2. implement the first read-only functions
3. test them against the existing kernel DB


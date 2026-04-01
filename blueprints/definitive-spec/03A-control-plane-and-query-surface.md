# 03A — Control Plane and Query Surface

---

## Purpose

The Vibe Research Environment needs one explicit operational substrate between raw kernel projections and user-facing commands.

Without that substrate, every `/flow-*` command would compose status, retries, capabilities, and degraded-mode signals differently. That is acceptable for a prototype. It is not acceptable for an enterprise-grade system.

---

## What The Control Plane Owns

The control plane is outer-project-only. It never writes kernel truth.

It owns:
1. a canonical session snapshot for `/flow-status` and resume
2. an append-only attempt ledger for flow runs and experiment executions
3. an append-only telemetry stream for lifecycle and degraded-mode visibility
4. a capability snapshot combining kernel reachability and install surface
5. an append-only decision log for operator-visible workflow decisions
6. a stable query helper layer so commands do not scrape scattered files ad hoc

It does NOT own:
- claim truth
- citation truth
- gate truth
- R2 truth
- kernel governance state

---

## Why This Exists

The two framework audits raised the bar:
- **AgentScope** showed the value of typed working state, middleware, and checkpointable evaluation artifacts
- **Agent Lightning** showed the value of a real control plane: lifecycle, health, telemetry discipline, capabilities, and queryability

---

## Control State Layout

```
.vibe-science-environment/control/
├── session.json         — canonical operator snapshot
├── attempts.jsonl       — append-only attempt ledger
├── events.jsonl         — append-only telemetry events
├── decisions.jsonl      — append-only workflow decisions and overrides
├── capabilities.json    — current capability snapshot
└── locks/               — atomic write / single-writer guards
```

---

## Canonical Session Snapshot

`session.json` is the ONLY authoritative outer-project answer to:
"Where am I, what is blocked, and what should I do next?"

**Important:** This is NOT the kernel's `sessions` table. The kernel owns session lifecycle truth (start, end, integrity). `session.json` is an outer-project DERIVED snapshot that merges kernel projections + flow state + budget signals into one operator-facing view. The kernel's `sessions` table and this file serve different purposes and never conflict.

Suggested shape:

```json
{
  "schemaVersion": "vibe-env.session.v1",
  "activeFlow": "experiment",
  "currentStage": "result-packaging",
  "nextActions": [
    "review EXP-003 outputs",
    "run confounder harness on C-014"
  ],
  "blockers": [
    "EXP-004 missing negative control dataset"
  ],
  "kernel": {
    "dbAvailable": true,
    "degradedReason": null
  },
  "capabilities": {
    "claimHeads": true,
    "citationChecks": true,
    "governanceProfileAtCreation": false,
    "claimSearch": false
  },
  "budget": {
    "state": "ok",
    "toolCalls": 12,
    "estimatedCostUsd": 1.42,
    "countingMode": "provider"
  },
  "signals": {
    "staleMemory": false,
    "unresolvedClaims": 2,
    "blockedExperiments": 1,
    "exportAlerts": 0
  },
  "lastCommand": "/flow-experiment",
  "lastAttemptId": "ATT-2026-03-30-001",
  "updatedAt": "2026-03-30T09:15:00Z"
}
```

Signal sources:
- `unresolvedClaims` is read from `reader.listUnresolvedClaims()`
- `blockedExperiments` is counted from experiment manifests
- `exportAlerts` is counted from `writing/exports/export-alerts.jsonl`

Ownership rule:
- flows own `flows/index.json` as working state
- the control plane republishes the merged operator snapshot
- `/flow-status` reads `session.json`, not raw `flows/index.json`

`flows/index.json` remains useful, but it is flow-local working state, not the canonical operator snapshot.

---

## Attempt Ledger

Every meaningful flow invocation opens an attempt record. Experiment executions
reuse the same ledger with `scope = flow-experiment` and `targetId = EXP-NNN`.

Suggested shape:

```json
{
  "attemptId": "ATT-2026-03-30-001",
  "scope": "flow-experiment",
  "targetId": "EXP-003",
  "status": "running",
  "startedAt": "2026-03-30T09:10:00Z",
  "lastHeartbeatAt": "2026-03-30T09:14:00Z",
  "endedAt": null,
  "retryCount": 0,
  "errorCode": null,
  "summary": null
}
```

Allowed statuses:
- `preparing`
- `running`
- `succeeded`
- `failed`
- `blocked`
- `timeout`
- `unresponsive`
- `abandoned`

Heartbeat rule:
- no separate heartbeat daemon in V1
- opening or updating an attempt refreshes `lastHeartbeatAt`
- linked telemetry events also refresh it
- missing heartbeat past timeout marks the attempt `unresponsive`

---

## Telemetry And Decision Surfaces

`events.jsonl` captures outer-project observations:
- `attempt_opened`
- `attempt_updated`
- `session_snapshot_published`
- `degraded_mode_entered`
- `budget_stop_triggered`
- `operator_override`
- `export_started`
- `export_finished`

`decisions.jsonl` records workflow decisions that must not live only in chat:
- why a blocker was escalated
- why a budget stop was overridden
- why export was deferred
- why a flow was reset or handed off

Rules:
1. both files are append-only
2. both are observational, never truth-creating
3. both must reference `attemptId` when tied to an attempt
4. neither may store raw prompt transcripts or hidden reasoning

This is telemetry discipline, not “log everything.”

---

## Capabilities Snapshot

The outer project needs more than `reader.dbAvailable`.

`capabilities.json` records:
- which kernel projections are reachable
- which advanced compatibility fields exist
- which install bundles are present
- which degraded modes are active

Suggested shape:

```json
{
  "schemaVersion": "vibe-env.capabilities.v1",
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
  },
  "install": {
    "bundles": ["governance-core", "control-plane", "flow-experiment"]
  },
  "updatedAt": "2026-03-30T09:15:00Z"
}
```

Compatibility rule:
- unknown advanced features default conservatively to `false`
- commands branch on the snapshot, not on guessed reader internals

---

## Shared Middleware Chain

All `/flow-*`, export, and lifecycle commands run through one middleware chain:

1. refresh capability snapshot
2. open attempt
3. enforce degraded-mode and budget policy
4. execute command-specific logic
5. append telemetry events
6. publish session snapshot
7. close attempt

Implementation:
- `environment/control/middleware.js`
- `environment/control/decisions.js`
- `environment/control/query.js`
- `environment/control/events.js`

Markdown command shims do not reimplement this chain.

---

## Query Helper Layer

Commands should not manually scrape multiple files when a stable helper can
compose the answer once.

Helpers:
- `environment/control/session-snapshot.js`
- `environment/control/attempts.js`
- `environment/control/decisions.js`
- `environment/control/events.js`
- `environment/control/capabilities.js`
- `environment/control/query.js`

Minimum query functions:
- `getSessionSnapshot(projectPath)`
- `publishSessionSnapshot(projectPath, snapshot)`
- `getCapabilitiesSnapshot(projectPath)`
- `publishCapabilitiesSnapshot(projectPath, snapshot)`
- `openAttempt(projectPath, input)`
- `updateAttempt(projectPath, attemptId, patch)`
- `appendEvent(projectPath, event)`
- `appendDecision(projectPath, decision)`
- `listEvents(projectPath, { kind, attemptId, since, limit, offset })`
- `listDecisions(projectPath, { flow, targetId, limit, offset })`
- `listAttempts(projectPath, { status, flow, targetId, limit, offset })`

V1 rule:
- filter and pagination are required
- sort may default to `timestamp-desc`
- full-text search waits for stable kernel search capability

---

## Contracts And Atomicity

Machine-owned control files MUST validate against JSON schemas:
- `environment/schemas/session-snapshot.schema.json`
- `environment/schemas/capabilities-snapshot.schema.json`
- `environment/schemas/attempt-record.schema.json`
- `environment/schemas/event-record.schema.json`
- `environment/schemas/decision-record.schema.json`

Write rules:
1. `session.json` uses atomic write-then-rename
2. append-only files write under a lock in `control/locks/`
3. stale locks may be cleared only after timeout plus warning
4. partial writes fail closed, never silently truncate

This is enough for multi-agent work in one workspace without inventing a
distributed control plane.

---

## Invariants

1. `control/session.json` is the canonical outer-project operator snapshot
2. Attempts, events, and decisions are append-only
3. Capabilities default conservatively when unknown
4. Control-plane failure may degrade UX, never kernel truth
5. Flow-local state and operator snapshot are distinct surfaces with distinct owners
6. Shared middleware is mandatory for machine-owned lifecycle behavior
7. Machine-owned control files validate against schemas before publish

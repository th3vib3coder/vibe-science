# Wave 2 — Control Plane

**Goal:** Build the operational substrate that all Phase 1 commands share.

---

## Control-Plane Ownership Rule

This wave owns:
- attempt lifecycle
- telemetry append
- capability snapshot publication
- decision append
- canonical session snapshot publication
- stable query helpers
- shared middleware chain

Flow helpers do not reimplement these responsibilities.

---

## WP-08 — `environment/control/capabilities.js`

Functions:
- `getCapabilitiesSnapshot(projectPath)`
- `publishCapabilitiesSnapshot(projectPath, snapshot)`
- `refreshCapabilitiesSnapshot(projectPath, reader)`

Acceptance:
- unknown advanced features default to `false`
- persisted shape matches `capabilities-snapshot.schema.json`

---

## WP-09 — `environment/control/events.js`

Functions:
- `appendEvent(projectPath, event)`
- `listEvents(projectPath, filters)`

Acceptance:
- append-only JSONL
- filtering by `kind`, `attemptId`, `since`, `limit`, `offset`

---

## WP-10 — `environment/control/attempts.js`

Functions:
- `openAttempt(projectPath, input)`
- `updateAttempt(projectPath, attemptId, patch)`
- `listAttempts(projectPath, filters)`

Rules:
- lifecycle follows [03A-control-plane-and-query-surface.md](../03A-control-plane-and-query-surface.md)
- close is expressed as a final `updateAttempt(...)` with terminal status

Acceptance:
- heartbeat refresh works
- terminal statuses are append-only outcomes, not in-place mutation

---

## WP-11 — `environment/control/decisions.js`

Functions:
- `appendDecision(projectPath, decision)`
- `listDecisions(projectPath, filters)`

Acceptance:
- append-only JSONL
- every decision can be linked to flow, target, and attempt when applicable

---

## WP-12 — `environment/control/session-snapshot.js`

Functions:
- `publishSessionSnapshot(projectPath, snapshot)`
- `getSessionSnapshot(projectPath)`
- `rebuildSessionSnapshot(projectPath, inputs)`

Acceptance:
- writes `control/session.json` atomically
- treats `session.json` as a derived outer snapshot, never as kernel truth

---

## WP-13 — `environment/control/query.js`

Functions:
- `getOperatorStatus(projectPath)`
- `getAttemptHistory(projectPath, filters)`
- `listEvents(...)`
- `listAttempts(...)`
- `listDecisions(...)`

Acceptance:
- query layer composes state without scraping arbitrary files
- exported function names match [03A-control-plane-and-query-surface.md](../03A-control-plane-and-query-surface.md)

---

## WP-14 — `environment/control/middleware.js`

Function:
- `runWithMiddleware({ projectPath, commandName, reader, commandFn })`

Required chain:
1. refresh capability snapshot
2. open attempt
3. enforce degraded-mode and budget policy
4. execute `commandFn` with middleware context
5. append telemetry and decisions returned by the command layer
6. publish session snapshot
7. close attempt with honest final status

Acceptance:
- one attempt per invocation
- no duplicate attempt creation in flow helpers
- degraded mode is explicit and queryable after the fact

---

## Parallelism

- WP-08 through WP-13 can be split across 2-3 agents
- WP-14 starts only after the other control modules are stable

---

## Exit Condition

Wave 2 is complete when `/flow-status` can rely on one queryable substrate
instead of hand-composed file reads.

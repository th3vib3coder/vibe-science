# Wave 1 — Lib Helpers

**Goal:** Build the reusable helper layer that flows and control-plane code depend on.

---

## WP-04 — `environment/lib/flow-state.js`

Functions:
- `readFlowIndex(projectPath)`
- `writeFlowIndex(projectPath, data)`
- `readFlowState(projectPath, flowName)`
- `writeFlowState(projectPath, flowName, data)`
- bootstrap helpers for `flows/` and missing templates

Acceptance:
- validates before every write
- writes atomically
- only touches `.vibe-science-environment/flows/`

---

## WP-05 — `environment/lib/manifest.js`

Functions:
- `createManifest(projectPath, data)`
- `readManifest(projectPath, experimentId)`
- `updateManifest(projectPath, experimentId, patch)`
- `listManifests(projectPath, filters)`

Rules:
- enforce manifest status transitions from [06-experiment-ops.md](../06-experiment-ops.md)
- support claim-link warnings and blocker surfaces
- do NOT open or close attempts directly

Acceptance:
- manifest writes validate against schema
- completed manifests are immutable
- dead-claim linkage produces warning state, not silent mutation

---

## WP-06 — `environment/lib/token-counter.js`

Functions:
- `countTokens(text, options)`

Rules:
- provider-aware when SDK support exists
- honest fallback mode when provider counting unavailable
- never throws during fallback

Acceptance:
- returns `{ count, mode }`
- fallback mode is explicit

---

## WP-07 — `environment/lib/session-metrics.js`

Functions:
- `createMetricsAccumulator()`
- `record(event)`
- `snapshot()`
- `flush(projectPath)`

Rules:
- append-only writes to `.vibe-science-environment/metrics/costs.jsonl`
- schema-validated before append
- intended to be called by middleware, not by flow helpers directly

Acceptance:
- metrics flush is append-only
- counting mode and estimated cost are persisted honestly

---

## Explicitly Deferred

Do NOT implement in this wave:
- `environment/lib/export-eligibility.js`

That helper belongs to Phase 3 and should not be backported into Phase 1.

---

## Parallelism

- WP-04 and WP-05 can run in parallel
- WP-06 and WP-07 can run in parallel
- all four can share schema fixtures from Wave 0

---

## Exit Condition

Wave 1 is complete when the four helpers above exist, pass their own unit tests,
and no helper owns control-plane lifecycle behavior.

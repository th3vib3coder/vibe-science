# Wave 3 — Flows And Shims

**Goal:** Build the first two flow helpers and connect the preview shims to real code.

---

## Flow Ownership Rule

Flow helpers own:
- domain-specific validation
- flow-local state updates
- manifest creation and update
- domain warnings and decision candidates

Flow helpers do NOT own:
- attempt open/update/close
- telemetry append
- capability snapshot refresh
- session snapshot publish

Those belong to middleware and the control plane.

---

## WP-15 — `environment/flows/literature.js`

Functions:
- `registerPaper(projectPath, paperData)`
- `listPapers(projectPath, filters)`
- `surfaceGaps(projectPath)`
- `linkPaperToClaim(projectPath, paperId, claimId)`

Dependencies:
- `environment/lib/flow-state.js`
- core-reader CLI for claim heads and literature search projections

Acceptance:
- updates literature flow state only
- claim links are explicit in flow-local state
- no direct control-plane lifecycle writes

---

## WP-16 — `environment/flows/experiment.js`

Functions:
- `registerExperiment(projectPath, data)`
- `updateExperiment(projectPath, experimentId, patch)`
- `listExperiments(projectPath, filters)`
- `surfaceBlockers(projectPath)`

Dependencies:
- `environment/lib/manifest.js`
- `environment/lib/flow-state.js`
- core-reader CLI for claim heads and gate checks

Rules:
- experiment helper may store `latestAttemptId` or heartbeat references in domain state
- it does not open or close attempts itself

Acceptance:
- creates schema-valid manifests
- lists blocked experiments with explicit reasons
- does not duplicate middleware lifecycle behavior

---

## WP-17 — Command Shim Upgrade

Upgrade:
- `commands/flow-status.md`
- `commands/flow-literature.md`
- `commands/flow-experiment.md`

Required behavior:
- detect CLI bridge availability
- load only allowed state surfaces
- invoke `runWithMiddleware(...)`
- call the appropriate helper
- degrade honestly when the kernel is unavailable

Acceptance:
- `/flow-status` reads the canonical session snapshot
- `/flow-literature` can register a paper and link a claim
- `/flow-experiment` can create and list manifests

---

## Parallelism

- WP-15 and WP-16 can run in parallel
- WP-17 starts after both helpers and middleware are stable

---

## Exit Condition

Wave 3 is complete when the three preview shims become thin entrypoints over
real modules instead of prompt-only previews.

# VRE Phase 1 — Implementation Plan Index

**Date:** 2026-03-30
**Scope:** Phase 1 exit gates from [13-delivery-roadmap.md](../13-delivery-roadmap.md)

---

## What Already Exists

| Artifact | Status | Path |
|----------|--------|------|
| core-reader.js (8 projections) | DONE | `plugin/lib/core-reader.js` |
| CLI bridge | DONE | `plugin/scripts/core-reader-cli.js` |
| Core reader tests | DONE | `tests/core-reader.test.mjs` |
| flow-index template | DONE | `environment/templates/flow-index.v1.json` |
| literature-flow-state template | DONE | `environment/templates/literature-flow-state.v1.json` |
| experiment-flow-state template | DONE | `environment/templates/experiment-flow-state.v1.json` |
| experiment-manifest template | DONE | `environment/templates/experiment-manifest.v1.json` |
| `/flow-status` shim | PREVIEW | `commands/flow-status.md` |
| `/flow-literature` shim | PREVIEW | `commands/flow-literature.md` |
| `/flow-experiment` shim | PREVIEW | `commands/flow-experiment.md` |

---

## Phase 1 Build Target

We are building:
- 12 active Phase 1 schemas
- 2 missing templates
- 4 bundle manifests
- 4 Phase 1 lib helpers
- 7 control-plane modules
- 2 flow helpers
- Phase 1 tests, CI validators, eval definitions, and saved run artifacts

We are NOT building in Phase 1:
- `memory-sync`
- `flow-results`
- `flow-writing`
- `environment/lib/export-eligibility.js`
- export snapshot or export alert runtime/test surfaces

---

## Wave Map

| Wave | Goal | Plan file |
|------|------|-----------|
| 0 | Contracts, templates, scaffold | [01-wave-0-foundation.md](./01-wave-0-foundation.md) |
| 1 | Reusable lib helpers | [02-wave-1-lib-helpers.md](./02-wave-1-lib-helpers.md) |
| 2 | Control plane substrate | [03-wave-2-control-plane.md](./03-wave-2-control-plane.md) |
| 3 | Flow helpers and shims | [04-wave-3-flows-and-shims.md](./04-wave-3-flows-and-shims.md) |
| 4 | Tests and validators | [05-wave-4-tests-and-validators.md](./05-wave-4-tests-and-validators.md) |
| 5 | Eval evidence and closeout | [06-wave-5-evals-and-closeout.md](./06-wave-5-evals-and-closeout.md) |

---

## Cross-Wave Rules

1. Wave order is mandatory.
2. Parallelize only inside a wave.
3. Every machine-owned write validates against schema first.
4. Middleware owns attempt open/update/close, telemetry append, and session snapshot publish.
5. Flow helpers may return domain results, warnings, and decision candidates, but they do not own attempt lifecycle.
6. Phase 1 closes only when benchmark runs and closeout evidence exist on disk.

---

## Agent Strategy

Recommended staffing:
- Wave 0: 1-2 agents
- Wave 1: 2 agents
- Wave 2: 2-3 agents
- Wave 3: 2 agents
- Wave 4: 2-3 agents
- Wave 5: 1-2 agents

Best split:
- one agent for contracts/schemas
- one for helpers
- one for control plane
- one for flows/shims
- one for tests/validators

---

## Final Gate

Before Phase 1 is called done, all items in
[06-wave-5-evals-and-closeout.md](./06-wave-5-evals-and-closeout.md) must be
closed with saved artifacts, not just passing tests.

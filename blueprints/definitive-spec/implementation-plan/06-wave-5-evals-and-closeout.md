# Wave 5 — Evals And Closeout

**Goal:** Close Phase 1 with saved evidence, not confidence.

---

## WP-22 — Eval Harness Definitions

Create benchmark definitions under `environment/evals/`:

Tasks:
- `flow-status-resume.json`
- `flow-literature-register.json`
- `flow-experiment-register.json`
- `degraded-kernel-mode.json`

Metrics:
- `resume-latency.js`
- `honesty-under-degradation.js`
- `state-write-scope.js`

Benchmark:
- `phase1-core.benchmark.json`

Acceptance:
- definitions match [14A-evaluation-harness.md](../14A-evaluation-harness.md)
- no Phase 2 or Phase 3 tasks are mixed into the Phase 1 benchmark

---

## WP-23 — Saved Run Artifacts

Produce at least one saved repeat for each Phase 1 task under:

`.vibe-science-environment/operator-validation/benchmarks/<taskId>/<repeatId>/`

Minimum files per repeat:
- `input.json`
- `output.json`
- `metrics.json`
- `transcript.md`
- `summary.json`

Acceptance:
- all four Phase 1 tasks have at least one saved repeat
- degraded-kernel-mode shows honest messaging and zero fabricated kernel state
- flow-status-resume demonstrates resume in <=2 minutes

---

## WP-24 — Phase 1 Closeout Dossier

Create one repo-side closeout document:

`blueprints/definitive-spec/implementation-plan/phase1-closeout.md`

It must include:
- links to the saved benchmark repeats from WP-23
- measured baseline context cost for one normal flow invocation
- kernel governance prerequisite verification results against the compatibility checklist
- a short list of deferred Phase 2 and Phase 3 items that were intentionally not built

Rules:
- this dossier summarizes measured outputs; it does not replace them
- no exit gate is marked complete unless the underlying artifact exists

---

## Exit Gate Mapping

This wave closes the remaining roadmap gates:
- saved operator-validation artifact
- Phase 1 scenarios with saved run artifacts
- baseline context cost measured
- kernel governance prerequisites verified

Reference:
- [13-delivery-roadmap.md](../13-delivery-roadmap.md)
- [14A-evaluation-harness.md](../14A-evaluation-harness.md)

---

## Exit Condition

Wave 5 is complete when Phase 1 can be defended with files on disk, not with a
conversation summary.

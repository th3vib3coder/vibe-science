# 14A — Evaluation Harness

---

## Purpose

Tests answer: "does it break?"

Evals answer: "does it behave well enough for operators to trust it?"

This document defines the benchmark and operator-validation substrate for the
Vibe Research Environment.

---

## Why Separate This From Tests

The new framework audits made a useful distinction explicit:
- **tests** verify correctness of code and contracts
- **evals** verify behavioral quality of flows, prompts, and resume surfaces

Blending them into one giant testing document makes both weaker.

---

## Core Model

The harness uses three concepts:

| Layer | Purpose | Stored in repo? |
|------|---------|-----------------|
| `Task` | One scenario with fixed setup and success criteria | Yes |
| `Metric` | One scoring function over an outcome | Yes |
| `Benchmark` | A named collection of tasks + metrics for a phase or feature | Yes |

Run artifacts are stored per task and repeat, not as one giant transcript blob.

---

## Definition Layout

Benchmark definitions live in the repo:

```
environment/evals/
├── tasks/
│   ├── flow-status-resume.json
│   ├── flow-literature-register.json
│   └── flow-experiment-register.json
├── metrics/
│   ├── resume-latency.js
│   ├── honesty-under-degradation.js
│   └── state-write-scope.js
└── benchmarks/
    ├── phase1-core.benchmark.json
    └── phase2-memory.benchmark.json
```

Run artifacts live in workspace state:

```
.vibe-science-environment/operator-validation/benchmarks/
└── <taskId>/
    └── <repeatId>/
        ├── input.json
        ├── output.json
        ├── metrics.json
        ├── transcript.md
        └── summary.json
```

This keeps definitions versioned in the repo and results project-local.

Ownership:
- benchmark definitions under `environment/evals/` belong to `governance-core`
- run artifacts under `.vibe-science-environment/operator-validation/` are workspace state owned by the evaluation harness surface, not by the control plane

---

## Run Artifact Contract

Each repeat stores a checkpointable result, not just a pass/fail bit.

Minimum `summary.json` shape:

```json
{
  "taskId": "flow-status-resume",
  "repeatId": "2026-03-30-01",
  "benchmarkId": "phase1-core",
  "startedAt": "2026-03-30T10:00:00Z",
  "endedAt": "2026-03-30T10:02:10Z",
  "passed": true,
  "metrics": {
    "resumeLatencySeconds": 78,
    "honestyUnderDegradation": 1.0,
    "kernelWriteScopeViolations": 0
  }
}
```

Rules:
- one directory per `taskId/repeatId`
- transcripts are saved, not merely summarized
- metric outputs are structured JSON, not prose-only
- reruns never overwrite prior repeats

---

## Minimum Phase 1 Benchmarks

Before Phase 1 exit, the harness must cover:

1. `flow-status-resume`
   - operator resumes in <=2 minutes
   - canonical session snapshot is used
2. `flow-literature-register`
   - paper registration updates flow state correctly
   - no kernel-write violations
3. `flow-experiment-register`
   - manifest created and validated
   - attempt opened and closed
4. `degraded-kernel-mode`
   - honest unavailable messaging
   - no fabricated unresolved claims or export-safe findings

---

## Metrics

Metrics should stay concrete and low-drama.

Useful metrics now:
- `resumeLatencySeconds`
- `stateWriteScopeViolations`
- `degradedHonestyScore`
- `attemptLifecycleCompleteness`
- `snapshotPublishSuccess`

Metrics we deliberately defer:
- autonomous “research quality” scores
- subjective manuscript quality scores
- reward hacking through one scalar “agent score”

---

## Operator Validation

Operator validation is an eval artifact, not a feeling.

Each saved run should record:
- scenario name
- command invoked
- starting state
- expected result
- actual result
- transcript path
- elapsed time
- pass/fail

This is the human-in-the-loop complement to automated tests.

---

## Checkpointing And Drift

The harness must be checkpoint-friendly.

That means:
- partial benchmark runs are still saved
- new metric versions do not overwrite older results
- task definitions are versioned in git
- repeated runs can be compared over time for drift

This is the smallest useful enterprise eval substrate.

---

## Invariants

1. Tests and evals are separate concerns with separate artifacts
2. Benchmark definitions live in repo; run artifacts live in workspace state
3. Results are checkpointed per `taskId/repeatId`
4. Transcripts are saved for review, not replaced by a final score
5. Phase exits require benchmark evidence, not only prompt confidence

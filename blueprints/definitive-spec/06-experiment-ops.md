# 06 — Experiment Operations

---

## Purpose

Plan, register, track, compare, and package experiments with explicit manifests,
attempt-aware execution history, and reproducibility metadata. Every experiment
has a manifest. Every meaningful run creates an attempt record in the control
plane. Every result has a bundle. Nothing lives only in chat.

---

## Experiment Manifest

Every experiment gets a JSON manifest. This is the outer project's experiment truth (not kernel truth — claims go through the kernel pipeline separately).

This contract MUST be runtime-validated through:
- `environment/schemas/experiment-manifest.schema.json`
- `environment/lib/manifest.js`

Do not accept free-form manifest JSON.

### Schema

```json
{
  "schemaVersion": "vibe.experiment.manifest.v1",
  "experimentId": "EXP-003",
  "title": "Batch correction ablation",
  "objective": "Measure whether removing batch correction changes sign of claim C-014",
  "status": "planned",
  "createdAt": "2026-03-28T09:45:00Z",
  "completedAt": null,
  "executionPolicy": {
    "timeoutSeconds": 3600,
    "unresponsiveSeconds": 300,
    "maxAttempts": 2
  },
  "latestAttemptId": null,
  "parameters": {
    "batchCorrection": false,
    "seed": 17,
    "nPermutations": 1000
  },
  "codeRef": {
    "entrypoint": "scripts/run_ablation.py",
    "gitCommit": "abc1234"
  },
  "inputArtifacts": [
    "data/processed/matrix.h5ad"
  ],
  "outputArtifacts": [],
  "relatedClaims": ["C-014"],
  "blockers": [],
  "notes": ""
}
```

### Required Fields

| Field | Required | Purpose |
|-------|----------|---------|
| experimentId | YES | Unique ID (EXP-NNN format) |
| title | YES | Human-readable name |
| objective | YES | What question this experiment answers |
| status | YES | planned, active, completed, failed, blocked, obsolete |
| executionPolicy | YES | Timeout, heartbeat, and retry rules |
| parameters | YES | Reproducibility: every parameter recorded |
| codeRef | YES | Which code, which commit |
| relatedClaims | YES | Which claims this experiment tests |

### Storage

- Manifests: `.vibe-science-environment/experiments/manifests/EXP-003.json`
- Index: `.vibe-science-environment/flows/experiment.json` (summary list)
- Attempt ledger: `.vibe-science-environment/control/attempts.jsonl`
- Template: `environment/templates/experiment-manifest.v1.json`

---

## Status Transitions

```
planned → active → completed
                → failed
                → blocked
                → obsolete
blocked → active
```

Manifest status is coarse experiment state, not per-run state.

### Execution Attempts

Manifest status is the experiment summary, not the execution lifecycle.

Every actual run is tracked separately in the control plane attempt ledger:

`.vibe-science-environment/control/attempts.jsonl`

Rules:
- moving an experiment to `active` MUST open an attempt
- retries increment `retryCount` on a new or updated attempt record
- each status update refreshes `lastHeartbeatAt`
- `timeout` and `unresponsive` are attempt outcomes, not manifest statuses

This keeps the manifest readable while still giving us enterprise-grade retry
and health tracking.

Attempt records themselves validate against:
- `environment/schemas/attempt-record.schema.json`
- `environment/control/attempts.js`

---

## Result Bundles (Phase 2-3)

When an experiment completes, its outputs are bundled:

```
.vibe-science-environment/results/experiments/EXP-003/
├── analysis-report.md
├── stats-appendix.md
├── figure-catalog.md
├── figures/
│   ├── fig-01-volcano.png
│   └── fig-02-comparison.png
└── bundle-manifest.json
```

### Bundle Manifest

```json
{
  "experimentId": "EXP-003",
  "bundledAt": "2026-03-29T14:00:00Z",
  "sourceAttemptId": "ATT-2026-03-29-004",
  "artifacts": [
    {"path": "analysis-report.md", "type": "report", "size": 4200},
    {"path": "figures/fig-01-volcano.png", "type": "figure", "size": 145000}
  ],
  "relatedClaims": ["C-014"],
  "datasetHash": "sha256:a1b2c3d4..."
}
```

### Output Artifact Contract

V1 may bootstrap with `outputArtifacts` as simple path strings inside the
experiment manifest.

Before any artifact is consumed by Results Flow, Writing Flow, or advisor-pack
generation, it MUST be normalized into structured entries in
`bundle-manifest.json`:

```json
{
  "path": "figures/fig-01-volcano.png",
  "type": "figure",
  "role": "main-result",
  "createdAt": "2026-03-29T13:58:00Z"
}
```

Required normalized fields:
- `path`
- `type` (`report`, `figure`, `table`, `dataset`, `notebook`, `other`)
- `role` (why this artifact exists in the bundle)
- `createdAt`

This prevents artifact-backed writing from depending on raw path strings with no
semantic meaning.

### Quality Bar (from claude-scholar audit)

- **Never fabricate statistics.** If data is missing, say so.
- **Report complete statistics.** Mean, std, CI, effect size, test used.
- **Interpret every main figure.** Purpose, what to notice, what it changes.
- **Lock comparison questions BEFORE running statistics.** Don't fish.
- **Separate evidence from prose.** This is analysis, not a manuscript.

---

## Reproducibility Metadata

Every experiment manifest captures what's needed to reproduce:

| Metadata | Where |
|----------|-------|
| Random seed | `parameters.seed` |
| Code version | `codeRef.gitCommit` |
| Entry point | `codeRef.entrypoint` |
| Input data | `inputArtifacts` (paths) |
| Producing attempt | `bundleManifest.sourceAttemptId` |
| Dataset hash | `bundleManifest.datasetHash` (SHA-256) |
| Parameters | `parameters` (all of them) |

**Environment recording** (in analysis-report.md header):
```markdown
## Environment
- Python: 3.11.8
- Key packages: scanpy 1.10.1, anndata 0.10.5, scipy 1.12.0
- GPU: none (CPU-only analysis)
```

---

## Blocker Tracking

Experiments can be blocked. Blockers are explicit in the manifest:

```json
"blockers": [
  "Missing negative control dataset — need to download from GEO GSE12345"
]
```

The `/flow-experiment --blockers` command surfaces all blocked experiments. If a blocker is stale (>7 days), flow-status flags it as urgent.

---

## Claim Linkage

Every experiment declares which claims it relates to (`relatedClaims`). This enables:
- Flow-status showing "claim C-014 has 2 experiments, 1 completed, 1 blocked"
- Writing handoff linking exported claims to their experimental evidence
- R2 review seeing which experiments support a given claim

**Validation:** When registering, the flow checks via CLI bridge that related claims exist. If a claim doesn't exist, warn (don't block — the experiment might create the claim later).

**Claim lifecycle change:** If a linked claim is later KILLED or DISPUTED, the experiment manifest is NOT automatically modified (manifests are immutable after completion). Instead:
- `/flow-experiment` lists the experiment with a WARNING: "linked claim C-014 is now KILLED"
- `/flow-status` surfaces this as a blocker: "EXP-003 linked to dead claim C-014"
- The researcher decides: create new experiment targeting a different claim, or close this one as obsolete

---

## Commands

| Command | What it does |
|---------|-------------|
| `/flow-experiment` | List all experiments with status |
| `/flow-experiment --register` | Create new manifest interactively |
| `/flow-experiment --update` | Update status, add outputs, resolve blockers |
| `/flow-experiment --blockers` | Show blocked experiments with reasons |
| `/flow-experiment --attempts` | Show attempt history, retries, timeouts, unresponsive runs |

---

## Invariants

1. Every experiment has a manifest file — no experiments live only in chat
2. Manifests are immutable once status reaches `completed` — create new experiment to retry
3. Parameters and code versions are recorded for reproducibility
4. Result bundles separate evidence from prose
5. Comparison questions locked before statistics (prevents fishing)
6. Outer project owns manifests — kernel owns claim truth from those experiments
7. Execution attempts are tracked separately from manifest summary state

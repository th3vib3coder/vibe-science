# Analysis Orchestrator

Pillar 3 of Vibe Science v3.5 — TERTIUM DATUR. Generates executable artifacts: scripts, commands, run plans, success/failure criteria. Every analysis produces standard outputs.

## Core Rule: Executable Over Descriptive

If a step can be a script, it MUST be a script. If a step can be a command, it MUST be a command. Prose descriptions of what to do are insufficient — produce the artifact that does it.

| Bad (descriptive) | Good (executable) |
|---|---|
| "Run QC on the data" | `scripts/01_qc.py` with exact parameters |
| "Check for batch effects" | `scripts/02_batch_check.py` producing `figures/batch_umap.png` |
| "The model converged" | `training_log.csv` with ELBO values + `figures/convergence.png` |

## Artifact Contract

Every computational run MUST produce these files. If any are missing, the run is **invalid** and Gate 5 fails.

```
run-YYYYMMDD-HHMMSS/
├── manifest.json          # REQUIRED — see schema below
├── report.md              # REQUIRED — standard report template
├── figures/               # REQUIRED — all generated figures
│   ├── [descriptive-name].png
│   └── ...
├── metrics.json           # REQUIRED — all computed metrics
├── output.h5ad            # CONDITIONAL — if scRNA/omics pipeline
├── model/                 # CONDITIONAL — if model trained (scVI, etc.)
│   ├── model.pt
│   └── model_params.json
├── scripts/               # REQUIRED — all scripts used (or symlinks)
│   ├── 01_qc.py
│   ├── 02_preprocess.py
│   └── ...
└── logs/                  # REQUIRED — execution logs
    ├── stdout.log
    └── stderr.log
```

### manifest.json Schema

```json
{
  "run_id": "run-20250207-143022",
  "created": "2025-02-07T14:30:22Z",
  "rq": "RQ-001",
  "description": "scVI batch correction, n_latent=30, n_HVG=3000",
  "parameters": {
    "n_latent": 30,
    "n_hidden": 128,
    "n_layers": 2,
    "n_epochs": 400,
    "batch_key": "study_id",
    "categorical_covariates": ["platform", "sex"],
    "continuous_covariates": ["pct_mito"],
    "n_hvg": 3000,
    "hvg_flavor": "seurat_v3",
    "min_genes": 200,
    "min_cells": 3,
    "max_pct_mito": 20
  },
  "seeds": [42, 123],
  "versions": {
    "python": "3.11.7",
    "scanpy": "1.10.0",
    "scvi-tools": "1.1.2",
    "anndata": "0.10.3",
    "torch": "2.1.2"
  },
  "input": {
    "files": ["merged_raw.h5ad"],
    "sha256": ["abc123..."],
    "n_cells": 145230,
    "n_genes": 33694,
    "n_studies": 12
  },
  "output": {
    "files": ["output.h5ad", "model/model.pt"],
    "sha256": ["def456...", "ghi789..."],
    "n_cells_post_qc": 132847,
    "n_hvg": 3000
  },
  "gates_passed": ["G0", "G1", "G2", "G3", "G4", "G5"],
  "decision": "ACCEPTED — iLISI improved 0.61→0.89, cLISI stable at 0.92",
  "previous_run": "run-20250206-091500",
  "comparison_summary": "Improved mixing (+46%) without losing cell-type separation (-0.3%)"
}
```

### report.md Standard Template

```markdown
# Run Report: [run_id]

## Summary
[2-3 sentences: what was done, what was found, what was decided]

## Parameters
[Table of key parameters — copy from manifest.json]

## Gate Results
| Gate | Status | Notes |
|------|--------|-------|
| G0 — Input Sanity | ✅ PASS | raw counts verified, integer dtype |
| G1 — Schema | ✅ PASS | obs schema normalized |
| G2 — Design | ✅ PASS | batch_key=study_id justified by PCA |
| G3 — Training | ✅ PASS | converged at epoch 280, no overfit |
| G4 — Metrics | ✅ PASS | see table below |
| G5 — Artifacts | ✅ PASS | all files present |

## Metrics

| Metric | Run A (prev) | Run B (this) | Δ | Decision |
|--------|-------------|-------------|---|----------|
| iLISI (batch mixing) | 0.61 | 0.89 | +0.28 | ✅ improved |
| cLISI (cell type) | 0.93 | 0.92 | -0.01 | ✅ stable |
| Silhouette (cell type) | 0.45 | 0.47 | +0.02 | ✅ improved |
| ARI (clustering) | 0.72 | 0.74 | +0.02 | ✅ improved |
| kBET acceptance | 0.23 | 0.78 | +0.55 | ✅ improved |
| Batch classifier acc | 0.89 | 0.52 | -0.37 | ✅ (closer to chance=0.5) |

## Figures
- `figures/umap_batch.png` — UMAP colored by batch
- `figures/umap_celltype.png` — UMAP colored by cell type
- `figures/convergence.png` — ELBO training curve
- `figures/metrics_comparison.png` — Bar chart Run A vs Run B

## Decision
**ACCEPTED.** Batch mixing improved substantially (+46% iLISI) without degrading cell-type separation (cLISI stable, silhouette improved). kBET acceptance rate tripled. Batch classifier accuracy dropped to near-chance, confirming batch information removed from latent space.

## Assumptions Active
- A-001: Platform effects treatable as batch effects
- A-002: Raw counts verified integer

## Open Issues
- [ ] Need ablation: n_HVG=2000 vs 3000 vs 5000
- [ ] Need ablation: n_latent=10 vs 30 vs 50
```

## Run Plan Template

Before any computational run, produce a run plan:

```markdown
# Run Plan: [description]

## Objective
[What question does this run answer?]

## Success Criteria
- [ ] [Specific metric threshold or comparison]
- [ ] [Specific artifact to produce]
- [ ] [Specific gate to pass]

## Failure Criteria (stop-the-line)
- [ ] [What would make this run invalid]
- [ ] [What error would require restart vs patch]

## Steps
1. [Script/command 1] → produces [output 1]
2. [Script/command 2] → consumes [output 1], produces [output 2]
3. ...

## Dependencies
- Input files: [list with expected checksums]
- Required packages: [list with versions]
- Scientific tools needed: [list]

## Estimated Resources
- Time: [estimate]
- Memory: [estimate]
- Storage: [estimate]
```

## Ablation Runner

When hyperparameters are chosen, produce an ablation matrix:

```markdown
# Ablation Matrix for [run_id]

## Variables to Test

| Variable | Values | Baseline | Rationale |
|----------|--------|----------|-----------|
| n_HVG | [2000, 3000, 5000] | 3000 | Standard range; 2000 may miss rare genes, 5000 may add noise |
| n_latent | [10, 20, 30, 50] | 30 | scVI default=10, but complex multi-study data may need more |
| batch_key | [study_id, platform, donor_id] | study_id | Need to justify which level of batch is primary |
| categorical_covariates | [none, platform, sex, both] | [platform, sex] | Ablate to see if covariates help or overfit |

## Execution Plan

Run all combinations? No — use one-at-a-time (OAT) ablation from baseline:
1. Baseline: n_HVG=3000, n_latent=30, batch_key=study_id, covariates=[platform, sex]
2. Vary n_HVG: 2000, 5000 (keep rest at baseline)
3. Vary n_latent: 10, 20, 50 (keep rest at baseline)
4. Vary batch_key: platform, donor_id (keep rest at baseline)
5. Vary covariates: none, platform only, sex only (keep rest at baseline)

Total: 1 (baseline) + 2 + 3 + 2 + 3 = 11 runs

## Comparison Table (fill after execution)

| Run | Δ from baseline | iLISI | cLISI | Silhouette | Decision |
|-----|----------------|-------|-------|------------|----------|
| baseline | — | | | | |
| n_HVG=2000 | | | | | |
| ... | | | | | |
```

## Triage Mode

When an error occurs mid-pipeline:

1. **Diagnose**: What failed? (schema mismatch, dtype error, OOM, convergence failure)
2. **Classify**: Is this a data issue, code issue, or design issue?
3. **Fix schema first**: If the data schema is wrong, fix it before anything else. Do not attempt workarounds.
4. **Minimal fix**: Apply the smallest change that resolves the error
5. **Re-gate**: Re-run from the last clean gate, not from scratch
6. **Log**: Document the error, diagnosis, fix, and impact in decision-log.md

**Anti-pattern: "romantic debugging"** — trying multiple creative fixes without understanding the root cause. Instead: read the error, understand the error, fix the error, verify the fix.

## Script Library: Standard Patterns

When generating scripts, follow these patterns. Route to scientific tools for implementation details.

### QC Script Pattern
```python
# Route to: scanpy skill for implementation
# Produces: figures/qc_violin.png, figures/qc_scatter.png
# Gate: G0 (Input Sanity)
# Decisions: min_genes, min_cells, max_pct_mito thresholds
```

### Preprocessing Script Pattern
```python
# Route to: scanpy + anndata skills
# Produces: preprocessed.h5ad
# Gate: G1 (Schema)
# Decisions: normalization method, HVG selection, scaling
```

### Integration Script Pattern
```python
# Route to: scvi-tools skill
# Produces: model/, integrated.h5ad, figures/convergence.png
# Gate: G2 (Design) + G3 (Training)
# Decisions: batch_key, covariates, architecture, epochs
```

### Metrics Script Pattern
```python
# Route to: scvi-tools + scanpy skills
# Produces: metrics.json, figures/metrics_comparison.png
# Gate: G4 (Metrics)
# Standard metrics: iLISI, cLISI, kBET, silhouette, ARI/NMI, batch classifier, DE preservation
```

### Report Generator Pattern
```python
# Route to: scientific-visualization skill for figures
# Produces: report.md (standard template), run-comparison.md
# Gate: G5 (Artifacts)
# Always: summary + parameters + gates + metrics table + figures + decision
```

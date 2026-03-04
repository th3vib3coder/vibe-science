# Analysis Orchestrator

Part of Vibe Science v6.0 NEXUS (originated as Pillar 3 in v3.5). Generates executable artifacts: scripts, commands, run plans, success/failure criteria. Every analysis produces standard outputs.

## Core Rule: Executable Over Descriptive

If a step can be a script, it MUST be a script. If a step can be a command, it MUST be a command. Prose descriptions of what to do are insufficient — produce the artifact that does it.

| Bad (descriptive) | Good (executable) |
|---|---|
| "Run QC on the data" | `scripts/01_qc.py` with exact parameters |
| "Check for confounding effects" | `scripts/02_confound_check.py` producing `figures/confound_plot.png` |
| "The model converged" | `training_log.csv` with loss values + `figures/convergence.png` |

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
├── output.[format]        # CONDITIONAL — domain-specific output (e.g., .parquet, .csv, .hdf5)
├── model/                 # CONDITIONAL — if model trained
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
  "description": "[model/method] applied to [dataset], [key parameters]",
  "parameters": {
    "model_param_1": "value",
    "model_param_2": "value",
    "grouping_key": "study_id",
    "covariates": ["covariate_1", "covariate_2"],
    "n_features": 3000,
    "feature_selection_method": "method_name",
    "qc_threshold_1": "value",
    "qc_threshold_2": "value"
  },
  "seeds": [42, 123],
  "versions": {
    "language": "version",
    "framework": "version",
    "key_library_1": "version",
    "key_library_2": "version"
  },
  "input": {
    "files": ["input_data.format"],
    "sha256": ["abc123..."],
    "n_samples": 145230,
    "n_features_raw": 33694,
    "n_groups": 12
  },
  "output": {
    "files": ["output_data.format", "model/model.pt"],
    "sha256": ["def456...", "ghi789..."],
    "n_samples_post_qc": 132847,
    "n_features_selected": 3000
  },
  "gates_passed": ["G0", "G1", "G2", "G3", "G4", "G5"],
  "decision": "ACCEPTED — primary metric improved X→Y, secondary metric stable",
  "previous_run": "run-20250206-091500",
  "comparison_summary": "Improved [primary objective] without degrading [secondary objective]"
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
| G0 — Input Sanity | ✅ PASS | data types verified, values in range |
| G1 — Schema | ✅ PASS | schema normalized per data-dictionary.md |
| G2 — Design | ✅ PASS | grouping key justified by exploratory analysis |
| G3 — Training | ✅ PASS | converged at epoch 280, no overfit |
| G4 — Metrics | ✅ PASS | see table below |
| G5 — Artifacts | ✅ PASS | all files present |

## Metrics

| Metric | Run A (prev) | Run B (this) | Δ | Decision |
|--------|-------------|-------------|---|----------|
| Primary metric 1 | 0.61 | 0.89 | +0.28 | ✅ improved |
| Primary metric 2 | 0.93 | 0.92 | -0.01 | ✅ stable |
| Secondary metric 1 | 0.45 | 0.47 | +0.02 | ✅ improved |
| Secondary metric 2 | 0.72 | 0.74 | +0.02 | ✅ improved |

## Figures
- `figures/overview_plot.png` — Primary visualization
- `figures/diagnostic_plot.png` — Diagnostic/QC visualization
- `figures/convergence.png` — Training/objective convergence curve
- `figures/metrics_comparison.png` — Bar chart Run A vs Run B

## Decision
**ACCEPTED.** Primary metric improved substantially without degrading secondary metrics. [Domain-specific interpretation of what the numbers mean.]

## Assumptions Active
- A-001: [Key assumption about data]
- A-002: [Key assumption about method]

## Open Issues
- [ ] Need ablation: [parameter_1] across range
- [ ] Need ablation: [parameter_2] across range
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
- Scientific-skills MCP tools needed: [list]

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
| n_features | [low, default, high] | default | Standard range for domain; fewer may miss signal, more may add noise |
| model_complexity | [small, medium, large] | medium | Default may underfit complex data or overfit simple data |
| grouping_key | [group_A, group_B, group_C] | group_A | Need to justify which grouping level is primary |
| covariates | [none, set_A, set_B, both] | [set_A, set_B] | Ablate to see if covariates help or overfit |

## Execution Plan

Run all combinations? No — use one-at-a-time (OAT) ablation from baseline:
1. Baseline: n_features=default, model_complexity=medium, grouping_key=group_A, covariates=[set_A, set_B]
2. Vary n_features: low, high (keep rest at baseline)
3. Vary model_complexity: small, large (keep rest at baseline)
4. Vary grouping_key: group_B, group_C (keep rest at baseline)
5. Vary covariates: none, set_A only, set_B only (keep rest at baseline)

Total: 1 (baseline) + 2 + 2 + 2 + 3 = 10 runs

## Comparison Table (fill after execution)

| Run | Δ from baseline | Metric 1 | Metric 2 | Metric 3 | Decision |
|-----|----------------|----------|----------|----------|----------|
| baseline | — | | | | |
| n_features=low | | | | | |
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

When generating scripts, follow these patterns. Route to scientific-skills MCP for implementation details.

### QC Script Pattern
```python
# Route to: domain-appropriate scientific-skills MCP skill
# Produces: figures/qc_violin.png, figures/qc_scatter.png
# Gate: G0 (Input Sanity)
# Decisions: QC thresholds appropriate for the domain
```

### Preprocessing Script Pattern
```python
# Route to: domain-appropriate scientific-skills MCP skill
# Produces: preprocessed.[format]
# Gate: G1 (Schema)
# Decisions: normalization method, feature selection, scaling
```

### Modeling Script Pattern
```python
# Route to: domain-appropriate scientific-skills MCP skill
# Produces: model/, output.[format], figures/convergence.png
# Gate: G2 (Design) + G3 (Training)
# Decisions: grouping key, covariates, architecture, epochs
```

### Metrics Script Pattern
```python
# Route to: domain-appropriate scientific-skills MCP skill
# Produces: metrics.json, figures/metrics_comparison.png
# Gate: G4 (Metrics)
# Standard metrics: domain-appropriate primary + secondary metrics
```

### Report Generator Pattern
```python
# Route to: scientific-visualization skill for figures
# Produces: report.md (standard template), run-comparison.md
# Gate: G5 (Artifacts)
# Always: summary + parameters + gates + metrics table + figures + decision
```

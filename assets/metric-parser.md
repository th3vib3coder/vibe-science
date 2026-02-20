# Metric Parser — Extracting and Comparing Metrics from Experiment Output

> Load this when: ACT-experiment (metric extraction from execution output), or EVALUATE phase for computational nodes.

## Overview

The Metric Parser extracts quantitative metrics from experiment output (stdout, log files, JSON), computes deltas from parent nodes, and stores results in the tree node's metadata.

---

## Standard Metric Output Format

All experiment scripts should print metrics using this format:

```
[METRIC] metric_name=value
```

### Examples
```
[METRIC] accuracy=0.782
[METRIC] auprc=0.365
[METRIC] auroc=0.891
[METRIC] loss=0.324
[METRIC] ece=0.053
[METRIC] f1=0.712
[METRIC] brier=0.187
[METRIC] precision=0.623
[METRIC] recall=0.801
[METRIC] mcc=0.412
```

### Rules
- One metric per line
- metric_name: lowercase, no spaces, use underscores for compound names
- value: numeric (integer or float)
- No units in the value field (document units in the script comments)

---

## Parsing Protocol

### Step 1: Extract Metrics
1. Read execution output (stdout or execution.log)
2. Find all lines matching `[METRIC] name=value`
3. Parse into dict: `{metric_name: float_value}`
4. If no `[METRIC]` lines found:
   - Check stderr for errors → node is likely `buggy`
   - Check if output format is non-standard → adapt parser
   - Log warning: "No parseable metrics in output"

### Step 2: Validate Metrics
For each parsed metric:
- Is it a valid number? (not NaN, not Inf)
- Is it in expected range? (e.g., accuracy in [0, 1], loss >= 0)
- If out of range → log warning, do NOT discard (could be informative)

### Step 3: Compute Delta from Parent
1. Load parent node's `metrics` dict from TREE-STATE.json
2. For each metric present in BOTH current and parent:
   - `delta = current_value - parent_value`
   - Sign indicates direction: positive = improvement for maximized metrics, negative = improvement for minimized metrics
3. Store in node's `metric_delta` dict

### Step 4: Store Results
1. Save parsed metrics to `metrics.json` in node directory
2. Update node's `metrics` field in TREE-STATE.json
3. Update node's `metric_delta` field in TREE-STATE.json

---

## Common Metrics by Domain

### Machine Learning
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| accuracy | maximize | [0, 1] | Misleading on imbalanced data |
| auprc | maximize | [0, 1] | Preferred for imbalanced classification |
| auroc | maximize | [0, 1] | Area under ROC curve |
| f1 | maximize | [0, 1] | Harmonic mean of precision and recall |
| precision | maximize | [0, 1] | |
| recall | maximize | [0, 1] | |
| mcc | maximize | [-1, 1] | Matthews correlation coefficient |
| loss | minimize | [0, +inf) | Training/validation loss |
| ece | minimize | [0, 1] | Expected calibration error |
| brier | minimize | [0, 1] | Brier score |

### scRNA-seq Integration
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| ilisi | maximize | [0, 1] | Integration LISI (batch mixing) |
| clisi | minimize | [0, 1] | Cell-type LISI (biology preservation) |
| nmi | maximize | [0, 1] | Normalized mutual information |
| ari | maximize | [-1, 1] | Adjusted Rand index |
| asw_batch | maximize | [-1, 1] | Silhouette width for batch |
| asw_label | maximize | [-1, 1] | Silhouette width for cell type |

### CRISPR Off-Target
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| auprc | maximize | [0, 1] | Primary metric for imbalanced off-target detection |
| auroc | maximize | [0, 1] | Secondary metric |
| lift | maximize | [1, +inf) | Lift over random baseline (auprc / prevalence) |
| sensitivity_at_90spec | maximize | [0, 1] | Sensitivity at 90% specificity |

---

## Delta Interpretation

### Improvement Assessment
```
For maximized metrics (accuracy, auprc, etc.):
  delta > 0  → improvement
  delta = 0  → no change
  delta < 0  → degradation

For minimized metrics (loss, ece, etc.):
  delta < 0  → improvement
  delta = 0  → no change
  delta > 0  → degradation
```

### Non-Improving Node Detection
A node is "non-improving" if:
- All delta values are <= 0 for maximized metrics AND >= 0 for minimized metrics
- OR the primary metric (defined in RQ.md) shows no improvement

Five consecutive non-improving nodes in the same branch → soft-prune the branch.

---

## Multi-Seed Aggregation

When aggregating metrics across replication nodes (same config, different seeds):

```
For each metric:
  mean = average across seeds
  std  = standard deviation across seeds

Report: mean +/- std

Flag if std > 0.05 * mean → high variance, results may be unstable
```

---

## Metric Comparison Table Format

For PROGRESS.md and best-nodes.md:

```markdown
| Node | Type | Stage | Accuracy | AUPRC | Loss | Delta (primary) |
|------|------|-------|----------|-------|------|----------------|
| node-001 | draft | 1 | 0.72 | 0.35 | 0.45 | — (baseline) |
| node-003 | hyper | 2 | 0.78 | 0.42 | 0.38 | +0.06 |
| node-004 | hyper | 2 | 0.75 | 0.39 | 0.41 | +0.03 |
| node-006 | ablation | 4 | 0.66 | 0.28 | 0.52 | -0.12 (X removed) |
```

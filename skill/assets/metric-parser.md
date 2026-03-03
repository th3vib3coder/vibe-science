# Metric Parser — Extracting and Comparing Metrics from Experiment Output

> Load this when: ACT-experiment (metric extraction from execution output), or EVALUATE phase for computational nodes.

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
[METRIC] f1=0.712
[METRIC] precision=0.623
[METRIC] recall=0.801
[METRIC] mcc=0.412
[METRIC] ece=0.053
[METRIC] brier=0.187
```

### Rules
- One metric per line
- metric_name: lowercase, no spaces, use underscores
- value: numeric (integer or float)
- No units in the value field

---

## Parsing Protocol

### Step 1: Extract Metrics
1. Read execution output (stdout or execution.log)
2. Find all lines matching `[METRIC] name=value`
3. Parse into dict: `{metric_name: float_value}`
4. If no `[METRIC]` lines found:
   - Check stderr for errors → node is likely `buggy`
   - Log warning: "No parseable metrics in output"

### Step 2: Validate Metrics
For each parsed metric:
- Is it a valid number? (not NaN, not Inf)
- Is it in expected range? (see domain metrics below)
- If out of range → log warning, do NOT discard

### Step 3: Compute Delta from Parent
1. Load parent node's `metrics` dict from TREE-STATE.json
2. For each metric in BOTH current and parent:
   - `delta = current_value - parent_value`
3. Store in node's `metric_delta` dict

### Step 4: Store Results
1. Save parsed metrics to `metrics.json` in node directory
2. Update node's `metrics` and `metric_delta` in TREE-STATE.json

---

## Common Metrics

### Machine Learning (Classification)
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| accuracy | maximize | [0, 1] | Misleading on imbalanced data |
| auprc | maximize | [0, 1] | Preferred for imbalanced classification |
| auroc | maximize | [0, 1] | Area under ROC curve |
| f1 | maximize | [0, 1] | Harmonic mean of precision and recall |
| precision | maximize | [0, 1] | |
| recall | maximize | [0, 1] | |
| mcc | maximize | [-1, 1] | Matthews correlation coefficient |

### Machine Learning (Regression)
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| r2 | maximize | (-inf, 1] | Coefficient of determination |
| rmse | minimize | [0, +inf) | Root mean squared error |
| mae | minimize | [0, +inf) | Mean absolute error |

### Training Quality
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| loss | minimize | [0, +inf) | Training/validation loss |
| ece | minimize | [0, 1] | Expected calibration error |
| brier | minimize | [0, 1] | Brier score |

### Domain-Specific Metrics
Additional metrics can be defined in `domain-config.yaml` under:
```yaml
metrics:
  custom:
    - name: metric_name
      direction: maximize|minimize
      range: [min, max]
      notes: "Description"
```

---

## Delta Interpretation

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
A node is "non-improving" if all deltas indicate no improvement.
Five consecutive non-improving nodes in the same branch → soft-prune.

---

## Multi-Seed Aggregation

```
For each metric:
  mean = average across seeds
  std  = standard deviation across seeds

Report: mean +/- std
Flag if std > 0.05 * mean → high variance, unstable results
```

---

## Metric Comparison Table Format

```markdown
| Node | Type | Stage | Primary | Secondary | Delta |
|------|------|-------|---------|-----------|-------|
| node-001 | draft | 1 | 0.72 | 0.35 | — (baseline) |
| node-003 | hyper | 2 | 0.78 | 0.42 | +0.06 |
| node-006 | ablation | 4 | 0.66 | 0.28 | -0.12 (X removed) |
```

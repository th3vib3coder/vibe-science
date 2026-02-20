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

### Optical Interconnect Performance
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| ber | minimize | [0, 1] | Bit error rate. Target: <2.4e-4 pre-FEC (KP4), <1e-12 post-FEC |
| snr_dB | maximize | [0, +inf) | Signal-to-noise ratio in dB |
| bandwidth_3dB_GHz | maximize | [0, +inf) | Small-signal modulation bandwidth |
| power_penalty_dB | minimize | [0, +inf) | Power penalty vs back-to-back (0 = no penalty) |
| reach_m | maximize | [0, +inf) | Maximum link distance at target BER |
| energy_efficiency_pJ_bit | minimize | [0, +inf) | Power consumption per bit (lower = better) |
| eye_height_mV | maximize | [0, +inf) | Eye diagram vertical opening |
| eye_width_ps | maximize | [0, +inf) | Eye diagram horizontal opening |
| extinction_ratio_dB | maximize | [0, +inf) | Transmitter on/off ratio (higher = cleaner signal) |
| sensitivity_dBm | minimize | (-inf, 0] | Receiver sensitivity at target BER (more negative = better) |

### VCSEL Device Parameters
| Metric | Direction | Range | Notes |
|--------|-----------|-------|-------|
| threshold_current_mA | minimize | [0, +inf) | Lower threshold = more efficient |
| slope_efficiency_W_A | maximize | [0, +inf) | Higher slope = more optical power per mA |
| rin_dB_Hz | minimize | (-inf, 0] | Relative intensity noise (more negative = lower noise) |
| oxide_aperture_um | — | [3, 12] | Design parameter, not optimized per se |
| modal_bandwidth_MHz_km | maximize | [0, +inf) | For MMF: higher = longer reach at given data rate |

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
| Node | Type | Stage | BER | Power Penalty (dB) | Reach (m) | Delta (primary) |
|------|------|-------|-----|---------------------|-----------|----------------|
| node-001 | draft | 1 | 2.1e-4 | 1.8 | 300 | — (baseline) |
| node-003 | hyper | 2 | 1.5e-4 | 1.2 | 400 | -0.6 dB PP |
| node-004 | hyper | 2 | 3.0e-4 | 2.5 | 200 | +0.7 dB PP |
| node-006 | ablation | 4 | 8.2e-4 | 4.1 | 50 | +2.3 dB PP (equalization removed) |
```

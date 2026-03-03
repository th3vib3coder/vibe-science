# Data Quality Gates (DQ1--DQ4) — Reference Protocol

Four sequential quality gates enforce data integrity at each phase of research. Each gate is a hard stop: if it fails, work halts until the failure is resolved. No skipping, no deferring.

---

## DQ1 — Post-Extraction

**When:** Immediately after extracting features from raw data.

**Checks:**

1. **Zero-variance columns** — Any feature with zero variance is flagged. Zero-variance features carry no information and may indicate extraction errors.
2. **Missing values > 50%** — Any feature missing more than half its values is flagged. Threshold is configurable in `domain-config.yaml`.
3. **Distribution plausibility** — Numeric features are checked for impossible ranges (e.g., negative counts, percentages outside 0--100). Categorical features are checked for unexpected cardinality.
4. **Metadata cross-check** — Sample identifiers in the extracted data must match those in the metadata. Mismatches indicate join errors or dropped records.
5. **Leakage detection** — Any feature with |correlation| > 0.95 with the target label is flagged. Perfect predictors almost always indicate data leakage, not real signal.
6. **Count match** — Row count after extraction must match expected count from the source. Unexplained row gain or loss fails the gate.

**Pass condition:** All 6 checks pass. Any failure halts the pipeline.

---

## DQ2 — Post-Training

**When:** Immediately after training a model or computing a quantitative result.

**Checks:**

1. **Trivial baseline** — The model must outperform a trivial baseline (majority class, mean prediction, random assignment). A model that cannot beat the trivial baseline has learned nothing.
2. **Feature dominance** — No single feature may account for more than 50% of total feature importance. Dominance suggests the model learned a shortcut, not a pattern.
3. **Fold stability** — Cross-validation fold metrics must have coefficient of variation (CV) < 0.50. High variance across folds indicates instability or data heterogeneity.
4. **Train-test leakage** — Training and test sets must have zero sample overlap. Verify by checking sample identifiers. Any overlap invalidates all metrics.

**Pass condition:** All 4 checks pass.

---

## DQ3 — Post-Calibration

**When:** After calibrating predictions or computing final effect estimates.

**Checks:**

1. **Plausible range** — The primary metric must fall within a plausible range for the problem domain. An AUC of 0.99 on a noisy dataset, or a p-value of exactly 0.0, is not plausible.
2. **Not suspiciously perfect** — Metrics that are too clean (exactly round numbers, zero residuals, perfect separation) trigger manual review. Nature is messy; clean results demand scrutiny.
3. **Adequate sample size** — The effective sample size must be sufficient for the analysis performed. Report the sample size and justify its adequacy.
4. **Seed reproducibility** — Results must be reproducible across at least 2 different random seeds. If changing the seed changes the conclusion, the finding is not robust.

**Pass condition:** All 4 checks pass.

---

## DQ4 — Post-Finding

**When:** After formulating a finding for FINDINGS.md or CLAIM-LEDGER.

**Checks:**

1. **Number match (SSOT)** — Every number in the prose finding must exist in the structured JSON source. Extract all numbers from the markdown and verify each against the JSON within tolerance (default: 0.001). See `ssot.md` for details.
2. **Sample size reported** — The finding must state the sample size on which it is based. Findings without sample sizes are incomplete.
3. **Alternative explanations** — At least one alternative explanation must be acknowledged. If you cannot think of one, you have not thought hard enough.
4. **Terminology consistency** — Terms used in the finding must match terms used in the data dictionary (DD0). Renaming variables mid-report creates confusion and errors.
5. **Evidence reference** — The finding must cite specific artifact files (JSON, CSV, plots) that support it. Unsupported prose fails the gate.

**Pass condition:** All 5 checks pass.

---

## Running the Gates

```bash
# Run a specific gate
python scripts/dq_gate.py --gate DQ1 --data data.json

# Run with domain-specific configuration
python scripts/dq_gate.py --gate DQ1 --data data.json --config domain-config.yaml

# Run all gates in sequence
python scripts/dq_gate.py --gate ALL --data data.json --config domain-config.yaml
```

**Arguments:**

| Flag | Required | Description |
|------|----------|-------------|
| `--gate` | Yes | Which gate to run: `DQ1`, `DQ2`, `DQ3`, `DQ4`, or `ALL` |
| `--data` | Yes | Path to the data artifact (JSON) being checked |
| `--config` | No | Path to domain-specific config YAML with custom thresholds |

**Output:** A JSON report with pass/fail per check, plus details for any failures. Written to `.vibe-science/gates/DQ{N}-{timestamp}.json`.

---

## Domain Configuration

The `domain-config.yaml` file allows overriding default thresholds per domain:

```yaml
dq_gates:
  dq1:
    missing_threshold: 0.50      # max fraction of missing values
    leakage_corr_threshold: 0.95 # max |correlation| with label
  dq2:
    max_single_feature_importance: 0.50
    max_fold_cv: 0.50
  dq3:
    min_seeds: 2
    ssot_tolerance: 0.001
```

If no config is provided, defaults from this document are used.

---

## Integration

- **DQ1** depends on **DD0** (data dictionary must exist before extraction checks).
- **DQ4** depends on **SSOT** (sync check between JSON and markdown).
- All DQ gate results are logged to the **Research Spine** automatically.
- Gate failures are surfaced by the **Observer** if not resolved within 2 cycles.

---

*This protocol is domain-agnostic. Adapt thresholds in `domain-config.yaml` for your specific field.*

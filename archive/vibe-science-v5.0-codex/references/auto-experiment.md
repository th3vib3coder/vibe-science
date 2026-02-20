# Auto-Experiment Protocol

> Load this when: ACT-experiment, executing a tree node that involves code generation and execution.

## Overview

The Auto-Experiment protocol handles the ACT phase for computational tree nodes: generate code, execute it, capture output, parse metrics. This is the engine that turns tree node plans into actual experimental results.

---

## Execution Flow

```
1. RECEIVE PLAN (from THINK phase)
   └── Node plan: what to run, what to measure, what files to produce

2. CODE GENERATION
   ├── If draft node: generate new script from scratch
   ├── If improve/hyper node: modify parent node's code
   ├── If ablation node: remove one component from parent's code
   ├── If replication node: copy parent's code, change only seed
   └── If debug node: diagnose and fix parent's bug

3. PRE-EXECUTION CHECK
   └── Gate G0 where applicable (data integrity)

4. EXECUTE
   ├── Run script
   ├── Capture stdout, stderr, execution time
   └── Save execution log

5. POST-EXECUTION
   ├── Parse metrics from output
   ├── Compute delta from parent metrics
   ├── Save all artifacts (scripts, data, figures, logs)
   └── Detect if execution failed (buggy node)

6. RETURN to EVALUATE
   └── Results ready for scoring, gating, serendipity radar
```

---

## Code Generation Rules

### For `draft` Nodes (new approach)
1. Generate a complete, self-contained script
2. Script must:
   - Load data from a specified path (no hardcoded paths)
   - Execute the planned analysis/model
   - Print metrics to stdout in parseable format (see Metric Output Format)
   - Save figures to specified output directory
   - Save results to specified output file
3. Use skill-router.md to dispatch to appropriate specialist tool for domain-specific code

### For `improve` / `hyperparameter` Nodes (refinement)
1. Start from parent node's code (`code_path` in parent's YAML)
2. Apply the specific modification from the plan:
   - Hyperparameter: change one or more parameter values
   - Improve: change algorithm, add preprocessing step, modify architecture
3. Generate a diff that clearly shows what changed
4. Save both the modified script and the diff

### For `ablation` Nodes (component removal)
1. Start from parent node's code (typically the best node)
2. Remove EXACTLY ONE component:
   - Remove a feature
   - Remove a preprocessing step
   - Remove a model component
   - Replace a learned component with a baseline
3. The diff must clearly show what was removed
4. The ablation_target must be documented

### For `replication` Nodes (seed variation)
1. Use IDENTICAL code to parent
2. Change ONLY the random seed
3. Document: same code, different seed, purpose is reproducibility

### For `debug` Nodes (fix attempt)
1. Read parent's bug_description and execution log
2. Diagnose the root cause (not just the symptom)
3. Apply a fix that addresses the ROOT CAUSE
4. Gate T1 check: this must be a DIFFERENT fix from previous debug attempts
5. If 3 fixes have already been tried → do NOT generate code. Return T1 FAIL.

---

## Metric Output Format

Scripts must print metrics in a parseable format. The standard format:

```
[METRIC] metric_name=value
```

Examples:
```
[METRIC] accuracy=0.782
[METRIC] auprc=0.365
[METRIC] auroc=0.891
[METRIC] loss=0.324
[METRIC] ece=0.053
[METRIC] f1=0.712
```

### Metric Parsing
After execution, parse all `[METRIC]` lines from stdout:
1. Extract name-value pairs
2. Compare to parent node's metrics → compute delta
3. Store in node's `metrics` and `metric_delta` fields

If no `[METRIC]` lines found in output:
- Check stderr for errors → node is `buggy`
- Check if script ran but produced no metrics → investigate, may need different output format

---

## File Structure per Node

Each computational node produces files in:
```
08-tree/nodes/{node_id}-{type}/
├── script.py              # The generated/modified script
├── diff.patch             # Diff from parent (if improve/hyper/ablation)
├── execution.log          # stdout + stderr
├── metrics.json           # Parsed metrics
├── figures/               # Generated figures (if any)
│   ├── fig1.png
│   └── ...
├── data/                  # Output data (if any)
│   ├── results.csv
│   └── ...
└── node-{id}-{type}.yaml  # Full node metadata
```

---

## Execution Environment

### Before Running
1. Verify data files exist at expected paths
2. Verify required packages are available
3. Set random seed explicitly in the script
4. Set environment variables if needed

### During Execution
1. Capture wall-clock time
2. Monitor for common failures:
   - OOM (out of memory) → note in bug_description
   - NaN in loss/metrics → note specific location
   - Import errors → note missing package
   - Data format errors → note expected vs. actual format
3. Set a timeout (configurable, default 30 minutes per node)

### After Execution
1. If exit code = 0 and metrics parsed → node is `good` (pending evaluation)
2. If exit code != 0 or no metrics → node is `buggy`
3. Save execution_time_seconds
4. Save execution_log_path

---

## Skill Dispatch for Code Generation

When generating code, dispatch to the appropriate specialist tool:

| Task | Skill | Notes |
|------|-------|-------|
| ML classification/regression | `scikit-learn` | Standard ML pipelines |
| Deep learning | `pytorch-lightning` | Training loops, models |
| scRNA-seq analysis | `scanpy`, `scvi-tools` | Single-cell workflows |
| Statistical analysis | `statsmodels` | Regression, GLM, tests |
| Visualization | `matplotlib`, `scientific-visualization` | Figures |
| Data manipulation | `anndata`, exploratory-data-analysis | Data handling |

Use `find_helpful_skills(task_description)` to identify the right skill, then `read_skill_document(skill_name)` for implementation guidance.

---

## Error Handling

### Common Failure Modes and Responses

| Failure | Detection | Response |
|---------|-----------|----------|
| Import error | stderr contains "ModuleNotFoundError" | Note missing package. Debug node should install or use alternative. |
| Data not found | stderr contains "FileNotFoundError" | Check data path. Debug node should fix path. |
| OOM | stderr contains "MemoryError" or killed | Reduce batch size, subsample data, or note as constraint. |
| NaN loss | metrics contain NaN | Check: non-integer counts? extreme outliers? learning rate too high? |
| Timeout | execution exceeds limit | Kill process. Note timeout. May need optimization or simpler approach. |
| Empty output | stdout has no [METRIC] lines | Check script logic. May need different output format. |

### Debug Attempt Protocol
When creating a debug node:
1. Read parent's execution.log
2. Identify root cause (not just error message)
3. Verify this is a NEW root cause (not same as previous debug attempts)
4. Apply targeted fix
5. Gate T1: max 3 debug attempts per buggy parent

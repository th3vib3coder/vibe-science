# Tree Node Schema

> Load this when: tree mode initialization, node creation, or when referencing node fields.

## Overview

Each node in the tree represents one complete OTAE cycle. Nodes are stored as individual YAML files in `08-tree/nodes/` and collectively in `TREE-STATE.json`.

---

## TreeNode Schema

```yaml
TreeNode:
  # Identity
  node_id: str              # Sequential: "node-001", "node-002", ...
  parent_id: str | null     # null only for root
  children_ids: list[str]   # List of child node_ids
  depth: int                # 0 for root, increments per level

  # Type & Stage
  node_type: str            # draft | debug | improve | hyperparameter | ablation | replication | serendipity
  stage: int                # 1-5

  # OTAE Content
  observe_summary: str      # What was observed from parent + global context
  think_plan: str           # What was planned for this node
  act_description: str      # What was executed
  act_artifacts: list[str]  # Paths to generated files
  evaluate_result: str      # Evaluation summary

  # Code (if computational)
  code_path: str | null
  code_diff: str | null
  execution_log_path: str | null
  execution_time_seconds: float | null
  is_buggy: bool
  bug_description: str | null
  debug_attempts: int       # 0-3

  # Metrics
  metrics: dict             # e.g. {accuracy: 0.78, loss: 0.32}
  metric_delta: dict        # Change from parent: {accuracy: +0.06}

  # Evidence Integration
  claim_ids: list[str]
  confidence: float         # Evidence Engine weighted confidence (0-1)
  vlm_feedback: str | null
  vlm_score: float | null

  # Status
  status: str               # pending | running | good | buggy | pruned | promoted
  gate_results: dict        # e.g. {G0: pass, DQ1: pass, T0: pass}
  r2_ensemble_id: str | null

  # v5.5 additions
  spine_entry_id: str | null      # Reference to SPINE.md entry
  dq_gate_results: dict | null    # {DQ1: pass, DQ2: pass, ...}
  r2_inline_result: dict | null   # 7-point checklist result

  # Serendipity
  serendipity_flags: list[str]

  # Ablation (if node_type == ablation)
  ablation_target: str | null
  ablation_impact: dict | null

  # Meta
  created_at: str           # ISO datetime
  model_used: str           # Which model ran this node
  seed: int | null          # Random seed used
```

---

## Node Type Constraints

| Type | Allowed Parent Status | Allowed Stages | Special Rules |
|------|----------------------|----------------|---------------|
| `draft` | root or `good` | 1, 3 | New approach; not in Stage 2 |
| `debug` | `buggy` only | Any | Max 3 per buggy parent (Gate T1) |
| `improve` | `good` | 2+ | Refinement of working approach |
| `hyperparameter` | `good` | 2 | Parameter variation only |
| `ablation` | `best` (current best) | 4 | Remove exactly one component |
| `replication` | `good` | 4-5 | Identical code, different seed |
| `serendipity` | any (trigger node) | Any | Exempt from stage constraints |

---

## Node Status Transitions

```
pending → running → good      (successful execution + valid metrics)
pending → running → buggy     (execution failed or invalid metrics)
buggy → [debug child]   → good (if fix works)
buggy → [3 debug attempts]   → pruned (Gate T1 FAIL)
good  → promoted             (after R2 clearance, best in stage)
any   → pruned               (R2 VETO, branch health fail, manual prune)
```

---

## File Naming

Node files: `08-tree/nodes/{node_id}-{type}.yaml`

For computational nodes with code:
```
08-tree/nodes/node-003-hyperparameter/
├── script.py
├── diff.patch
├── execution.log
├── metrics.json
├── figures/
└── node-003-hyperparameter.yaml
```

---

## Root Node

```yaml
root:
  node_id: "root"
  parent_id: null
  children_ids: ["node-001"]
  depth: 0
  node_type: "root"
  stage: 0
  status: "good"
  metrics: {}
  claim_ids: []
  created_at: "YYYY-MM-DDTHH:MM:SSZ"
```

---

## Defaults for New Nodes

```yaml
status: "pending"
is_buggy: false
debug_attempts: 0
metrics: {}
metric_delta: {}
claim_ids: []
confidence: 0.0
vlm_feedback: null
vlm_score: null
gate_results: {}
dq_gate_results: null
r2_ensemble_id: null
r2_inline_result: null
spine_entry_id: null
serendipity_flags: []
ablation_target: null
ablation_impact: null
seed: null
```

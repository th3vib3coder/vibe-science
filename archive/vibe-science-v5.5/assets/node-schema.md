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
  act_artifacts: list[str]  # Paths to generated files (scripts, data, figures)
  evaluate_result: str      # Evaluation summary

  # Code (if computational)
  code_path: str | null     # Path to generated/modified script
  code_diff: str | null     # Diff from parent node's code
  execution_log_path: str | null
  execution_time_seconds: float | null
  is_buggy: bool
  bug_description: str | null
  debug_attempts: int       # 0-3

  # Metrics
  metrics: dict             # e.g. {accuracy: 0.78, auprc: 0.65, loss: 0.32}
  metric_delta: dict        # Change from parent: {accuracy: +0.06}

  # Evidence Integration
  claim_ids: list[str]      # Claims generated/updated in this node
  confidence: float         # Evidence Engine weighted confidence (0-1)
  vlm_feedback: str | null  # VLM analysis of generated figures
  vlm_score: float | null   # VLM quality score (0-1)

  # Status
  status: str               # pending | running | good | buggy | pruned | promoted
  gate_results: dict        # e.g. {G0: pass, G2: pass, T0: pass}
  r2_ensemble_id: str | null

  # Serendipity
  serendipity_flags: list[str]  # Unexpected observations from this node

  # Ablation (if node_type == ablation)
  ablation_target: str | null   # Which component was removed
  ablation_impact: dict | null  # e.g. {accuracy: -0.12, meaning: "critical component"}

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
| `ablation` | `best` (current best node) | 4 | Remove exactly one component |
| `replication` | `good` | 4-5 | Identical code, different seed |
| `serendipity` | any (trigger node) | Any | Exempt from stage constraints |

---

## Node Status Transitions

```
pending → running → good      (successful execution + valid metrics)
pending → running → buggy     (execution failed or invalid metrics)
buggy → [debug child created] → good (if fix works)
buggy → [3 debug attempts]   → pruned (Gate T1 FAIL)
good  → promoted             (after R2 clearance, best in stage)
any   → pruned               (R2 VETO, branch health fail, manual prune)
```

---

## File Naming

Node files are stored at: `08-tree/nodes/{node_id}-{type}.yaml`

Examples:
- `08-tree/nodes/node-001-draft.yaml`
- `08-tree/nodes/node-003-hyperparameter.yaml`
- `08-tree/nodes/node-005-debug.yaml`
- `08-tree/nodes/node-010-serendipity.yaml`

For computational nodes with code, a directory is also created:
```
08-tree/nodes/node-003-hyperparameter/
├── script.py
├── diff.patch
├── execution.log
├── metrics.json
├── figures/
├── data/
└── node-003-hyperparameter.yaml
```

---

## Root Node

The root node is special:
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

Root has no OTAE content — it is the starting point from which all exploration branches.

---

## Defaults for New Nodes

When creating a new node, initialize with:
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
r2_ensemble_id: null
serendipity_flags: []
ablation_target: null
ablation_impact: null
seed: null
```

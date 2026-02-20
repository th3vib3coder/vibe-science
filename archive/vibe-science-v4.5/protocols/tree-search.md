# Tree Search Protocol

> Load this when: THINK-experiment, tree mode initialization, or any node selection/creation decision.

## Overview

The tree search engine is the core architectural difference between v4.0 and v3.5. Instead of a flat sequence of cycles, research exploration follows a tree structure where each node is a complete OTAE cycle. The engine selects which node to expand next, manages branching/pruning, and tracks tree health.

---

## Tree Modes

| Mode | When | Behavior |
|------|------|----------|
| LINEAR | Literature review, discovery phases | Sequential cycles like v3.5. Each node has exactly one child. No branching. |
| BRANCHING | Computational experiments, hypothesis testing | Full tree search. Multiple children per node. Best-first selection. |
| HYBRID | Mixed research (discovery → experiments) | Start LINEAR for discovery, switch to BRANCHING when computational work begins. |

Tree mode is set at session initialization (Phase 0 COMMIT) and stored in STATE.md and TREE-STATE.json. Mode can be changed at stage transitions with R2 approval.

---

## Node Types

| Type | When | Parent Required | Stage | Description |
|------|------|-----------------|-------|-------------|
| `draft` | Stage 1, 3 | root or any good node | 1+ | New experimental approach |
| `debug` | Any stage | buggy node only | Any | Fix attempt (max 3 per parent, then prune) |
| `improve` | Stage 2+ | good node | 2+ | Refinement of working approach |
| `hyperparameter` | Stage 2 | good node | 2 | Parameter variation |
| `ablation` | Stage 4 | best node | 4 | Remove one component to test contribution |
| `replication` | Stage 4-5 | good node | 4-5 | Same config, different seed |
| `serendipity` | Any stage | any node (the trigger node) | Any | Unexpected branch from serendipity detection (score >= 12) |

### Node Type Constraints

- `draft` cannot be created in Stage 2 (that's for `hyperparameter` and `improve`)
- `hyperparameter` and `improve` require a `good` parent (no expanding from buggy/pruned)
- `ablation` requires the current `best` node as parent
- `replication` uses identical config to parent, only changes seed
- `debug` can ONLY be a child of a `buggy` node
- `serendipity` nodes are exempt from stage constraints — they can be created in any stage

---

## Node Selection (Best-First)

At each THINK phase, select the next node to expand:

```
1. BLOCKING CHECKS (handle first):
   - Pending R2 demands? → address them (no new nodes until cleared)
   - Failed gate? → fix it (no new nodes until re-gated)

2. DEBUG PRIORITY:
   If pending debug nodes exist AND random() < debug_prob (0.5):
     → Select oldest pending debug node
     → Gate T1 check: debug_attempts <= 3 for the buggy parent

3. STAGE-DRIVEN TYPE:
   If current stage demands specific type:
     Stage 1 → draft (new approaches)
     Stage 2 → hyperparameter or improve
     Stage 3 → draft (creative variants, sub-experiments)
     Stage 4 → ablation or replication
     Stage 5 → synthesis (no new experiment nodes)
   → Select best unexpanded node of required type

4. BEST-FIRST SELECTION:
   → Select node with highest score across all branches:
   Score = evidence_confidence * 0.6 + metric_improvement * 0.3 + novelty * 0.1

   Where:
   - evidence_confidence = CLAIM-LEDGER confidence of claims from this node (0-1)
   - metric_improvement = delta from parent's best metric, normalized to 0-1
   - novelty = 1.0 if this branch has < 3 nodes, 0.5 if 3-7, 0.0 if > 7
     (encourages exploration of new branches — LAW 8)
```

### Selection Tie-Breaking
If two nodes have equal score:
1. Prefer the node in a less-explored branch (LAW 8: Explore Before Exploit)
2. Prefer the node at shallower depth (prefer breadth over depth)
3. Prefer the node created earlier (FIFO)

---

## Node Creation Protocol

When creating a new node:

1. **Gate T0 Check** (mandatory before expansion):
   - Node has valid type for current stage
   - Node has valid parent (exists in TREE-STATE.json, parent not pruned)
   - Node has non-empty think_plan
   - If T0 FAIL → fix before creating

2. **Gate T2 Check** (if creating sibling):
   - New node differs from existing siblings in at least 1 substantive parameter
   - No exact duplicate configurations among siblings
   - If T2 FAIL → differentiate or merge

3. **Assign node_id**: Sequential (`node-001`, `node-002`, ...)

4. **Initialize node fields** (from TREE NODE SCHEMA in SKILL.md):
   - Set parent_id, depth, node_type, stage
   - Set observe_summary from parent context
   - Set think_plan from THINK phase
   - Set status = `pending`
   - All other fields empty/null/default

5. **Update TREE-STATE.json**:
   - Add node to `nodes` dict
   - Add node_id to parent's `children_ids`
   - Update `tree_health` counters

6. **Create node file**: `08-tree/nodes/{node_id}-{type}.yaml`

---

## Pruning Rules

### Hard Prune (node becomes `pruned`, cannot be expanded further)
- Node is `buggy` after 3 debug attempts (Gate T1 FAIL) → prune with reason
- R2 VETO on a branch → prune all nodes in that branch

### Soft Prune (branch deprioritized, not removed)
- Branch has 5+ consecutive non-improving nodes → deprioritize (reduce selection score by 0.5)
- Node produces metrics worse than random baseline → deprioritize

### Pruning Actions
1. Mark node status = `pruned` in TREE-STATE.json
2. Record reason in node's YAML file
3. Log in PROGRESS.md: "PRUNED node-xxx: [reason]"
4. Run Gate T3 (tree health) — is the overall tree still healthy?

---

## Tree Health Monitoring (Gate T3)

Run every 5 cycles, or after any node is pruned.

```
Tree Health Check:
1. Compute: good_nodes / total_nodes
   - Must be >= 0.2 (at least 20% of nodes productive)
   - If < 0.2 → T3 FAIL → STOP expanding → R2 emergency review

2. Check branch diversity:
   - At least 2 branches explored (unless tree_mode = LINEAR)
   - If single branch → create alternative branch (LAW 8)

3. Check branch health:
   - No branch with 5+ consecutive non-improving nodes
   - If found → soft-prune that branch, try different approach

4. Check depth balance:
   - Is the tree lopsided? (one branch much deeper than others)
   - If lopsided → R2 Shadow will flag (see R2 Shadow Protocol)
```

### T3 FAIL Response
Do NOT add more nodes. The current approach is not working.
1. Stop all expansion
2. R2 emergency review of entire tree
3. Strategy revision: change approach, not just parameters
4. Present options to user: pivot, restart with different hypothesis, or conclude with what we have

---

## Tree Visualization

Updated every cycle in `08-tree/tree-visualization.md`.

### Format
```
[S{stage}] root
 ├── [S1][draft] node-001 ★ good (acc=0.72)
 │   ├── [S2][hyper] node-003 ★ good (acc=0.78) ← BEST
 │   │   └── [S2][hyper] node-005 ✗ buggy (NaN loss)
 │   │       └── [S2][debug] node-008 ✗ buggy (fix failed)
 │   │           └── [S2][debug] node-009 ✂ pruned (3 attempts)
 │   └── [S2][hyper] node-004 ★ good (acc=0.75)
 ├── [S1][draft] node-002 ★ good (acc=0.68)
 │   └── [S2][improve] node-006 ★ good (acc=0.74)
 ├── [S1][draft] node-007 ~ pending
 └── [S3][serendipity] node-010 ★ good (acc=0.81) ◆ promoted
```

### Legend
- ★ good — node executed successfully, metrics valid
- ✗ buggy — node execution failed or produced errors
- ✂ pruned — node removed from consideration (debug limit, R2 veto, etc.)
- ~ pending — node created but not yet executed
- ◆ promoted — node promoted after R2 clearance
- ← BEST — current best node in tree

---

## Stage Transitions in Tree

When a stage gate (S1-S5) passes:

1. **Multi-seed validation** of best node (3 seeds minimum, 2 for S1)
2. **R2 batch review** at transition (BLOCKING)
3. **Set best node** as conceptual root for next stage
4. **Update TREE-STATE.json**: `current_stage` + 1, add to `stage_history`
5. **Log**: append to `08-tree/stage-transitions.log`
6. **Update**: `08-tree/best-nodes.md` with stage-best summary

### Stage-Node Type Mapping

| Stage | Primary Node Types | Focus |
|-------|-------------------|-------|
| 1 | `draft` | Try different approaches, find one that works |
| 2 | `hyperparameter`, `improve` | Optimize the best Stage 1 approach |
| 3 | `draft` (variants) | Explore creative variants, sub-questions |
| 4 | `ablation`, `replication` | Validate, ablate, multi-seed |
| 5 | none (no new experiments) | Synthesize, R2 final review, write up |

---

## Tree State Persistence

### TREE-STATE.json
Complete tree serialization. Updated every CRYSTALLIZE phase. Contains:
- All nodes with full metadata
- Current stage and stage history
- Tree health counters
- Current and best node pointers

See `assets/templates.md` for the full JSON template.

### Node Files (08-tree/nodes/)
One YAML file per node: `{node_id}-{type}.yaml`
Contains the full TreeNode schema from SKILL.md.
These are the ground truth — if TREE-STATE.json is corrupted, reconstruct from node files.

### tree-visualization.md
ASCII tree updated every cycle. Human-readable overview.

### best-nodes.md
Summary of best node per stage with metrics. Updated at stage transitions.

### stage-transitions.log
Append-only log of stage advancement events with gate results.

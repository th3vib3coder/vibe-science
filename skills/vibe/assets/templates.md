# Vibe Science v7.0 TRACE Templates

All templates for creating files in the `.vibe-science/` folder structure.

## STATE.md Template

Max 100 lines. Rewritten each cycle (not append-only).

```yaml
---
vibe_science_version: 7.0.0
rq: RQ-001
runtime: solo|team
phase: brainstorm|discovery|analysis|data|validation|pipeline|synthesis
stage: 1|2|3|4|5
cycle: 1
tree_mode: linear|branching|hybrid
current_node: node-001
last_updated: YYYY-MM-DDTHH:MM:SSZ
unreviewed_claims_pending: 0
queries_run: 0
claims_total: 0
claims_verified: 0
claims_killed: 0
claims_robust: 0
serendipity_flags: 0
serendipity_unresolved: 0
tree_nodes_total: 0
tree_nodes_good: 0
tree_nodes_pruned: 0
gates_status: {G0: pending, G1: pending, G2: pending, G3: pending, G4: pending, G5: pending, B0: pending}
stage_gates: {S1: pending, S2: pending, S3: pending, S4: pending, S5: pending}
dq_gates: {DQ1: pending, DQ2: pending, DQ3: pending, DQ4: pending}
new_gates: {DD0: pending, DC0: pending, L-1: pending}
observer_alerts: 0
spine_entries: 0
---
```

```markdown
## Current Focus
[What we're investigating right now — 2-3 sentences max]

## Current Tree State
- Node: [current node_id] (type: [type], stage: [stage])
- Parent chain: [root → ... → current]
- Best node: [node_id] (metric: [value])
- Tree health: [good/total ratio]

## Key Findings This Session
- [Finding 1 with claim_id, confidence, harness status]

## Confounder Harness Status
| Claim | Raw | Conditioned | Matched | Status |
|-------|-----|-------------|---------|--------|
| C-xxx | +0.25 | +0.18 | +0.15 | ROBUST |

## Open Questions
1. [Question needing resolution]

## R2 Status
- Last review: [ensemble_id] on [date]
- Open demands: [N]
- Next scheduled: [SHADOW in N cycles / FORCED pending]

## Observer Status
- Last run: [date]
- Alerts: [N] (HALT: N, WARN: N, INFO: N)

## Serendipity Flags
- [S-xxx: description, score, status]

## Next Action
[Exact next step — specific, actionable, references relevant gate]

## Blockers
- [If any]
```

---

## PROGRESS.md Template

Append-only. Never edit previous entries. Newest at top.

```markdown
# Progress Log

## YYYY-MM-DD

### Cycle N — HH:MM [Stage S, Node node-xxx]
- **Action:** [What was done]
- **Node:** [node_id] (type: [type])
- **Result:** [What was found]
- **Decision:** [What was decided] (DEC-xxx)
- **Claims:** [New: C-xxx | Updated: C-yyy | Killed: C-zzz]
- **Gates:** [Passed: G0, DQ1 | Failed: G2 (reason)]
- **R2:** [None | SHADOW (no issues) | FORCED (demands: ...)]
- **Serendipity:** None / [description, score]
- **Crystallized:** [Files written this cycle]
```

---

## CLAIM-LEDGER.md Template

```markdown
# Claim Ledger

## C-001
- **Text:** [atomic assertion]
- **Type:** DATA | INFERENCE | OPINION
- **Evidence:** [list of evidence items]
- **Confidence:** 0.XX (E=X.X, R=X.X, C=X.X, K=X.X, D=X.X)
- **Status:** UNVERIFIED | VERIFIED | CHALLENGED | REJECTED | CONFIRMED | ARTIFACT | CONFOUNDED | ROBUST
- **Confounder Harness:**
  - Raw: [estimate, sign, magnitude]
  - Conditioned: [estimate, sign, magnitude, confounders controlled]
  - Matched: [estimate, sign, magnitude, matching method]
  - Harness Verdict: ROBUST | CONFOUNDED | ARTIFACT | PENDING
- **R2 INLINE:** [7-point checklist result]
- **Reviewer2:** [ensemble_id or null]
- **Depends on:** [claim_ids]
- **Assumptions:** [assumption_ids]
- **Node:** [tree node_id]
- **Created:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD
```

---

## SPINE.md Template (v6.0)

```markdown
# Research Spine

> Structured logbook. Each entry records one action. Auto-appended during CRYSTALLIZE.

---

### YYYY-MM-DD HH:MM UTC | INIT
- **Action**: Session initialized for RQ-001
- **Input**: —
- **Output**: .vibe-science/ folder created
- **Gate**: B0:PENDING
- **Errors**: none
- **Next**: Phase 0 Brainstorm
```

---

## ASSUMPTION-REGISTER.md Template

```markdown
# Assumption Register

## A-001
- **Text:** [what we assume]
- **Risk:** HIGH | MEDIUM | LOW
- **Verification plan:** [how to test]
- **Status:** ACTIVE | TESTED-OK | TESTED-FAIL | RETIRED
- **Claims affected:** [C-xxx, C-yyy]
- **Cycles untested:** [N]
```

---

## Tree State Template (for STATE.md tree section reference)

```json
{
  "version": "7.0.0",
  "tree_mode": "branching",
  "current_stage": 1,
  "cycle": 1,
  "current_node": "node-001",
  "best_node": "node-001",
  "nodes": {
    "root": {
      "node_id": "root",
      "parent_id": null,
      "children_ids": ["node-001"],
      "depth": 0,
      "node_type": "root",
      "stage": 0,
      "status": "good",
      "metrics": {},
      "claim_ids": [],
      "created_at": "YYYY-MM-DDTHH:MM:SSZ"
    }
  },
  "stage_history": [],
  "tree_health": {
    "total_nodes": 1,
    "good_nodes": 0,
    "pruned_nodes": 0,
    "ratio": 0.0,
    "exploration_ratio": 0.0
  }
}
```

---

## RQ.md Template

```yaml
---
id: RQ-001
created: YYYY-MM-DD
status: active|completed|abandoned|pivoted
priority: high|medium|low
tree_mode: linear|branching|hybrid
serendipity_origin: null|S-xxx
brainstorm_review: ENS-xxx
---
```

```markdown
# Research Question

## Question
[Precise, falsifiable research question]

## Hypothesis
[Testable hypothesis]

## Null Hypothesis
[What we expect if the effect doesn't exist]

## Predictions
- If true: [X]
- If false: [Y]

## Success Criteria
- [ ] [Measurable criterion 1]

## Data Requirements
- [What data is needed]
- DATA_AVAILABLE score: [0-1]

## Kill Conditions
- [When to abandon]
```

---

## CONFOUNDER-HARNESS Template (LAW 9)

```markdown
# Confounder Harness: [claim_id]

## Claim
**Text:** [exact claim text]

## Raw Estimate
- **Effect:** [coefficient / OR / difference]
- **Sign:** [positive | negative]
- **Magnitude:** [value]
- **p-value:** [value]
- **CI:** [lower, upper]

## Conditioned Estimate
- **Confounders controlled:** [list]
- **Effect:** [value]
- **Change from raw:** [% change, sign change?]

## Matched Estimate
- **Matching method:** [propensity | exact | CEM | paired]
- **Effect:** [value]
- **Change from raw:** [% change, sign change?]

## VERDICT
- [ ] Sign change? → **ARTIFACT** (killed)
- [ ] Collapse > 50%? → **CONFOUNDED** (downgraded)
- [ ] Survives? → **ROBUST** (promotable)

**Status:** ARTIFACT | CONFOUNDED | ROBUST
```

---

## Decision Log Entry Template

```markdown
## DEC-YYYYMMDD-NNN

**Date:** YYYY-MM-DD
**Context:** [What prompted this decision]
**Decision:** [What was decided]
**Justification:** [Why — evidence-based]
**Alternatives considered:**
1. [Alt A] — rejected because [reason]
**Trade-offs:** [What we lose]
**Reversibility:** HIGH | MEDIUM | LOW
**Claims affected:** [C-xxx]
```

---

## Handoff Document Template (v6.0)

Use when transferring work between agents (R2 → Researcher, Explorer → Researcher, stage transitions).

```
## HANDOFF: [Source Role] → [Target Role]
**Session:** [session_id] | **RQ:** [RQ-XXX] | **Stage:** [N] | **Cycle:** [N]
**Timestamp:** [ISO 8601]

### Context
[1-3 sentences: what was being investigated, which claims, which branch of the tree]

### Findings
| Claim ID | Confidence | Status | Summary |
|----------|-----------|--------|---------|
| CLM-XXX  | 0.XX      | DRAFT/PROMOTED/KILLED | [one sentence] |

### Files Modified
- `path/to/file.md` (lines X-Y): [what changed]
- `path/to/data.json`: [what was added/modified]

### Open Questions
1. [Question that needs resolution, with priority HIGH/MEDIUM/LOW]
2. [Question 2...]

### Recommendations
1. [Suggested next action with priority and rationale]
2. [Action 2...]

### Handoff Checklist
- [ ] All findings recorded in CLAIM-LEDGER
- [ ] All artifacts saved to disk (LAW 6)
- [ ] STATE.md updated (LAW 7)
- [ ] Spine entry logged (LAW 10)
```

---

## Instinct Entry Template (v6.0)

Use when recording a learned behavior pattern.

```
### INSTINCT: [Short description]
**Type:** GATE_FAILURE_CLUSTER | REPEATED_ACTION | CLAIM_LIFECYCLE | INSTINCT
**Confidence:** [0.3-0.9]
**Scope:** project | global
**First Seen:** [ISO 8601]
**Last Seen:** [ISO 8601]
**Occurrences:** [N]

**Description:**
[What the pattern is, when it applies, what to do about it]

**Evidence:**
- [Session X: observation]
- [Session Y: confirmation]

**Action When Triggered:**
[What the agent should do when this instinct is relevant]
```

---

## Pattern Report Template (v6.0)

Generated by Stop hook at session end.

```
## SESSION PATTERN REPORT
**Session:** [session_id]
**Extracted:** [timestamp]
**Patterns Found:** [N]

### New Patterns
| Type | Description | Confidence | Evidence |
|------|-------------|-----------|----------|
| [type] | [description] | [0.X] | [brief] |

### Updated Patterns
| Type | Description | Old Conf → New Conf | Occurrences |
|------|-------------|---------------------|-------------|
| [type] | [description] | [0.X → 0.Y] | [N] |

### Archived Patterns (confidence < 0.2)
| Type | Description | Final Confidence | Reason |
|------|-------------|-----------------|--------|
| [type] | [description] | [0.X] | Decay / Override |
```

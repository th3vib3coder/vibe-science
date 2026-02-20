# Vibe Science v4.0 Templates

All templates for creating files in the `.vibe-science/` folder structure.

## STATE.md Template

Max 100 lines. Rewritten each cycle (not append-only).

```yaml
---
vibe_science_version: 4.0.0
rq: RQ-001
runtime: solo|team
phase: brainstorm|discovery|analysis|data|validation|pipeline|synthesis
stage: 1|2|3|4|5
cycle: 1
tree_mode: linear|branching|hybrid
current_node: node-001
last_updated: YYYY-MM-DDTHH:MM:SSZ
minor_findings_pending: 0
queries_run: 0
queries_deduped: 0
claims_total: 0
claims_verified: 0
claims_insufficient: 0
claims_killed: 0
claims_robust: 0
serendipity_flags: 0
serendipity_unresolved: 0
tree_nodes_total: 0
tree_nodes_good: 0
tree_nodes_pruned: 0
gates_status: {G0: pending, G1: pending, G2: pending, G3: pending, G4: pending, G5: pending, B0: pending}
stage_gates: {S1: pending, S2: pending, S3: pending, S4: pending, S5: pending}
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
- [Finding 1 with claim_id, confidence score, and confounder harness status]
- [Finding 2 with claim_id, confidence score, and confounder harness status]

## Confounder Harness Status
| Claim | Raw | Conditioned | Matched | Status |
|-------|-----|-------------|---------|--------|
| C-xxx | +0.25 | +0.18 | +0.15 | ROBUST |

## Open Questions
1. [Question needing resolution]

## Active Assumptions
- A-xxx: [assumption text] (risk: HIGH/MEDIUM/LOW, cycles untested: N)

## R2 Status
- Last review: [ensemble_id] on [date]
- Open demands: [N] (list if any)
- Next scheduled: [SHADOW in N cycles / FORCED pending]

## Serendipity Flags
- [S-xxx: description, score, status: NOISE|FILE|QUEUE|INTERRUPT]

## Next Action
[Exact next step — must be specific, actionable, and reference the relevant gate]

## Blockers
- [If any — otherwise remove this section]
```

---

## PROGRESS.md Template

Append-only. Never edit previous entries. Newest at top.

```markdown
# Progress Log

## YYYY-MM-DD

### Cycle N — HH:MM [Stage S, Node node-xxx]
- **Action:** [What was done — search query, paper read, data extracted, script run, tree node expanded]
- **Node:** [node_id] (type: [draft|debug|improve|hyper|ablation|serendipity])
- **Result:** [What was found — N papers, specific data, gate result, metric values]
- **Decision:** [What was decided — deep dive, continue, pivot, stop] (DEC-xxx)
- **Claims:** [New: C-xxx, C-yyy | Updated: C-zzz | Killed: C-www]
- **Confounder Harness:** [Claims tested this cycle, results]
- **Gates:** [Passed: G0 | Failed: G2 (reason)]
- **R2:** [None | SHADOW (no issues) | FORCED (demands: ...)]
- **Serendipity:** None / [unexpected discovery, score: N/15]
- **Crystallized:** [Files written this cycle]
```

---

## CLAIM-LEDGER.md Template

See `protocols/evidence-engine.md` for full schema. Quick template:

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
- **Reviewer2:** [ensemble_id or null]
- **Depends on:** [claim_ids]
- **Assumptions:** [assumption_ids]
- **Node:** [tree node where this claim was generated]
- **Created:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD
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
- **Cycles untested:** [N — if > 5 and HIGH risk, R2 Shadow will escalate]
```

---

## TREE-STATE.json Template

```json
{
  "version": "4.0.0",
  "tree_mode": "branching",
  "current_stage": 1,
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
    },
    "node-001": {
      "node_id": "node-001",
      "parent_id": "root",
      "children_ids": [],
      "depth": 1,
      "node_type": "draft",
      "stage": 1,
      "status": "pending",
      "observe_summary": "",
      "think_plan": "",
      "act_description": "",
      "act_artifacts": [],
      "evaluate_result": "",
      "metrics": {},
      "metric_delta": {},
      "claim_ids": [],
      "confidence": 0.0,
      "is_buggy": false,
      "debug_attempts": 0,
      "serendipity_flags": [],
      "gate_results": {},
      "created_at": "YYYY-MM-DDTHH:MM:SSZ"
    }
  },
  "stage_history": [
    {"stage": 1, "entered_at": "YYYY-MM-DDTHH:MM:SSZ", "best_node_at_entry": "root"}
  ],
  "tree_health": {
    "total_nodes": 1,
    "good_nodes": 0,
    "buggy_nodes": 0,
    "pruned_nodes": 0,
    "ratio": 0.0
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
brainstorm_review: ENS-xxx (B0 verdict)
---
```

```markdown
# Research Question

## Question
[Precise, falsifiable research question]

## Hypothesis
[Testable hypothesis — must be specific enough to be proven wrong]

## Null Hypothesis
[What we expect if the effect doesn't exist]

## Predictions
- If true, we should see: [X]
- If false, we should see: [Y]

## Success Criteria
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]

## Data Requirements
- [What data is needed]
- [Where it might come from — specific databases/datasets]
- DATA_AVAILABLE score: [0-1]

## Kill Conditions
- [When to abandon this RQ — be specific]

## Gates Required
- [Which gates apply to this RQ's pipeline]

## Skills Required
- [Which scientific-skills MCP tools will be needed]
```

---

## CONFOUNDER-HARNESS-{claim_id}.md Template (LAW 9)

```markdown
# Confounder Harness: [claim_id]

## Claim
**Text:** [exact claim text]
**Type:** [DATA | INFERENCE]

## Raw Estimate
- **Effect:** [coefficient / OR / difference]
- **Sign:** [positive | negative]
- **Magnitude:** [value]
- **p-value:** [value]
- **CI:** [lower, upper]
- **Method:** [test used]

## Conditioned Estimate
- **Confounders controlled:** [list: n_mm, affinity, PAM, region, guide RE, etc.]
- **Effect:** [coefficient / OR / difference]
- **Sign:** [positive | negative]
- **Magnitude:** [value]
- **p-value:** [value]
- **CI:** [lower, upper]
- **Change from raw:** [% change, sign change?]

## Matched Estimate
- **Matching method:** [propensity score | exact | CEM | paired]
- **Matching variables:** [list]
- **Balance check:** [standardized mean differences < 0.1?]
- **Effect:** [coefficient / OR / difference]
- **Sign:** [positive | negative]
- **Magnitude:** [value]
- **p-value:** [value]
- **CI:** [lower, upper]
- **Change from raw:** [% change, sign change?]

## VERDICT
- [ ] Sign change between raw and conditioned/matched? → **ARTIFACT** (killed)
- [ ] Collapse > 50% between raw and conditioned/matched? → **CONFOUNDED** (downgraded)
- [ ] Survives all three levels? → **ROBUST** (promotable)

**Status:** ARTIFACT | CONFOUNDED | ROBUST
**Date:** YYYY-MM-DD
**Reviewed by:** [R2 ensemble_id or self]
```

---

## REV2-REVIEW-{sprint/ensemble}.md Template

See `protocols/reviewer2-ensemble.md` for full mandatory output schema. File naming:

```
05-reviewer2/YYYY-MM-DD-ensemble-[type]-NNN.md
```

Type: `major` | `batch` | `final` | `pivot` | `pipeline` | `brainstorm` | `shadow`

---

## SPRINT-{n}_REPORT.md Template

```markdown
# Sprint [N] Report

## Findings
[What was discovered this sprint — specific, evidence-based]

## Claims Registered/Updated
| Claim ID | Text | Status | Harness | Confidence |
|----------|------|--------|---------|------------|
| C-xxx | [text] | ROBUST | PASS | 0.XX |

## Attacks (what was tested to break findings)
1. [Attack 1: description, result]
2. [Attack 2: description, result]

## Eliminated (what was killed this sprint)
- C-yyy: [reason — artifact/confounded/contradicted]

## R2 Demands Addressed
- [Demand from previous R2 review → how addressed]

## Serendipity Flags
- [Any unexpected observations, with score]

## Next Sprint Plan
- [What needs testing next]
- [Open R2 demands still pending]
```

---

## Finding Document Template

```yaml
---
type: major|minor
confidence: 0.XX
reviewed: false
reviewer2_id: null
claim_ids: []
node_id: node-xxx
harness_status: pending|robust|confounded|artifact
---
```

```markdown
# [Finding Title — descriptive, not generic]

## Summary
[2-3 sentences: finding + relevance to RQ]

## Claims Extracted
| Claim ID | Text | Type | Confidence | Harness |
|----------|------|------|------------|---------|
| C-xxx | [atomic assertion 1] | DATA | 0.XX | ROBUST |

## Evidence
### Source 1
- **Paper:** [Full title]
- **DOI:** [doi]
- **Relevant quote:** "[exact quote]"
- **Page/Section:** [location]

## Confounder Analysis
[Summary of confounder harness results for main claims]

## Counter-evidence
[Contradicting findings — be honest. If none: "No contradicting evidence found in N papers reviewed"]

## Confidence Justification
E=[score], R=[score], C=[score], K=[score], D=[score]
Weighted: 0.XX
```

---

## Stop Condition Templates

### Successful Exit
```markdown
## Research Conclusion: SUCCESS

**RQ:** [question]
**Answer:** [validated answer — specific, evidence-based]

**Key evidence:**
1. C-xxx: [claim text] (confidence: 0.XX, harness: ROBUST)
2. C-yyy: [claim text] (confidence: 0.XX, harness: ROBUST)

**Confounder Harness Summary:**
| Claim | Raw → Conditioned → Matched | Verdict |
|-------|------------------------------|---------|
| C-xxx | +0.25 → +0.18 → +0.15 | ROBUST |

**Reviewer Ensemble clearance:** [link to final ensemble review]

**Tree Summary:**
- Total nodes: N (good: N, pruned: N)
- Stages completed: S1-S5
- Best node: [node_id] (metric: [value])

**Effort summary:**
- Cycles: N
- Sprints: N
- Papers reviewed: N
- Claims total: N (robust: N, killed: N, confounded: N)
- Confounder harnesses run: N
- Serendipity flags: N (followed up: N)
```

### Negative Exit
```markdown
## Research Conclusion: NEGATIVE

**RQ:** [question]
**Conclusion:** Hypothesis not supported

**Reasons:**
1. [Why — specific evidence, claim_ids, harness results]

**What would change this:**
- [Conditions under which to revisit]

**Value recovered:**
- [Useful findings despite failure]
- [Claims that survived and may be reusable]
```

---

## Decision Log Entry Template

```markdown
## DEC-YYYYMMDD-NNN

**Date:** YYYY-MM-DD HH:MM
**Context:** [What prompted this decision — cycle, gate, review]
**Node:** [tree node if applicable]
**Decision:** [What was decided]
**Justification:** [Why — evidence-based]
**Alternatives considered:**
1. [Alt A] — rejected because [reason]
**Trade-offs accepted:** [What we lose]
**Reversibility:** HIGH | MEDIUM | LOW
**Claims affected:** [C-xxx]
**Gate:** [Which gate, if any]
```

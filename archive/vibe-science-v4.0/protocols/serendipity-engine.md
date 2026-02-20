# Serendipity Engine — Radar Protocol

> Load this when: THINK-brainstorm, CHECKPOINT-serendipity, or any time an unexpected observation needs triage.

## Overview

In v3.5, the Serendipity Engine was a detector. In v4.0, the **Serendipity Radar is an active scanner that runs at EVERY EVALUATE phase**.

Serendipity is NOT just flagging anomalies. It is a three-part process:

1. **DETECTION**: Notice the anomaly (the Serendipity Radar does this)
2. **PERSISTENCE**: Follow the anomaly through 5, 10, 20+ sprints of adversarial testing — this is where most systems fail. They flag the anomaly and move on. Real serendipity requires relentless follow-through.
3. **VALIDATION**: The anomaly survives confounder harness (LAW 9), cross-assay replication, permutation testing, and R2 demolition. Only THEN is it a finding.

**The lesson from the CRISPR case study:** UOT failed (Sprint 3) → Serendipity Engine scored 13/15 → investigation pivoted → 21 sprints of adversarial testing → 4 validated findings across 1.38M sites. The serendipity flag at Sprint 3 was the BEGINNING, not the end. Without the 18 subsequent sprints of falsification, the flag would have been meaningless.

**Implication:** Serendipity flags MUST be tracked with the same persistence as research questions. A serendipity flag that is not followed up within 5 cycles gets escalated. A flag that IS followed up gets the full confounder harness treatment.

---

## Serendipity Radar Protocol (every EVALUATE phase)

At every EVALUATE phase, BEFORE gates, run all 5 scans:

### Scan 1: ANOMALY SCAN
- Does this node's result contradict its parent's pattern?
- Is a metric moving in unexpected direction?
- Did the execution produce unexpected side-output?
- Is the effect size surprisingly large or surprisingly small?
- Did an expected pattern NOT appear?

### Scan 2: CROSS-BRANCH SCAN (tree mode only)
- Compare this node's result with sibling branches
- Pattern visible ONLY when comparing branches? → CROSS-BRANCH SERENDIPITY
- Two branches failing for different reasons that suggest a third approach?
- One branch succeeding where another fails — what's different?
- Metrics anti-correlated across branches? (one goes up when other goes down)

### Scan 3: CONTRADICTION SCAN
- Does this result contradict any claim in the CLAIM-LEDGER?
- Does it contradict a published finding in the knowledge base?
- Does it contradict a widely-held assumption in the field?
- Contradictions are gold — they mean something unexpected is happening

### Scan 4: CONNECTION SCAN
- Does this result connect to a different RQ in the knowledge base?
- Does it echo a pattern from a different domain? (use KNOWLEDGE/patterns.md)
- Unexpected similarity to a seemingly unrelated paper?
- Does it suggest a mechanism not considered in the hypothesis?

### Scan 5: SCORE (0-15)

| Component | Score | Criteria |
|-----------|-------|----------|
| Data availability | 0-3 | 0: no data to follow up. 1: partial. 2: sufficient. 3: rich dataset available |
| Potential impact | 0-3 | 0: trivial. 1: incremental. 2: significant. 3: field-changing if validated |
| Connection strength | 0-3 | 0: very weak. 1: suggestive. 2: multiple connections. 3: strong multi-evidence links |
| Novelty | 0-3 | 0: already known. 1: slight variation. 2: new angle. 3: no prior art found |
| Feasibility | 0-3 | 0: impossible to follow up. 1: requires major effort. 2: achievable. 3: straightforward |

**Total = sum of all 5 components (0-15)**

---

## Serendipity Response Matrix

| Score | Category | Response |
|-------|----------|----------|
| 0-3 | **NOISE** | Log in SERENDIPITY.md with brief description. Move on. |
| 4-7 | **FILE** | Log with full details (what, where, why unusual). Tag for future reference. No immediate action. |
| 8-11 | **QUEUE** | Log, create tagged entry with follow-up plan. Review during next Serendipity Sprint. |
| 12-15 | **INTERRUPT** | **STOP current activity.** Create `serendipity` node in tree. Triage immediately. If confirmed: can spawn new RQ. |

---

## SERENDIPITY.md Format

```markdown
# Serendipity Log

## S-001
- **Date:** YYYY-MM-DD
- **Cycle:** N
- **Node:** node-xxx (or LINEAR cycle N)
- **Category:** NOISE | FILE | QUEUE | INTERRUPT
- **Score:** X/15 (Data: X, Impact: X, Connection: X, Novelty: X, Feasibility: X)
- **Description:** [what was observed — be specific]
- **Scan type:** ANOMALY | CROSS-BRANCH | CONTRADICTION | CONNECTION
- **Follow-up status:** NONE | QUEUED | IN-PROGRESS | VALIDATED | DISMISSED
- **Follow-up node:** [node_id if serendipity node created]
- **Cycles since flag:** N [auto-increment — escalate if > 5 for QUEUE items]
```

---

## Serendipity Sprints

### Regular Sprint
Every 10 cycles, dedicate 1 full cycle to reviewing all QUEUEd serendipity entries:
1. Read SERENDIPITY.md — list all QUEUE items
2. For each QUEUE item: re-assess score with current knowledge
3. Promote to INTERRUPT if score increased (new evidence supports it)
4. Dismiss if score decreased (was an artifact or already explained)
5. Keep in QUEUE if unchanged

### Tree Sprint (BRANCHING mode only)
Every 5 cycles, scan ALL branches for cross-branch patterns:
1. Read tree-visualization.md — identify all active branches
2. Compare metrics across branches: anti-correlations? unexpected similarities?
3. Look for patterns invisible within a single branch
4. Score any cross-branch discoveries using the standard 0-15 formula

### Forced Sprint
If 3+ entries in QUEUE without review → forced sprint next cycle. Cannot be delayed.

---

## Serendipity Nodes in Tree

When serendipity score >= 12 (INTERRUPT):

1. **STOP** current activity immediately
2. **Create** a `serendipity` type node in the tree:
   - Parent: the node that triggered the detection
   - Set observe_summary: description of the anomaly
   - Set think_plan: investigation plan for the unexpected direction
3. **Execute** the serendipity node (full OTAE cycle)
4. **Evaluate** results
5. If the node produces a `good` result → R2 FORCED review
6. If R2 confirms the finding is genuine → two options:
   - **EXTEND**: Add it to current RQ as a secondary finding
   - **SPAWN**: Create new RQ for this direction (user approval required)
7. **CRYSTALLIZE**: Every serendipity node MUST produce a file in `08-tree/nodes/` with:
   - The anomaly observed
   - The score breakdown
   - The follow-up plan
   - The status after investigation

**Serendipity nodes are exempt from stage constraints** — they can be created in any stage.

---

## Cross-Branch Serendipity (v4.0 exclusive)

The most valuable serendipity comes from patterns that are **invisible within a single branch** but emerge when comparing branches:

```
Branch A: "Method X fails on dataset type P"
Branch B: "Method Y fails on dataset type Q"
Cross-branch insight: "Maybe the failure mode depends on data type, not method"
→ This is a new hypothesis that neither branch alone would generate
```

### How to Detect Cross-Branch Patterns

1. **Metric comparison**: Plot metrics from all branches — any anti-correlations?
2. **Error analysis**: Compare error patterns — same errors or different?
3. **Feature importance**: Compare which features matter in each branch — overlap?
4. **Failure mode**: Do branches fail for the same reason or different?
5. **Unexpected success**: Does a "worse" branch succeed on cases where the "best" branch fails?

The tree structure makes this possible. Linear research (v3.5) can never see cross-branch patterns.

---

## Serendipity + R2 Integration

Serendipity and R2 are complementary forces:
- **Serendipity** says: "This is unexpected — investigate it"
- **R2** says: "You investigated it — now prove it's real, not an artifact"

Without serendipity: the system optimizes the original hypothesis and misses discoveries.
Without R2: the system follows every anomaly and publishes artifacts as findings.
Together: serendipity generates candidates, R2 filters them through the confounder harness.

### R2 Obligations for Serendipity Findings
When R2 reviews a serendipity-originated finding, it MUST:
1. Search for known artifacts that could explain the anomaly
2. Demand confounder harness (LAW 9) with domain-specific confounders
3. Check if the "unexpected" finding is actually well-known in the field (prior art search)
4. Verify that the anomaly is reproducible (multi-seed, cross-dataset if applicable)

---

## Serendipity in TEAM Mode

In TEAM mode, the Serendipity Scanner is a dedicated teammate:
- Runs continuously in background (Haiku model for cost efficiency)
- Reads TREE-STATE.json at regular intervals
- Compares branches without being biased by the researcher's current focus
- Reports flags to the Team Lead via shared files
- Lead decides: create serendipity node or queue

In SOLO mode, the radar runs as part of every EVALUATE phase (same checks, same scoring, but within the researcher's context window).

---

## Escalation Rules

| Condition | Action |
|-----------|--------|
| QUEUE item untouched for 5+ cycles | R2 Shadow will flag → escalate to regular sprint |
| 3+ QUEUE items without review | Forced sprint next cycle |
| INTERRUPT score (12+) | Stop current work, create serendipity node |
| Cross-branch pattern detected | Score it → if >= 8: QUEUE, if >= 12: INTERRUPT |
| Serendipity node produces `good` result | R2 FORCED review |
| R2 confirms serendipity finding | Present to user: extend current RQ or spawn new |

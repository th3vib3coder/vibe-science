# Serendipity Engine — Radar Protocol

> **v5.0 IUDEX upgrades**: Structured Seed Schema (Enhancement B), Salvagente integration (Enhancement A), Exploration Budget quantification (Enhancement C). Score range expanded to 0-20 (added Falsifiability dimension).

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

### Scan 5: SCORE (0-20) *(expanded in v5.0)*

| Component | Score | Criteria |
|-----------|-------|----------|
| Data availability | 0-3 | 0: no data to follow up. 1: partial. 2: sufficient. 3: rich dataset available |
| Potential impact | 0-3 | 0: trivial. 1: incremental. 2: significant. 3: field-changing if validated |
| Connection strength | 0-3 | 0: very weak. 1: suggestive. 2: multiple connections. 3: strong multi-evidence links |
| Novelty | 0-3 | 0: already known. 1: slight variation. 2: new angle. 3: no prior art found |
| Feasibility | 0-3 | 0: impossible to follow up. 1: requires major effort. 2: achievable. 3: straightforward |
| Falsifiability | 0-3 | 0: unfalsifiable. 1: vaguely testable. 2: clear test exists. 3: discriminating test identified with expected outcomes |
| Urgency | 0-2 | 0: can wait indefinitely. 1: time-sensitive (data expiring, competing lab). 2: critical window |

**Total = sum of all 7 components (0-20)** *(v4.0 used 5 components for 0-15; v5.0 adds Falsifiability and Urgency)*

---

## Serendipity Response Matrix *(thresholds updated in v5.0 for 0-20 scale)*

| Score | Category | Response |
|-------|----------|----------|
| 0-4 | **NOISE** | Log briefly. Move on. |
| 5-9 | **FILE** | Log with details. Tag for future. |
| 10-14 | **QUEUE** | Create entry with follow-up plan. |
| 15-20 | **INTERRUPT** | **STOP.** Create serendipity node. Triage immediately. |

---

## SERENDIPITY.md Format

```markdown
# Serendipity Log

## S-001
- **Date:** YYYY-MM-DD
- **Cycle:** N
- **Node:** node-xxx (or LINEAR cycle N)
- **Category:** NOISE | FILE | QUEUE | INTERRUPT
- **Score:** X/20 (Data: X, Impact: X, Connection: X, Novelty: X, Feasibility: X, Falsifiability: X, Urgency: X)
- **Description:** [what was observed — be specific]
- **Scan type:** ANOMALY | CROSS-BRANCH | CONTRADICTION | CONNECTION
- **Follow-up status:** NONE | QUEUED | IN-PROGRESS | VALIDATED | DISMISSED
- **Follow-up node:** [node_id if serendipity node created]
- **Cycles since flag:** N [auto-increment — escalate if > 5 for QUEUE items]
```

---

## Structured Seed Schema (v5.0)

In v5.0, free-text seed entries are replaced by **structured, schema-validated seeds**. Every serendipity seed MUST conform to the schema defined in `assets/schemas/serendipity-seed.schema.json`. This ensures that every seed is machine-parseable, traceable, and carries enough information for automated triage and deadline enforcement.

A conforming seed has the following structure:

```yaml
seed_id: SEED-YYYYMMDD-NNN
status: PENDING_TRIAGE | QUEUED | TESTING | KILLED | PROMOTED_TO_CLAIM
source: SCANNER | SALVAGED_FROM_R2 | CROSS_BRANCH | USER
score: 0-20

causal_question: "[one-line: what causes what?]"
falsifiers:     # 3-5 specific ways this could be an illusion
  - "[confounder X]"
  - "[selection bias Y]"
  - "[artifact of method Z]"
discriminating_test: "[one specific test]"
fallback_test: "[backup if primary infeasible]"
expected_value: "[impact] × [probability] × [cost]"

source_run_id: "[run/cycle]"
source_claim_id: "[if salvaged]"
source_branch: "[tree branch]"
pointers: ["[file:line refs]"]

created_cycle: N
triage_deadline_cycle: N+5
last_reviewed_cycle: N
resolution: "[when done]"
```

Key design decisions:
- **`causal_question`** forces the seed author to articulate a mechanism, not just an observation. "Gene X is differentially expressed" is not a seed; "Gene X's differential expression is caused by off-target editing at locus Y" is.
- **`falsifiers`** are mandatory. A seed without falsifiers is unfalsifiable and scores 0 on the Falsifiability dimension.
- **`discriminating_test`** and **`fallback_test`** ensure that every seed has an actionable next step before it enters the queue.
- **`expected_value`** combines impact, probability, and cost to help prioritize across seeds.
- **`triage_deadline_cycle`** enforces the 5-cycle triage window (see Triage Deadline Enforcement below).

Seeds that fail schema validation are rejected and logged as warnings. They do NOT enter the triage queue.

---

## Salvagente Integration (v5.0)

When the R2 Ensemble kills a claim, the claim does not simply disappear. The **Salvagente** (lifebuoy) mechanism determines whether the killed claim should be recycled as a serendipity seed based on the `kill_reason`:

| kill_reason | Salvagente Required | Rationale |
|-------------|-------------------|-----------|
| INSUFFICIENT_EVIDENCE | YES - MANDATORY | Claim may be true but premature |
| CONFOUNDED | YES - MANDATORY | Signal may exist under confounders |
| PREMATURE | YES - MANDATORY | Interesting but needs more work |
| LOGICALLY_FALSE | NO - Skip | Claim is impossible |
| KNOWN_ARTIFACT | NO - Skip | Effect is already explained |

When salvagente is triggered:
1. A new seed is created with `source: SALVAGED_FROM_R2` and `source_claim_id` pointing to the killed claim.
2. The seed inherits the killed claim's falsifiers and adds the R2 kill_reason as an additional falsifier.
3. The seed enters the standard triage queue with `status: PENDING_TRIAGE`.
4. The seed MUST be triaged within 5 cycles (`triage_deadline_cycle = created_cycle + 5`), like any other seed.
5. The seed's `causal_question` is reformulated to address the specific weakness that R2 identified.

This ensures that no promising signal is permanently lost due to insufficient evidence at the time of initial evaluation. The R2 Ensemble remains the ultimate arbiter of claim quality, but the Serendipity Engine acts as a safety net for premature kills.

---

## Exploration Budget (v5.0 — LAW 8 Quantification)

LAW 8 (Explore Before Exploit) previously stated a principle without a measurable floor. In v5.0, **the exploration budget is quantified and enforced at Tree Gate T3**:

- **Metric**: `exploration_ratio = (serendipity + draft + novel-ablation nodes) / total_nodes`
- **WARNING** if `exploration_ratio < 0.20` — the tree is becoming too exploitative
- **FAIL** if `exploration_ratio < 0.10` — the tree has collapsed into pure exploitation; T3 gate blocks until new serendipity nodes are created

This ensures that the investigation tree maintains a healthy balance between refining existing hypotheses (exploitation) and pursuing unexpected signals (exploration). A tree with zero serendipity nodes is, by definition, not doing science — it is doing confirmation.

The exploration budget is checked:
1. At every T3 health check (standard tree gate)
2. At every Serendipity Sprint (regular and forced)
3. Before any PRUNE operation — pruning a serendipity node that would push the ratio below 0.20 requires explicit justification

---

## Triage Deadline Enforcement (v5.0)

Every seed has a `triage_deadline_cycle` set to `created_cycle + 5`. This is a hard deadline. If a seed reaches its deadline without being triaged (i.e., its status is still `PENDING_TRIAGE`):

1. **Warning logged** in PROGRESS.md: `"[SERENDIPITY WARNING] Seed {seed_id} has reached triage deadline without review."`
2. **Automatic escalation**: The seed's status is upgraded to `QUEUED` (minimum). This means it WILL be reviewed at the next Serendipity Sprint, regardless of score.
3. **Systemic failure detection**: If **3 or more seeds** expire without triage in the same investigation, a **Tree Gate T3 warning** is issued. This signals that the investigation is neglecting exploration and may be over-focused on exploitation.

The triage deadline exists because the most common failure mode in serendipity-aware systems is not detection — it is follow-through. Seeds that are detected but never triaged are functionally equivalent to seeds that were never detected. The 5-cycle window is calibrated to be long enough for the current sprint to complete, but short enough that the seed remains contextually relevant.

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
4. Score any cross-branch discoveries using the standard 0-20 formula *(0-15 in v4.0)*

### Forced Sprint
If 3+ entries in QUEUE without review → forced sprint next cycle. Cannot be delayed.

---

## Serendipity Nodes in Tree

When serendipity score >= 15 (INTERRUPT) *(was >= 12 in v4.0)*:

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

## Escalation Rules

| Condition | Action |
|-----------|--------|
| QUEUE item untouched for 5+ cycles | R2 Shadow will flag → escalate to regular sprint |
| 3+ QUEUE items without review | Forced sprint next cycle |
| INTERRUPT score (15+) | Stop current work, create serendipity node |
| Cross-branch pattern detected | Score it → if >= 10: QUEUE, if >= 15: INTERRUPT |
| Serendipity node produces `good` result | R2 FORCED review |
| R2 confirms serendipity finding | Present to user: extend current RQ or spawn new |

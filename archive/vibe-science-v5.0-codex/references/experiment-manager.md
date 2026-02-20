# 5-Stage Experiment Manager

> Load this when: THINK-experiment, CHECKPOINT-stage, stage transitions, or planning computational research.

## Overview

Adapted from AI-Scientist-v2's 4-stage manager. We add Stage 5 (Synthesis & Review). The Experiment Manager controls which stage the tree is in, what node types are allowed, and when to advance.

---

## Stage Definitions

| Stage | Name | Goal | Max Iterations | Primary Node Types |
|-------|------|------|---------------|-------------------|
| **1** | Preliminary Investigation | First working experiment or initial literature scan | 20 | `draft` |
| **2** | Hyperparameter Tuning | Optimize parameters of best approach | 12 | `hyperparameter`, `improve` |
| **3** | Research Agenda | Explore creative variants, sub-questions | 12 | `draft` (variants) |
| **4** | Ablation & Validation | Validate contribution of each component + multi-seed | 18 | `ablation`, `replication` |
| **5** | Synthesis & Review | Final R2 ensemble, conclusion, reporting | 5 | none (no new experiments) |

**Total maximum iterations**: 67 (but most RQs complete in 30-40 nodes)

---

## Stage 1: Preliminary Investigation

**Goal:** Get at least one working experiment with valid metrics.

**Allowed node types:** `draft`, `debug`, `serendipity`

**Activities:**
- Try different experimental approaches (each as a `draft` node)
- Aim for breadth: at least 2-3 different approaches (LAW 8)
- Don't optimize yet — find WHAT works, not the best version

**Advance when (Gate S1):**
- At least 1 good node with valid metrics exists
- Metrics are meaningful (not trivially achieved — compare to random baseline)
- Multi-seed validation of best node (minimum 2 seeds)
- R2 batch review at transition (BLOCKING)

**Fail actions:**
- No good nodes after 15 iterations → consider pivoting approach or revisiting Phase 0
- All nodes buggy → investigate: is the problem the approach or the data?
- Metrics trivial (e.g., accuracy = class proportion) → need harder evaluation

---

## Stage 2: Hyperparameter Tuning

**Goal:** Optimize the best Stage 1 approach through parameter variation.

**Allowed node types:** `hyperparameter`, `improve`, `debug`, `serendipity`

**Activities:**
- Take the best Stage 1 node as starting point
- Systematic parameter variation (one parameter at a time if possible)
- At least 2 different configurations tested
- At least 1 ablation dimension tested (can we simplify?)

**Advance when (Gate S2):**
- Best metric confirmed improved over Stage 1 best
- Improvement tested on 2+ configurations (not just 1 lucky config)
- Ablation of at least 1 key hyperparameter completed
- R2 batch review at transition

**Fail actions:**
- No improvement over Stage 1 → consider that Stage 1 approach may be suboptimal, try different approach
- Single config improved → test at least 1 more variation before advancing
- Overfitting suspected → add cross-validation, reduce model complexity

---

## Stage 3: Research Agenda

**Goal:** Explore creative variants, answer sub-questions, investigate secondary hypotheses.

**Allowed node types:** `draft` (variants), `improve`, `debug`, `serendipity`

**Activities:**
- Explore creative variants of the best approach
- Answer sub-questions generated during Stage 1-2
- Test alternative hypotheses or alternative data splits
- Follow up on queued serendipity items

**Advance when (Gate S3):**
- All planned sub-experiments attempted or time budget exceeded
- Results documented for each sub-experiment
- At least 3 draft nodes explored (LAW 8: explore before exploit)
- R2 batch review at transition

**Fail actions:**
- Planned experiments remaining → complete or document why skipped
- < 3 approaches explored → create additional draft nodes
- Time budget exceeded with work remaining → prioritize and document what was skipped

---

## Stage 4: Ablation & Validation

**Goal:** Validate the contribution of each component. Multi-seed. Cross-dataset if applicable.

**Allowed node types:** `ablation`, `replication`, `debug`, `serendipity`

**Activities:**
- Ablate each key component: remove one at a time, measure impact
- Multi-seed validation: minimum 3 seeds for best configuration
- Cross-dataset/cross-assay validation if generalizable claims are made
- Confounder harness (LAW 9) for ALL promoted claims

**Advance when (Gate S4):**
- All key components ablated, contribution quantified
- Multi-seed validation complete (minimum 3 seeds for best config)
- Cross-dataset/cross-assay validation attempted (if generalizable claims)
- Confounder harness run for ALL promoted claims (LAW 9)
- R2 batch review at transition

**Fail actions:**
- Missing ablations → complete ablation matrix before advancing
- Single seed → run additional seeds
- No cross-validation → attempt or document why impossible
- Confounder harness missing → run harness before advancing (LAW 9) — this is BLOCKING

---

## Stage 5: Synthesis & Review

**Goal:** Final R2 ensemble review, conclusion synthesis, report writing.

**Allowed node types:** none (no new experiments). Only documentation and review.

**Activities:**
- Synthesize all findings into coherent narrative
- Run final R2 full ensemble review (all 4 reviewers, double-pass)
- Verify all claims are consistent with evidence
- Produce final report/paper draft via writeup-engine.md
- Update knowledge base with reusable learnings
- Create final tree visualization snapshot

**Complete when (Gate S5):**
- R2 full ensemble verdict: ACCEPT
- Gate D2 (RQ Conclusion) PASS
- All claims have status VERIFIED or CONFIRMED (no UNVERIFIED in conclusion)
- All confounder harnesses completed and documented (LAW 9)
- Tree visualization final snapshot saved
- Knowledge base updated
- All artifacts crystallized to files (LAW 10)

**Fail actions:**
- R2 not ACCEPT → address demands, re-review (may require going back to Stage 4)
- D2 not PASS → fix specific D2 failures
- UNVERIFIED claims → either verify or remove from conclusion

---

## Stage Transition Protocol

At the end of each stage:

```
1. Multi-seed validation of best node (2 seeds for S1, 3+ for S2-S4)
2. Check stage gate (S1-S5)
3. If PASS:
   a. R2 batch review at transition (BLOCKING)
   b. If R2 clears: advance stage
   c. Set best node as conceptual root for next stage
   d. Update TREE-STATE.json: current_stage + 1
   e. Add to stage_history in TREE-STATE.json
   f. Log in 08-tree/stage-transitions.log
   g. Update 08-tree/best-nodes.md
4. If FAIL:
   a. Remain in current stage
   b. Address specific failure points
   c. Re-check gate
```

---

## When Stages Don't Apply

Not all research follows all 5 stages:

| RQ Type | Stages Used | Rationale |
|---------|-------------|-----------|
| Literature-only | 1 → 5 | Skip 2-4: no computational experiments to tune/ablate |
| Analysis-only | 1 → 2 → 4 → 5 | Skip 3: no creative agenda, just pipeline optimization + validation |
| Full computational | 1 → 2 → 3 → 4 → 5 | All stages |
| Serendipity-driven | 1 → 3 → 4 → 5 | Skip 2: serendipity exploration replaces tuning |

The stage mapping is set during Phase 0 COMMIT and stored in RQ.md.

---

## Stage-Aware Deviation Rules

| Situation | Stage | Action |
|-----------|-------|--------|
| Serendipity INTERRUPT (score >= 12) | Any | Create serendipity node regardless of stage |
| R2 VETO on entire approach | Any | Can force return to Stage 1 or Phase 0 |
| All Stage 1 nodes fail | 1 | Revisit Phase 0 hypothesis |
| No improvement in Stage 2 | 2 | Consider Stage 1 approach was wrong |
| Time budget exceeded | Any | Advance to Stage 5 with whatever is available |
| Cross-assay fails in Stage 4 | 4 | Downgrade generalizable claims, don't kill validated local claims |

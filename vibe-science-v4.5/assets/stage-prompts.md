# Stage Prompts — Stage-Specific Node Generation Guidance

> Load this when: creating nodes in a specific stage, to ensure the node type and plan match the stage's goals.

## Overview

Each stage has a different focus. This file provides stage-specific guidance for generating node plans during the THINK phase. The correct node types and planning strategies depend on which stage the tree is currently in.

---

## Stage 1: Preliminary Investigation

**Focus:** Find WHAT works. Breadth over depth.

**Node planning guidance:**
- Create `draft` nodes with DIFFERENT approaches (not minor variations)
- Each draft should represent a meaningfully different strategy
- Aim for at least 2-3 drafts before committing to one approach
- Compare to random baseline (sanity check: are metrics non-trivial?)
- Don't optimize yet — if it works at all, it's a win for Stage 1

**THINK prompt:**
```
Stage 1: Preliminary Investigation.
Goal: Find at least one working approach with valid metrics.
Question: What are 2-3 fundamentally different ways to approach this problem?
For each: what makes it different? What data does it need? What metric will I use?
Choose the most promising one to implement as the next draft node.
```

**Common mistakes in Stage 1:**
- Optimizing too early (that's Stage 2)
- Only trying one approach (violates LAW 8: Explore Before Exploit)
- Accepting trivial metrics without baseline comparison
- Not documenting failed approaches (failures are data)

---

## Stage 2: Hyperparameter Tuning

**Focus:** Optimize the BEST Stage 1 approach. Depth on what works.

**Node planning guidance:**
- Take the best Stage 1 node as starting point
- Create `hyperparameter` nodes that change ONE parameter at a time (when possible)
- Create `improve` nodes that modify the approach (algorithm change, feature engineering)
- Test at least 2 different configurations before claiming improvement
- Include at least 1 ablation dimension (can we simplify?)

**THINK prompt:**
```
Stage 2: Hyperparameter Tuning.
Goal: Improve the best Stage 1 approach.
Starting from: [best Stage 1 node, metric value].
Question: What single parameter change would most likely improve the metric?
What is the search space? What would I learn from each variation?
Plan the next hyperparameter or improve node.
```

**Common mistakes in Stage 2:**
- Grid searching when one-at-a-time is sufficient
- Not tracking what was tried (duplicate configurations)
- Overfitting to the validation metric
- Not checking if improvement is stable across seeds

---

## Stage 3: Research Agenda

**Focus:** Explore creative variants, answer sub-questions.

**Node planning guidance:**
- Create `draft` nodes with creative variants of the best approach
- Address sub-questions that emerged during Stage 1-2
- Follow up on queued serendipity items
- Test alternative hypotheses or alternative data splits
- This is the exploratory stage — breadth is welcome

**THINK prompt:**
```
Stage 3: Research Agenda.
Goal: Explore creative variants and answer sub-questions.
Best approach so far: [best node, metric].
Sub-questions: [list from PROGRESS.md and R2 reviews].
Question: What creative variant or sub-question would add the most value?
What unexpected direction might yield a discovery?
Plan the next draft node.
```

**Common mistakes in Stage 3:**
- Just re-running Stage 2 (this stage is for NEW ideas)
- Ignoring queued serendipity flags
- Not documenting why variants were chosen
- Skipping this stage entirely (misses valuable exploration)

---

## Stage 4: Ablation & Validation

**Focus:** Validate. Ablate. Replicate. Prove it's real.

**Node planning guidance:**
- Create `ablation` nodes: remove one component at a time from the best node
- Create `replication` nodes: same code, different seeds (minimum 3 seeds)
- Run confounder harness (LAW 9) for every promoted claim
- Attempt cross-dataset/cross-assay validation if generalizable claims are made
- This is the rigor stage — no new features, only validation

**THINK prompt:**
```
Stage 4: Ablation & Validation.
Goal: Prove the findings are real, not artifacts.
Best node: [node_id, metrics].
Components to ablate: [list key components].
Question: Which component removal would be most informative?
Which claim most needs confounder harness validation?
Plan the next ablation or replication node.
```

**Common mistakes in Stage 4:**
- Skipping ablation ("it works, why remove anything?")
- Only 1 seed ("it works once, that's enough")
- Not running confounder harness (LAW 9 — MANDATORY)
- Claiming generalizability without cross-dataset test

---

## Stage 5: Synthesis & Review

**Focus:** Conclude. Write. Review. No new experiments.

**Node planning guidance:**
- NO new experiment nodes in Stage 5
- Focus: synthesize findings, run final R2 review, produce writeup
- Dispatch to writeup-engine.md for paper drafting
- Update knowledge base with reusable learnings
- Create final tree visualization snapshot

**THINK prompt:**
```
Stage 5: Synthesis & Review.
Goal: Produce final output — paper, report, knowledge base update.
Verified claims: [list from CLAIM-LEDGER with ROBUST/CONFIRMED status].
Killed claims: [list with reasons].
R2 status: [ACCEPT needed for S5 exit].
Question: What needs to be written first? What R2 demands are still open?
Plan the synthesis steps.
```

**Common mistakes in Stage 5:**
- Adding new experiments ("just one more test")
- Overclaiming in prose beyond what R2 approved
- Omitting negative results (killed claims add credibility)
- Rushing to finish without R2 final clearance

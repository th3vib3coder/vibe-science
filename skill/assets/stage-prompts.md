# Stage Prompts — Stage-Specific Node Generation Guidance

> Load this when: creating nodes in a specific stage, to ensure the node type and plan match the stage's goals.

## Stage 1: Preliminary Investigation

**Focus:** Find WHAT works. Breadth over depth.

**Node planning guidance:**
- Create `draft` nodes with DIFFERENT approaches (not minor variations)
- Each draft should represent a meaningfully different strategy
- Aim for at least 2-3 drafts before committing (LAW 8)
- Compare to random/trivial baseline (sanity check)
- Don't optimize yet — if it works at all, it's a win for Stage 1

**THINK prompt:**
```
Stage 1: Preliminary Investigation.
Goal: Find at least one working approach with valid metrics.
Question: What are 2-3 fundamentally different ways to approach this problem?
For each: what makes it different? What data does it need? What metric will I use?
Choose the most promising one to implement as the next draft node.
```

**v5.5 gates:** DD0 (document data columns), DQ1 (after extraction)

---

## Stage 2: Hyperparameter Tuning

**Focus:** Optimize the BEST Stage 1 approach. Depth on what works.

**Node planning guidance:**
- Take the best Stage 1 node as starting point
- Create `hyperparameter` nodes that change ONE parameter at a time
- Create `improve` nodes that modify the approach
- Test at least 2 configurations before claiming improvement

**THINK prompt:**
```
Stage 2: Hyperparameter Tuning.
Goal: Improve the best Stage 1 approach.
Starting from: [best Stage 1 node, metric value].
Question: What single parameter change would most likely improve the metric?
Plan the next hyperparameter or improve node.
```

**v5.5 gates:** DQ2 (after training), DC0 (at transition)

---

## Stage 3: Research Agenda

**Focus:** Explore creative variants, answer sub-questions.

**Node planning guidance:**
- Create `draft` nodes with creative variants
- Address sub-questions from Stage 1-2
- Follow up on queued serendipity items
- This is the exploratory stage — breadth is welcome

**THINK prompt:**
```
Stage 3: Research Agenda.
Goal: Explore creative variants and answer sub-questions.
Best approach so far: [best node, metric].
Question: What creative variant or sub-question would add the most value?
Plan the next draft node.
```

**v5.5 gates:** L-1 (before new directions), DQ1 (after new extractions)

---

## Stage 4: Ablation & Validation

**Focus:** Validate. Ablate. Replicate. Prove it's real.

**Node planning guidance:**
- Create `ablation` nodes: remove one component at a time
- Create `replication` nodes: same code, different seeds (minimum 3)
- Run confounder harness (LAW 9) for every promoted claim
- Attempt cross-dataset validation if generalizable claims are made

**THINK prompt:**
```
Stage 4: Ablation & Validation.
Goal: Prove the findings are real, not artifacts.
Best node: [node_id, metrics].
Components to ablate: [list key components].
Question: Which component removal would be most informative?
Plan the next ablation or replication node.
```

**v5.5 gates:** DQ3 (after calibration), DQ4 (after findings), DC0 (at transition)

---

## Stage 5: Synthesis & Review

**Focus:** Conclude. Write. Review. No new experiments.

**Node planning guidance:**
- NO new experiment nodes in Stage 5
- Focus: synthesize findings, run final R2 review, produce writeup
- Update knowledge base with reusable learnings
- Create final tree visualization snapshot

**THINK prompt:**
```
Stage 5: Synthesis & Review.
Goal: Produce final output.
Verified claims: [list from CLAIM-LEDGER].
R2 status: [ACCEPT needed for S5 exit].
Question: What needs to be written first? What R2 demands are still open?
Plan the synthesis steps.
```

**v5.5 gates:** DQ4 (final number check), SSOT sync_check, DC0 (final compliance)

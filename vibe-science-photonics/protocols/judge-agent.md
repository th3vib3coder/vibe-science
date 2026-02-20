# Judge Agent (R3) Protocol v5.0

Pillar 2 extension of Vibe Science v5.0 — IUDEX. A third agent meta-reviews R2's review quality, not the claims themselves. R3 answers the question: "Who reviews the reviewer?"

**Rationale**: Huang et al. (ICLR 2024) prove LLMs cannot self-correct reasoning without external feedback. R2 can rubber-stamp, anchor on researcher framing, or satisfy checklists perfunctorily. R3 provides structural accountability by scoring R2's review on a rubric with explicit criteria. Brevity is not penalized; specificity is rewarded (PMC 2024 — length bias in meta-review).

**Activation**: FORCED reviews only. Not BATCH, not SHADOW. Cost management — R3 protects the highest-stakes decisions (major findings, stage transitions, conclusions).

**Permission model**: R3 is READ-ONLY on all artifacts. R3 produces a judge report. The Orchestrator decides action.

---

## R3 Rubric

Six dimensions, each scored 0-3. Total possible: 18 points.

| Dimension | 0 (Absent) | 1 (Superficial) | 2 (Adequate) | 3 (Exemplary) |
|-----------|-----------|-----------------|--------------|---------------|
| **Specificity** | No specific references to claims or evidence | References claims by ID but critique is generic | Identifies specific flaws with evidence locations | Pinpoints exact lines, values, or steps that fail |
| **Counter-evidence search** | No external search performed | Searched but only confirming sources | Searched for contradictions in 1 database | Searched 2+ databases for contradictions, prior art, known artifacts |
| **Confounder analysis** | No confounder discussion | Mentions confounders generically | Identifies specific confounders for specific claims | Demands and designs specific tests for each confounder |
| **Falsification demand** | No falsification tests requested | Generic "more testing needed" | Specific tests requested for major claims | Specific tests with expected outcomes if claim is false |
| **Independence** | Review echoes researcher's framing | Some original analysis but mostly follows researcher's structure | Independent structure with some original observations | Completely independent analysis, discovers issues researcher did not anticipate |
| **Escalation** | No demands or actions | Generic demands without deadlines | Specific demands with priorities | Specific demands with deadlines, clear PASS/FAIL criteria |

**Rubric reference file**: `assets/judge-rubric.yaml`

---

## Scoring Rules

| Total Score | Verdict | Meaning |
|-------------|---------|---------|
| >= 12 | **PASS** | R2's review is accepted. Adequate or better on all dimensions. |
| 9-11 | **WEAK PASS** | Review accepted. R2 warned to increase rigor in the next round. |
| < 9 | **FAIL** | Review rejected. R2 must redo the FORCED review with R3's specific feedback. |

### Anti-Gaming Rule

An RCT on peer review quality (PMC 2024) shows that unnecessarily longer reviews are rated as higher quality even by meta-reviewers — a length bias. R3 MUST NOT penalize brevity. The rubric dimensions reward **specificity and evidence**, not verbosity.

A 3-line review that identifies a specific fatal flaw with evidence scores higher than a 3-page review that restates concerns generically. Scoring is based on what R2 **did** (searched, tested, pinpointed), not how much R2 **wrote**.

---

## J0 Gate Specification

Gate J0 — Judge Gate. New in v5.0.

```
J0 PASS requires:
  [ ] R3 rubric total >= 12
  [ ] No dimension scored 0 (all aspects addressed)
  [ ] Counter-evidence search dimension >= 2 (R2 must actually search)

J0 FAIL actions:
  - Total < 12 --> R2 must redo FORCED review with R3's feedback attached
  - Any dimension = 0 --> Specific feedback provided, redo required
  - Counter-evidence search < 2 --> R2 must perform real database searches before resubmission
  - 2+ consecutive J0 failures --> ESCALATE to human

J0 is NOT schema-enforced (rubric-based, not artifact-based).
```

---

## SOLO Mode Specification

In SOLO mode, R3 operates in the same context as researcher and R2. To preserve independence:

1. **Blind input**: R3 receives ONLY R2's ensemble report and the claims under review. NOT the researcher's justifications, methodology descriptions, or confidence computations. Same blind principle as BFP Phase 1.

2. **Mechanical rubric application**: Each dimension is scored against explicit criteria (the rubric table above), not "gut feeling." The structured scoring (0-3 per dimension, concrete examples for each level) acts as the independence barrier.

3. **Self-consistency N=2**: R3 scores the review twice using different sampling. The **lower** total score wins. This compensates for the "be generous to yourself" bias inherent in same-context evaluation.

4. **Monitoring**: If J0 FAIL rate in SOLO mode is consistently > 50% higher than in TEAM mode (measured over 10+ sessions), escalate to human. The SOLO R3 may not be providing real scrutiny.

---

## Protocol Steps

```
JUDGE AGENT (R3) PROTOCOL

WHEN:   After every FORCED R2 review completes and passes V0
        (not BATCH, not SHADOW — cost management)
WHO:    Separate context from both researcher and R2.
        In SOLO mode: same context, blind input (see SOLO spec above).
INPUT:  R2's ensemble report (YAML) + claims under review (from CLAIM-LEDGER.md)
        Explicitly EXCLUDED: researcher's justifications, methodology, confidence computations
OUTPUT: J0 gate verdict + rubric scores + specific feedback to R2

STEPS:

1. LOAD R2 REPORT
   Read the R2 ensemble report (YAML output from 05-reviewer2/).
   Verify the report exists and is non-empty.

2. LOAD CLAIMS
   Read the claims under review from CLAIM-LEDGER.md.
   Cross-reference claim_ids in R2's report against the ledger.

3. SCORE EACH DIMENSION (0-3)
   For each of the 6 rubric dimensions:
   a. Identify specific evidence in R2's report that maps to this dimension.
   b. Score 0-3 using the rubric criteria (see table above).
   c. Record the evidence that justifies the score.
   Rule: if no evidence found for a dimension, score = 0.

4. COMPUTE TOTAL
   total = sum of 6 dimension scores (range: 0-18).
   In SOLO mode: repeat steps 3-4 with different sampling.
   Take the LOWER of the two totals.

5. EVALUATE J0 GATE
   Check all three conditions:
   a. total >= 12
   b. No dimension scored 0
   c. Counter-evidence search >= 2
   If ALL pass --> J0 PASS.
   If ANY fail --> J0 FAIL.
   If total 9-11 and conditions (b) and (c) pass --> J0 WEAK PASS.

6. WRITE JUDGE REPORT
   Output file: .vibe-science/RQ-xxx/05-reviewer2/judge-reports/J-YYYYMMDD-NNN.yaml
   Contents:
     judge_report_id: J-YYYYMMDD-NNN
     ensemble_reviewed: ENS-YYYYMMDD-NNN
     mode: SOLO | TEAM
     dimensions:
       specificity: {score: N, evidence: "..."}
       counter_evidence_search: {score: N, evidence: "..."}
       confounder_analysis: {score: N, evidence: "..."}
       falsification_demand: {score: N, evidence: "..."}
       independence: {score: N, evidence: "..."}
       escalation: {score: N, evidence: "..."}
     total: N
     solo_scores: [N1, N2]          # SOLO mode only — both samples
     verdict: PASS | WEAK_PASS | FAIL
     feedback_to_r2: "..."          # Specific, actionable — which dimensions failed and why
     consecutive_failures: N         # Track for escalation

7. UPDATE PROGRESS.MD
   Append: "J0 check: R3 scored R2 review ENS-xxx at {total}/18 — {verdict}"
   If FAIL: append specific dimensions that failed.
   If 2+ consecutive failures: append ESCALATION notice.
```

---

## Cost Management

R3 runs ONLY on FORCED reviews. This is a deliberate cost-containment decision.

| Review Mode | R3 Activated? | Rationale |
|-------------|---------------|-----------|
| **FORCED** | YES | Major findings, stage transitions, conclusions — highest stakes |
| **BATCH** | NO | Minor findings batched — lower risk, cost not justified |
| **SHADOW** | NO | Passive surveillance — R3 overhead not warranted |

FORCED reviews occur approximately 5-10 times per RQ. Running R3 on every review would triple token costs for diminishing returns.

---

## Integration Points

- **V0 gate**: R3 runs AFTER V0 (Seeded Fault Injection check) passes. If V0 fails, R2 re-reviews before R3 evaluates.
- **BFP**: R3's "Independence" dimension explicitly scores whether R2 used the Blind-First Pass effectively. If Phase 1 concerns evaporate in Phase 2 without being addressed, Independence score drops.
- **Circuit Breaker**: If R2 and R3 enter a loop (R3 rejects, R2 redoes, R3 rejects again), the 2-consecutive-failures escalation prevents deadlock.
- **Permission model**: R3 cannot modify R2's report or the claim ledger. R3 produces a read-only judge report. The Orchestrator applies the verdict.
- **Salvagente**: R3 does not evaluate salvaged seeds. Salvagente is R2's output, not subject to meta-review.

---

## Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Judge rubric definition | `assets/judge-rubric.yaml` | Machine-readable rubric criteria |
| Judge reports | `.vibe-science/RQ-xxx/05-reviewer2/judge-reports/` | Per-review R3 assessments |
| PROGRESS.md entries | `.vibe-science/RQ-xxx/PROGRESS.md` | J0 outcome logging |

---

## Why R3, Not R4

Data Processing Inequality: in a text-only chain (R2 reads claims, R3 reads R2's review, R4 reads R3's report), each layer cannot increase information about the original data. R4 would be noise plus cost. Width over depth: add more R2 reviewers in parallel (self-consistency N=3), not more meta-review layers. Standard peer review uses at most Reviewers + Meta-reviewer (Area Chair). Two layers is the norm; three is exceptional.

# Reviewer 2 Ensemble — Reference (ATOM-11)

> Version: v5.5 | Domain-agnostic | 4 reviewers, 7 modes, schema-enforced verdicts

## 1. R2 Ensemble Composition

The ensemble consists of four domain-agnostic reviewers. Each owns a non-overlapping
concern. Together they cover methodology, statistics, domain validity, and engineering.

| Reviewer       | Concern                  | Focus                                                        |
|----------------|--------------------------|--------------------------------------------------------------|
| **R2-Methods** | Experimental design      | Study design flaws, control groups, confound sources, causal claims without causal design |
| **R2-Stats**   | Statistical validity     | Multiple testing, effect-size inflation, p-hacking, calibration, distributional assumptions |
| **R2-Domain**  | Domain-specific rigour   | Loads checklist from `domain-config.yaml` if present; otherwise applies generic domain checks (measurement validity, construct operationalisation, known artifacts in the field) |
| **R2-Eng**     | Computational integrity  | Data leakage, seed fixation, pipeline determinism, resource bounds, numerical stability |

**R2-Domain behaviour:** On initialisation, R2-Domain searches for `domain-config.yaml`
in the project `.vibe-science/` directory. If found, it loads domain-specific checklists
(e.g., instrument calibration checks for physics, diagnostic criteria for medicine).
If absent, it falls back to a generic checklist: (1) measurement validity,
(2) construct operationalisation, (3) known field-specific artifacts, (4) standard
reporting requirements, (5) terminology consistency with established definitions.

---

## 2. R2 System Prompt Behavioral Requirements

Every R2 sub-agent receives the following behavioral directives in its system prompt.
These are non-negotiable and override any cooperative tendencies.

1. **Assume Wrong.** Default disposition: every claim is incorrect until proven otherwise.
   Do NOT congratulate. Do NOT say "good progress" or "interesting finding."
2. **Demolition-Oriented Search.** Actively search for: prior art that contradicts the
   claim, known artifacts that produce the same signal, confounders not controlled for,
   and alternative explanations that are simpler.
3. **Demand Confounder Harness.** Every quantitative claim MUST pass the three-stage
   harness: raw -> conditioned -> matched. Sign change = ARTIFACT (kill). Collapse
   >50% = CONFOUNDED (downgrade). Survives = ROBUST (promotable). No harness = no claim.
4. **Anti-Premature-Closure.** Never declare "all tests complete." Each review pass must
   be MORE demanding than the previous one. If you run out of objections, you have not
   looked hard enough.
5. **Escalate Scrutiny.** Claims with higher stated confidence receive MORE scrutiny,
   not less. A claim at confidence 0.9 should trigger the hardest battery of tests.

---

## 3. Activation Modes

Seven modes govern when and how R2 is invoked.

| Mode          | Trigger                                  | Blocking | Sub-agent type | Description |
|---------------|------------------------------------------|----------|----------------|-------------|
| **BRAINSTORM**| Researcher requests early feedback       | No       | R2-INLINE      | Lightweight critique on draft hypotheses. Advisory only. |
| **FORCED**    | Gate G3 (pre-synthesis) or orchestrator  | **Yes**  | R2-DEEP        | Full adversarial review with SFI + BFP. Blocks pipeline. |
| **BATCH**     | Accumulated >= 5 unreviewed claims       | **Yes**  | R2-DEEP        | Bulk review. Each claim scored independently. |
| **SHADOW**    | Every N cycles (configurable, default 3) | No       | R2-INLINE      | Silent monitoring. Flags raised but do not block. |
| **VETO**      | R2 issues VETO on a specific claim       | **Yes**  | R2-DEEP        | Hard stop. Claim cannot proceed until VETO resolved or overridden by user. |
| **REDIRECT**  | R2 proposes alternative investigation    | No       | R2-INLINE      | Suggests pivot. Researcher must acknowledge; not auto-blocking. |
| **INLINE**    | Every finding, before CLAIM-LEDGER write | **Yes**  | R2-INLINE      | v5.5 addition. 7-point checklist per finding. Fast, synchronous. |

### INLINE Mode (v5.5)

INLINE review is triggered automatically before any finding is recorded in the
CLAIM-LEDGER. The researcher runs the 7-point checklist (Section 5) and the result
is appended to the finding record. A finding that fails any mandatory check is blocked
from the ledger until remediated.

## 4. FORCED Review Path (v5.0)

The FORCED path is the highest-rigour review. It proceeds through six stages:

```
SFI --> BFP Phase 1 (blind) --> Full Review Phase 2 --> V0 --> R3/J0 --> SVG
```

**Stage-by-stage:**

1. **SFI (Seeded Fault Injection).** The orchestrator injects 1-3 known faults into the
   claim set from `fault-taxonomy.yaml`. R2 does not know which claims are seeded. If R2
   misses a seeded fault, the entire review is INVALID and must be re-run.

2. **BFP Phase 1 (Blind-First Pass).** R2 receives claims WITHOUT researcher
   justifications. R2 forms independent assessments based solely on the claim text,
   evidence chain, and its own searches. This breaks anchoring bias.

3. **Full Review Phase 2.** R2 receives the complete context: researcher justifications,
   intermediate artifacts, code, logs. R2 refines or revises its Phase 1 assessments.
   Any assessment that flips between Phase 1 and Phase 2 must be explicitly annotated.

4. **V0 (Verdict Zero).** Each reviewer produces a structured verdict (Section 9).
   Verdicts are merged into a single ensemble report with per-reviewer scores.

5. **R3/J0 (Judge Agent).** R3 receives ONLY the ensemble report and claims (NOT the
   researcher's justifications — blind principle). R3 scores the review on the 6-dimension
   rubric: Specificity, Independence, Counter-Evidence, Depth, Constructiveness,
   Consistency. R3 cannot modify R2's report; it only produces a meta-score.

6. **SVG (Schema-Validated Gate).** The verdict artifact is validated against
   `r2-verdict.schema.json`. Prose claims of completion are ignored. Only schema
   validation passes the gate.

## 5. INLINE 7-Point Checklist (v5.5)

Every finding must pass this checklist before entering the CLAIM-LEDGER. Each item is
scored PASS / FAIL / N-A. Two or more FAILs block the finding.

| #  | Check                      | Question                                                              |
|----|----------------------------|-----------------------------------------------------------------------|
| 1  | **Numbers Match Source**    | Do all reported numbers trace back to a specific computation output?  |
| 2  | **Sample Size**            | Is the sample size stated, adequate, and not inflated by duplication? |
| 3  | **Alternatives Considered**| Were at least 2 alternative explanations for the result evaluated?    |
| 4  | **Prior Art**              | Was a literature/web search performed to check if this is already known? |
| 5  | **Confounder Risk**        | Were potential confounders identified and either controlled or noted? |
| 6  | **Reproducible**           | Can the result be reproduced from the saved artifacts + code + seeds? |
| 7  | **Terminology Consistent** | Does the finding use terms consistent with established definitions?   |

The checklist result is stored as a YAML block in the finding record:

```yaml
inline_review:
  checklist:
    numbers_match_source: PASS
    sample_size: PASS
    alternatives_considered: PASS
    prior_art: PASS
    confounder_risk: FAIL  # reason: batch effect not assessed
    reproducible: PASS
    terminology_consistent: PASS
  pass_count: 6
  fail_count: 1
  blocked: false  # blocked if fail_count >= 2
```

---

## 6. Multi-Agent Delegation

### Spawning R2 as a Sub-Agent

In Claude Code environments, R2 reviewers are spawned as sub-agents via the Task tool. Each
reviewer receives: (a) the R2 system prompt with behavioral requirements (Section 2),
(b) its specific concern scope (Section 1), and (c) the claims to review.

**Important:** R2 sub-agents do NOT have web search permissions. All literature searches,
PubMed queries, and web fetches must be performed by the orchestrator or researcher
BEFORE packaging the review context for R2.

### R2-DEEP vs R2-INLINE

| Property          | R2-DEEP                          | R2-INLINE                        |
|-------------------|----------------------------------|----------------------------------|
| Model             | claude-opus-4-6                  | claude-sonnet-4-6                |
| Reasoning effort  | High                             | Medium                           |
| Used in modes     | FORCED, BATCH, VETO              | BRAINSTORM, SHADOW, REDIRECT, INLINE |
| Token budget      | Up to 16k output                 | Up to 4k output                  |
| Full SFI/BFP      | Yes                              | No                               |
| Checklist scope   | All 4 reviewers, full verdict    | Single-reviewer or 7-point only  |

When operating in SOLO mode (single-agent, no sub-agent infrastructure), R2 functions
are executed inline by the main agent. The agent must explicitly switch to the R2
disposition (Section 2) and document the switch in the logbook.

---

## 7. Behavioral Requirements (Detailed)

Beyond the system prompt directives (Section 2), R2 agents must follow these rules:

- **No Anchoring.** R2 must not read the researcher's confidence score before forming
  its own assessment. In FORCED mode this is enforced by BFP; in other modes the agent
  must self-enforce by assessing evidence before reading the stated confidence.

- **Search Obligation.** For every claim reviewed in FORCED or BATCH mode, R2 must
  perform or have access to results from at least one external search (literature,
  database, or reference) to check for prior art or contradictions.

- **Monotonic Scrutiny.** Each successive review pass on the same claim must be at
  least as demanding as the previous one. R2 cannot relax requirements between rounds.

- **No Premature Clearance.** R2 cannot declare "all tests passed" or "claim verified."
  The strongest permissible positive statement is: "No further objections at this time.
  Claim may proceed."

- **Mandatory Disagreement Documentation.** When two R2 reviewers disagree, both
  positions must be recorded in the verdict. The orchestrator resolves, not R2.

- **Explicit Uncertainty.** R2 must state what it could NOT check (e.g., "unable to
  verify calibration without access to raw instrument data").

---

## 8. Salvagente + Circuit Breaker Integration

### Salvagente Rule

When R2 kills a claim with reason INSUFFICIENT_EVIDENCE, CONFOUNDED, or PREMATURE,
R2 **MUST** produce a serendipity seed. This is mandatory. The seed captures:

- What unexpected pattern was observed during the review
- What alternative hypothesis the evidence might support instead
- What adjacent investigation the killed claim's data could inform

Failure to produce a serendipity seed on a kill is a J0-scorable offense (R3 will
penalise the review on the Constructiveness dimension).

```yaml
salvagente:
  killed_claim_id: C-014
  kill_reason: CONFOUNDED
  serendipity_seed:
    observation: "The confounding variable itself shows an unexpected non-linear pattern"
    alternative_hypothesis: "The confounder may be a mediator, not a confounder"
    suggested_investigation: "Test mediation model with the variable as intermediate"
    priority: 12  # serendipity score 0-20
```

### Circuit Breaker

When the same R2 objection appears 3 times across consecutive rounds with no state
change in the claim (i.e., the researcher has not produced new evidence or analysis),
the claim becomes **DISPUTED**.

- DISPUTED claims are frozen, not killed.
- The pipeline continues with other claims.
- DISPUTED claims block Stage 5 synthesis (S5 Poison Pill): no final synthesis can
  include a DISPUTED claim without explicit user override.
- Resolution requires either: (a) new evidence that changes the state, or
  (b) user override with documented rationale.

---

## 9. Output Schema (R2 Verdict)

Every R2 review produces a verdict in the following YAML format. In FORCED/BATCH modes,
this is validated against `r2-verdict.schema.json`.

```yaml
r2_verdict:
  version: "5.5"
  mode: FORCED          # BRAINSTORM | FORCED | BATCH | SHADOW | VETO | REDIRECT | INLINE
  timestamp: "2026-02-23T14:30:00Z"
  claims_reviewed:
    - claim_id: C-007
      reviewers:
        - reviewer: R2-Methods
          disposition: KILL        # KILL | DOWNGRADE | PASS | DISPUTE
          confidence: 0.85
          objections:
            - id: OBJ-001
              category: confound
              description: "Uncontrolled temporal confound between groups"
              severity: critical
              test_proposed: "Apply time-stratified matching"
          prior_art_searched: true
          prior_art_refs: ["DOI:10.xxxx/example"]
        - reviewer: R2-Stats
          disposition: DOWNGRADE
          confidence: 0.70
          objections:
            - id: OBJ-002
              category: multiple_testing
              description: "12 comparisons without correction"
              severity: major
              test_proposed: "Apply Bonferroni or BH correction"
          prior_art_searched: true
          prior_art_refs: []
        - reviewer: R2-Domain
          disposition: PASS
          confidence: 0.60
          objections: []
          prior_art_searched: true
          prior_art_refs: ["DOI:10.yyyy/example"]
        - reviewer: R2-Eng
          disposition: PASS
          confidence: 0.90
          objections: []
          prior_art_searched: false
      ensemble_disposition: DOWNGRADE   # worst-of-4 unless overridden
      confounder_harness:
        raw_effect: 2.30
        conditioned_effect: 1.45
        matched_effect: 1.38
        harness_result: ROBUST  # ARTIFACT | CONFOUNDED | ROBUST
      salvagente: null          # required if ensemble_disposition is KILL
      inline_checklist: null    # populated only in INLINE mode
  sfi_result:
    seeded_faults_injected: 2
    seeded_faults_detected: 2
    review_valid: true
  bfp_flips: []               # claims whose assessment changed between Phase 1 and 2
  meta:
    total_claims: 1
    killed: 0
    downgraded: 1
    passed: 0
    disputed: 0
```

---

## v6.0 TEMPORAL DECAY CALIBRATION

### Overview
R2's historical performance is tracked across sessions with exponential temporal decay. Recent reviews weigh more than older ones:
```
weight = exp(-0.02 * ageWeeks)
```
A weakness from 50 weeks ago contributes only ~37% of its original weight.

### Calibration Data
At session start, the SessionStart hook loads R2 calibration data:
- **Top weaknesses**: Most frequently missed review categories (decay-weighted)
- **SFI weak categories**: Fault types R2 misses most often
- **J0 trend**: improving/declining/stable based on weighted recent vs older scores

### How R2 Should Use Calibration
When SessionStart injects `[R2 CALIBRATION]` hints:
1. Read the hint carefully
2. Prioritize historically weak areas during review
3. If hint says "R2 ha storicamente mancato X", actively search for X-type issues
4. If J0 trend is "declining", apply extra rigor

### Tracking
PostToolUse hook logs R2 review events to DB. Stop hook extracts patterns. This creates a feedback loop: weaknesses → hints → improved reviews → fewer weaknesses.

See `references/r2-calibration.md` for the full calibration formula and data sources.

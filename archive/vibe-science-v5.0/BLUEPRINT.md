# Vibe Science v5.0 — IUDEX

> **Codename**: IUDEX (Latin: _the judge_)
> **Lineage**: v3.5 TERTIUM DATUR → v4.0 ARBOR VITAE → v4.5 ARBOR VITAE (Pruned) → **v5.0 IUDEX**
> **Status**: BLUEPRINT — Architecture Document for Implementation
> **Authors**: Carmine Russo, with Elisa Bertelli
> **License**: MIT

---

## EXECUTIVE SUMMARY

v5.0 IUDEX addresses a fundamental problem proven by peer-reviewed research: **LLMs cannot self-correct reasoning without external feedback** (Huang et al., ICLR 2024). While v4.5 already had the strongest adversarial review architecture in the ecosystem (R2 Ensemble with 4 reviewers, 6 activation modes, shadow surveillance), its enforcement was still _prompt-level_. A sufficiently creative agent could, in theory, satisfy the letter of R2's demands while circumventing their spirit.

v5.0 makes this architecturally impossible by adding **four innovations** and **six enhancements**:

**Innovations** (new mechanisms):
1. **Seeded Fault Injection (SFI)** — Inject known errors; if R2 misses them, the review is invalid
2. **Judge Agent (R3)** — A third agent meta-reviews R2's review quality with a rubric
3. **Blind-First Pass (BFP)** — R2 reviews claims before seeing the researcher's justifications
4. **Schema-Validated Gate Artifacts (SVG)** — Critical gates enforce structure via JSON Schema, not just prompts

**Enhancements** (strengthening existing mechanisms):
A. R2 Salvagente — killed claims preserve serendipity seeds
B. Structured Serendipity Seed Schema — actionable research objects, not notes
C. Quantified Exploration Budget — LAW 8 gains a measurable 20% floor
D. Confidence Formula Revision — hard veto + geometric mean with dynamic floor
E. Circuit Breaker — deadlock prevention with DISPUTED state
F. Agent Permission Model — least privilege, separation of verdict from execution

Everything else from v4.5 stays. The 10 Laws (LAW 8 principle preserved, enforcement quantified), OTAE-Tree, 5-Stage Manager, Evidence Engine, Serendipity Engine, Brainstorm Engine, all 25 existing gates — untouched. v5.0 is additive, not a rewrite.

---

## PROBLEM STATEMENT: WHY v5.0 IS NECESSARY

### The Empirical Evidence

| Paper | Finding | Implication for Vibe Science |
|-------|---------|------------------------------|
| Huang et al. (2024), "Large Language Models Cannot Self-Correct Reasoning Yet", ICLR 2024 | Intrinsic self-correction is ineffective; performance _degrades_ after self-correction. Specifically: 74.7% of the time the model retains its initial answer, and among changes, **more flip correct→incorrect than incorrect→correct**. | R2 in SOLO mode (same context window) is fundamentally limited. The LLM reviewing its own work cannot reliably detect its own errors. TEAM mode (separate context) is better but still same model. |
| Du et al. (2024), "Improving Factuality through Multiagent Debate", ICML 2024 | Multiple LLM agents debating reduces factual errors by 30%+. Accuracy improves with more agents and more debate rounds. | Direct empirical validation of R2 Ensemble's multi-reviewer architecture. More reviewers, more scrutiny rounds = better detection. |
| Gou et al. (2023), "CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing", ICLR 2024 | Self-correction works ONLY when external tools provide feedback. The model's own critiques "contribute marginally" | Validates v4.5's tool-use mandate for R2 (web search, PubMed, Scopus). But prompt-level mandates can be circumvented. Need structural enforcement. |
| Kamoi et al. (2024), "When Can LLMs Actually Correct Their Own Mistakes?", TACL 2024 | No prior work demonstrates successful self-correction from prompted LLMs alone. Works only with reliable external feedback or fine-tuning. | The adversarial prompt is necessary but insufficient. R2 needs _architectural_ guarantees, not just behavioral instructions. |
| Krlev & Spicer (2023), "Reining in Reviewer Two", JMS | Epistemic respect requires assessing arguments on soundness, not origin. Good review = specific, developmental, evidence-based. Bad review = performative, vague, authority-based. | R2 must be calibrated: destructive but epistemically rigorous. Not theatrical rejection, but surgical evidence-based demolition. The Blind-First Pass implements this. |
| Watling et al. (2021), "Don't Be Reviewer 2" | Researchers respond best to specific, developmental feedback. Checklist-only reviews feel mechanical and are less effective. | R2's Red Flag Checklist (v4.5) is a floor, not a ceiling. The Judge Agent evaluates whether R2's review is actually substantive. |

### The Gap v5.0 Closes

v4.5's R2 is strong but _prompt-enforced_. Three failure modes remain:

1. **Rubber-stamp reviews**: R2 runs through the checklist perfunctorily, marks all PASS, moves on. No actual adversarial thinking.
2. **Anchoring bias**: When R2 sees the researcher's justification alongside the claim, it anchors on the provided reasoning and fails to generate independent counter-arguments.
3. **Schema circumvention**: Gate artifacts are free-text. An agent can write "confounder harness: DONE" in prose without actually running the harness. Nothing structurally prevents this.

v5.0 closes all three gaps with architectural solutions, not more prompting.

---

## THE FOUR INNOVATIONS

### Innovation 1: Seeded Fault Injection (SFI)

**Problem it solves**: How do you know R2 is actually catching errors, vs. rubber-stamping?

**Mechanism**:
Before submitting a set of claims to R2 for review, the system (orchestrator-level, NOT the researcher agent) injects 1-3 known faults into the claim set. These faults are drawn from a fault taxonomy and are _realistic_ — they mimic the actual errors found in 21 sprints of CRISPR research.

**Fault Taxonomy** (based on real errors from v3.5 case study):

| Fault ID | Category | Description | Example |
|----------|----------|-------------|---------|
| SFI-01 | Confounded claim | Strong statistical signal that reverses under propensity matching | OR=2.30, p<10^-100, sign reverses when controlling for GC content |
| SFI-02 | Already-known finding | "Discovery" that is established in the literature | Presenting mismatch-position effects as novel |
| SFI-03 | Biological impossibility | Claim that violates known biology | "Bidirectional positional effects" when all mismatches reduce cleavage |
| SFI-04 | Noise-as-signal | Effect size below meaningful threshold | Cohen's d = 0.07 presented as "regime switch" |
| SFI-05 | Non-generalizable finding | Result specific to one assay/dataset presented as universal | Position rankings that don't transfer between GUIDE-seq and CIRCLE-seq |
| SFI-06 | Citation fabrication | DOI that doesn't resolve, or paper that doesn't say what's claimed | Fake DOI or misattributed finding |
| SFI-07 | Statistical artifact | p-value from wrong test, or multiple testing without correction | Bonferroni-uncorrected p-values across 100 comparisons |
| SFI-08 | Missing control | Comparison without appropriate baseline | No random baseline for classification accuracy |

Each fault has a difficulty rating (EASY / MEDIUM / HARD) and an equivalence risk (LOW / MEDIUM / HIGH). HIGH equivalence risk faults are candidates for EQUIV classification if R2 cannot discriminate them with available evidence.

**Protocol**:

```
SEEDED FAULT INJECTION PROTOCOL

WHEN: Before every FORCED R2 review (NOT BATCH, NOT SHADOW — cost management)
WHO: Orchestrator (not researcher, not R2)
VISIBILITY: R2 does NOT know which claims are seeded faults

1. Select 1-3 faults from taxonomy (random, weighted by recency of similar errors)
2. Inject into claim set as additional claims with plausible evidence
3. Record injection manifest: {review_id, fault_ids, injection_positions}
4. Submit augmented claim set to R2 for review
5. After R2 review completes:
   a. Check: did R2 flag ALL seeded faults?
   b. If YES → review is VALID. Remove seeded faults from output.
   c. If NO → review is INVALID. Log which faults were missed.
      → R2 must re-review the ENTIRE claim set (not just missed faults)
      → Increment r2_vigilance_failures counter
      → If 3+ failures in session → ESCALATE to human
6. Record in PROGRESS.md: "SFI check: {N_injected} faults, {N_caught} caught, review {VALID|INVALID}"
```

**SFI Metrics** (from mutation testing literature — Jia & Harman survey, Papadakis et al.):

| Metric | Formula | Purpose |
|--------|---------|---------|
| **RMS (Review Mutation Score)** | caught / (injected − equivalent) | R2 vigilance on known faults |
| **False Alarm Rate (FAR)** | false_positives / clean_claims_reviewed | R2 paranoia level (must stay low) |
| **Time-to-Catch** | cycle_number when fault first flagged | R2 responsiveness |
| **Coverage by Fault Class** | RMS per fault category (SFI-01..SFI-08) | R2 blind spots by error type |

**Fault states**: Each fault in the taxonomy has a status:
- `ACTIVE` — valid test fault, should be caught
- `EQUIV` — non-discriminable with available evidence (bug in fault generator, not R2 failure). Excluded from RMS denominator.
- `RETIRED` — R2 has caught this fault type 3+ times consistently. Replace with harder variant.

**Gate**: V0 — R2 Vigilance Gate (NEW)
```
V0 PASS requires:
□ RMS >= 0.80 (at least 80% of non-equivalent faults caught)
□ Detection was substantive (must identify the specific flaw, not just "suspicious")
□ FAR <= 0.10 (no more than 10% false alarms on clean claims)
□ r2_vigilance_failures < 3 in current session

V0 FAIL actions:
- RMS < 0.80 → Review INVALID. Re-review required.
- FAR > 0.10 → R2 is being paranoid. Warn and recalibrate.
- 3+ session failures → Human escalation. R2 prompt may need adjustment.

V0 METRICS are logged in sfi-log.yaml for longitudinal tracking.
```

**Design note — Inline, not parallel**: SFI is inline (faults mixed with real claims). R2 does not know which claims are seeded. This tests vigilance under real conditions. The anti-paranoia mechanism is structural: every FAIL verdict must include specific falsifier + discriminating test (not just "suspicious"). This makes false positives expensive to produce.

**Fault replenishment**: The retirement mechanism (RETIRED after 3+ consistent catches) can deplete the taxonomy over time. To prevent SFI from becoming an empty ritual:
- **Minimum ACTIVE faults**: Each of the 8 fault categories must maintain at least 2 ACTIVE faults. If a category drops below 2, the human architect is notified to create harder variants.
- **Meta-faults** (v5.0+): Beyond domain-specific faults, include structural meta-faults that R2 should catch regardless of domain: claim type misclassification (causal labeled as descriptive), cherry-picked citation (source exists but doesn't support the claim as stated), p-hacking narrative (multiple comparisons presented as single hypothesis).
- **Fault generation is HUMAN-ONLY**: The LLM does not generate faults for itself. The taxonomy is authored by the human architect based on real errors from historical sprints. This ensures faults test genuine blind spots, not self-test capability.

**R2 awareness note**: R2 can read the fault taxonomy YAML (it's in the plugin files). R2 knows the 8 fault CATEGORIES but not WHICH specific faults were injected into WHICH specific claims in this review. This is analogous to knowing a test covers "math, science, history" but not knowing the specific questions. The value of SFI is ensuring R2 does the work (checks confounders, verifies DOIs, tests statistics), not that the faults are surprising.

**File**: `protocols/seeded-fault-injection.md`
**Artifacts**: `fault-taxonomy.yaml`, `.vibe-science/RQ-xxx/05-reviewer2/sfi-log.yaml`

---

### Innovation 2: Judge Agent (R3)

**Problem it solves**: Who reviews the reviewer? If R2 does a superficial review, who catches that?

**Mechanism**:
After R2 completes a FORCED review, a third agent (R3 — the Judge) evaluates the _quality of R2's review_, not the claims themselves. R3 has a rubric and scores R2's review on 6 dimensions. If R2's review quality is below threshold, the review is sent back.

**R3 Rubric** (6 dimensions, each scored 0-3):

| Dimension | 0 (Absent) | 1 (Superficial) | 2 (Adequate) | 3 (Exemplary) |
|-----------|-----------|-----------------|--------------|---------------|
| **Specificity** | No specific references to claims or evidence | References claims by ID but critique is generic | Identifies specific flaws with evidence locations | Pinpoints exact lines, values, or steps that fail |
| **Counter-evidence search** | No external search performed | Searched but only confirming sources | Searched for contradictions in 1 database | Searched 2+ databases for contradictions, prior art, known artifacts |
| **Confounder analysis** | No confounder discussion | Mentions confounders generically | Identifies specific confounders for specific claims | Demands and designs specific tests for each confounder |
| **Falsification demand** | No falsification tests requested | Generic "more testing needed" | Specific tests requested for major claims | Specific tests with expected outcomes if claim is false |
| **Independence** | Review echoes researcher's framing | Some original analysis but mostly follows researcher's structure | Independent structure with some original observations | Completely independent analysis, discovers issues researcher didn't anticipate |
| **Escalation** | No demands or actions | Generic demands without deadlines | Specific demands with priorities | Specific demands with deadlines, clear PASS/FAIL criteria |

**Scoring**:
- Total possible: 18 points
- PASS threshold: >= 12 (adequate on all dimensions)
- WEAK PASS: 9-11 (acceptable but R2 warned to increase rigor next round)
- FAIL: < 9 (review is rejected, R2 must redo with higher rigor)

**Anti-gaming rule**: An RCT on peer review quality (PMC, 2024) shows unnecessarily longer reviews are rated as higher quality even by meta-reviewers — a length bias. R3 MUST NOT penalize brevity. A 3-line review that identifies a specific fatal flaw with evidence scores higher than a 3-page review that restates concerns generically. The rubric dimensions reward **specificity and evidence**, not verbosity.

**Protocol**:

```
JUDGE AGENT (R3) PROTOCOL

WHEN: After every FORCED R2 review (not BATCH, not SHADOW — cost management)
WHO: Separate context from both researcher and R2
INPUT: R2's ensemble report + the claims under review (but NOT the researcher's justifications)
OUTPUT: J0 gate verdict + rubric scores + specific feedback to R2

1. Read R2's ensemble report (YAML output)
2. Read the claims under review (from CLAIM-LEDGER.md)
3. Score each rubric dimension (0-3) with evidence
4. Compute total score
5. Verdict:
   - >= 12 → J0 PASS. R2's review is accepted.
   - 9-11  → J0 WEAK PASS. Review accepted, R2 warned.
   - < 9   → J0 FAIL. R2 must redo review.
     Provide specific feedback: which dimensions failed, what was missing.
6. Write report to: .vibe-science/RQ-xxx/05-reviewer2/judge-reports/J-YYYYMMDD-NNN.yaml
7. Update PROGRESS.md with J0 outcome
```

**Gate**: J0 — Judge Gate (NEW)
```
J0 PASS requires:
□ R3 rubric total >= 12
□ No dimension scored 0 (all aspects addressed)
□ Counter-evidence search dimension >= 2 (must actually search)

J0 FAIL actions:
- Total < 12 → R2 must redo FORCED review with R3's feedback
- Any dimension = 0 → Specific feedback provided, redo required
- 2+ consecutive J0 failures → Human escalation
```

**File**: `protocols/judge-agent.md`
**Artifacts**: `judge-rubric.yaml`, `.vibe-science/RQ-xxx/05-reviewer2/judge-reports/`

**Cost management**: R3 runs ONLY on FORCED reviews (major findings, stage transitions, conclusion). BATCH and SHADOW reviews are exempt. This keeps token cost manageable while protecting the highest-stakes decisions.

**SOLO mode specification**: In SOLO mode, R3 operates in the same context as researcher and R2. To preserve independence:
- R3 receives ONLY R2's report and the claims — NOT the researcher's justifications (same blind principle as BFP Phase 1).
- R3 applies the rubric mechanically: each dimension is scored against explicit criteria, not "gut feeling."
- The rubric's structured scoring (0-3 per dimension, concrete examples for each score) acts as the independence barrier. It forces R3 to evaluate evidence of work done, not plausibility of conclusions.
- In SOLO mode, self-consistency N=2: R3 scores the review twice (different sampling) and takes the LOWER total score. This compensates for the "be generous to yourself" bias.
- If J0 FAIL rate in SOLO mode is consistently > 50% higher than in TEAM mode (measured over 10+ sessions), escalate to human: the SOLO R3 may not be providing real scrutiny.

---

### Innovation 3: Blind-First Pass (BFP)

**Problem it solves**: Anchoring bias. When R2 sees the researcher's justification alongside a claim, it unconsciously anchors on the provided reasoning and fails to generate independent counter-arguments.

**Mechanism**:
For FORCED reviews, R2 first receives ONLY the claims (text + type + evidence location) WITHOUT the researcher's justification, methodology description, or confidence computation. R2 must generate its own assessment of what evidence would be needed and what could be wrong. Only AFTER this blind assessment does R2 receive the full context.

**Protocol**:

```
BLIND-FIRST PASS PROTOCOL

WHEN: Every FORCED R2 review (not BATCH, not SHADOW)
HOW: Two-phase review within the same R2 invocation

PHASE 1 — BLIND ASSESSMENT (R2 receives):
  - claim_id
  - claim_text
  - claim_type (descriptive | correlative | causal | predictive)
  - evidence_location (file paths / DOIs — but NOT the interpretation)

  R2 MUST produce for each claim:
  - What evidence would I need to see to believe this?
  - What are the 3 most likely alternative explanations?
  - What specific test would falsify this?
  - What confounders should I check?
  - My independent assessment: SUSPICIOUS | PLAUSIBLE | STRONG

PHASE 2 — FULL REVIEW (R2 additionally receives):
  - Researcher's methodology description
  - Confidence computation (E, R, C, K, D components)
  - Counter-evidence search results
  - Confounder harness results (if available)

  R2 MUST:
  - Compare Phase 1 assessment with Phase 2 evidence
  - Flag any claim where Phase 2 evidence does NOT address Phase 1 concerns
  - Produce final ensemble report (existing YAML schema)
  - Note discrepancies: "My blind assessment expected X, researcher addressed Y but not Z"

OUTPUT: Standard ensemble report + blind_assessment_comparison section
```

**Why this works**: It forces R2 to think independently before being influenced by the researcher's framing. The comparison between blind assessment and full review reveals anchoring — if R2's concerns evaporate after seeing the justification without the justification actually addressing them, that's anchoring bias, and R3 can catch it.

**CoVe integration** (from Chain-of-Verification, arXiv:2309.11495): Phase 1 is strengthened by the CoVe pattern. Instead of just assessing, R2 generates **verification questions** for each claim ("What would need to be true for this to hold? What database would contain counter-evidence? What statistical test would detect this artifact?"). In Phase 2, R2 answers these questions with the full context. This creates a structured anti-anchoring barrier even in SOLO mode.

**Integration with R3**: The Judge Agent (R3) explicitly scores the "Independence" dimension of the rubric. BFP provides structural evidence for this score: if R2's Phase 1 concerns disappear in Phase 2 without being addressed, Independence score drops.

**SOLO mode enhancement — Self-Consistency** (Wang et al., arXiv:2203.11171): In SOLO mode, for FORCED reviews on high-risk claims (confidence >= 0.60), R2 generates N=3 independent assessments (different sampling) and takes the **most conservative** verdict (not majority vote). This creates divergence without context separation. Huang et al. confirm self-consistency often outperforms multi-agent debate at equal compute cost.

**File**: `protocols/blind-first-pass.md`

---

### Innovation 4: Schema-Validated Gate Artifacts (SVG)

**Problem it solves**: Gate artifacts are free-text. An agent can write "confounder harness: DONE" without actually running it. Schema validation makes this structurally impossible.

**Mechanism**:
Critical gate artifacts must conform to a JSON Schema. The schema defines required fields, types, and constraints. If the artifact doesn't validate against the schema, the gate FAILS — regardless of what the prose says.

**Which gates get schema enforcement** (8 of 27 — the highest-stakes ones):

| Gate | Schema File | What It Enforces |
|------|-------------|-----------------|
| D1 (Claim Promotion) | `schemas/claim-promotion.schema.json` | Evidence chain must have verified DOIs, confidence computed with formula (all 5 components present as floats), confounder_harness object with raw/conditioned/matched results, counter_evidence_search with at least 1 database searched |
| D2 (RQ Conclusion) | `schemas/rq-conclusion.schema.json` | All claims referenced by ID, all have status VERIFIED or CONFIRMED, R2 final verdict present, tree snapshot reference |
| S4 (Ablation Exit) | `schemas/stage4-exit.schema.json` | Ablation matrix present (array of ablation objects with component, removed, metric_delta), multi-seed results (array >= 3), confounder harnesses for all promoted claims |
| S5 (Synthesis Exit) | `schemas/stage5-exit.schema.json` | R2 ensemble verdict = ACCEPT, D2 reference, all claims list with final status |
| L0 (Source Validity) | `schemas/source-validity.schema.json` | Each source has DOI with verified=true, confidence computed (not null), registered in claim ledger |
| L2 (Review Completeness) | `schemas/review-completeness.schema.json` | R2 ensemble report references (array of report IDs), all fatal flaws resolved (array with resolution field), counter-evidence search completed |
| B0 (Brainstorm Quality) | `schemas/brainstorm-quality.schema.json` | Gaps array (min 3), data availability score (float >= 0.5), hypothesis with null_hypothesis field, R2 verdict |
| V0 (R2 Vigilance) | `schemas/vigilance-check.schema.json` | Seeded faults array with caught boolean for each, all caught = true |

**Schema validation protocol**:

```
SCHEMA VALIDATION PROTOCOL

WHEN: At every gate check for the 8 schema-enforced gates
HOW: Before evaluating gate criteria, validate artifact against JSON Schema

1. Gate check begins
2. Load expected artifact (YAML/JSON file in .vibe-science/)
3. Validate against corresponding JSON Schema
4. If VALID → proceed with normal gate evaluation
5. If INVALID → gate FAILS immediately
   - Error message specifies: which field is missing/wrong, expected type, actual value
   - Agent must fix the artifact and re-submit
   - Prose claims of completion are IGNORED — only the schema matters

ENFORCEMENT:
- In TEAM mode: validation runs in orchestrator context (not in researcher or R2 context)
- In SOLO mode: validation runs as a self-check step before gate evaluation
- Schema files are READ-ONLY — agents cannot modify schemas
```

**Honest limitation**: Schema validation ensures structural completeness (all required fields present, correct types, non-empty arrays) but NOT truthfulness. An agent can produce a perfectly valid JSON artifact with fabricated results. SVG catches "hallucinated compliance" (claiming work was done without producing structured output) but not "fabricated compliance" (producing structured output with invented data). The defense against fabrication is layered: SFI tests whether R2 actually catches errors, BFP tests whether R2 thinks independently, and R3 tests whether R2's review references real evidence locations. No single mechanism is sufficient; the combination is the defense.

**File**: `protocols/schema-validation.md`
**Artifacts**: `schemas/` directory with 9 JSON Schema files (8 gate schemas + serendipity-seed schema)

---

## ADDITIONAL ENHANCEMENTS (from serendipity preservation analysis)

These three enhancements emerged from analyzing how adversarial loops can inadvertently destroy premature-but-valid discoveries. They strengthen the existing Serendipity Engine without adding new agents or complexity.

### Enhancement A: R2 Salvagente Protocol

**Problem**: When R2 kills a claim, it kills it completely. But there are two types of death:
- **Logically false** (e.g., "bidirectional positional effects" — biologically impossible) → dead, end of story
- **Insufficient evidence** (e.g., interesting signal but not controlled for confounders) → could be true, just premature

Currently, both types are treated identically. This means R2 can prune away genuinely interesting discoveries that simply need more time.

**Mechanism**: When R2 kills a claim with reason INSUFFICIENT_EVIDENCE (not LOGICALLY_FALSE or ARTIFACT), R2 MUST produce a serendipity seed containing:
- The interesting kernel of the claim (what made it worth investigating)
- A minimum discriminating test (one specific test that would resolve it)
- Pointer to the original claim_id and evidence that existed

**Integration**: Added to R2 ensemble output schema as `salvaged_seeds[]` array. Each salvaged seed is automatically written to SERENDIPITY.md with status `SALVAGED_FROM_R2` and enters the triage queue.

**Protocol addition to `reviewer2-ensemble.md`**:
```yaml
# Added to ensemble report output schema
salvaged_seeds:
  - seed_id: SEED-xxx
    source_claim_id: C-xxx
    kill_reason: INSUFFICIENT_EVIDENCE
    interesting_kernel: "[what was worth investigating]"
    minimum_test: "[one specific test]"
    existing_evidence: "[what we already have]"
    estimated_test_cost: LOW | MEDIUM | HIGH
```

**Rule**: R2 can ONLY skip salvagente when kill_reason is LOGICALLY_FALSE or KNOWN_ARTIFACT. For INSUFFICIENT_EVIDENCE, CONFOUNDED, or PREMATURE, salvagente is mandatory.

### Enhancement B: Structured Serendipity Seed Schema

**Problem**: Current serendipity entries in v4.5 have: description, score, source, status. This is a note, not an actionable research object. Seeds without structure become stale and unactionable.

**Enhanced schema** (replaces current free-text entries):

```yaml
seed_id: SEED-YYYYMMDD-NNN
status: PENDING_TRIAGE | QUEUED | TESTING | KILLED | PROMOTED_TO_CLAIM
source: SCANNER | SALVAGED_FROM_R2 | CROSS_BRANCH | USER
score: 0-20 (serendipity engine score)

# Mandatory causal structure
causal_question: "[one-line: what causes what?]"
falsifiers:     # 3-5 specific ways this could be an illusion
  - "[confounder X would explain this away]"
  - "[selection bias in dataset Y]"
  - "[known artifact of method Z]"
discriminating_test: "[one specific test that separates real from artifact]"
fallback_test: "[backup test if primary is infeasible]"
expected_value: "[impact if true] × [probability estimate] × [test cost]"

# Provenance
source_run_id: "[run/cycle that generated this]"
source_claim_id: "[if salvaged from R2]"
source_branch: "[tree branch]"
pointers: ["[file:line references to relevant data]"]

# Lifecycle
created_cycle: N
triage_deadline_cycle: N+5    # LAW: must be triaged within 5 cycles
last_reviewed_cycle: N
resolution: "[how it was resolved, when done]"
```

**Integration**: Schema enforcement via JSON Schema (adds `schemas/serendipity-seed.schema.json` to the schema set). Every seed MUST validate against this schema before being written to SERENDIPITY.md.

### Enhancement C: Quantified Exploration Budget

**Problem**: LAW 8 says "EXPLORE BEFORE EXPLOIT: minimum 3 draft nodes before any is promoted." This is qualitative. In practice, the system can satisfy LAW 8 early and then spend 95% of remaining cycles exploiting.

**Enhancement**: Add a quantified exploration floor to LAW 8:

```
LAW 8 (v5.0): EXPLORE BEFORE EXPLOIT
  - Minimum 3 draft nodes before any is promoted (unchanged)
  - NEW: At least 20% of all nodes in the tree must be exploration nodes
    (type = draft | serendipity | ablation with novel hypothesis)
  - Checked at T3 (Tree Health gate)
  - If exploration_ratio < 0.20 → T3 issues WARNING
  - If exploration_ratio < 0.10 → T3 FAILS (must create exploration nodes before continuing)
```

**Why 20%**: This mirrors the well-established exploration/exploitation balance in multi-armed bandits and Thompson sampling. Too low means you miss discoveries; too high means you never converge. 20% is the floor, not the target.

### Enhancement D: Confidence Formula Revision

**Problem**: v4.5 computes confidence as `C = E × R × C × K × D` (product of 5 components, each [0,1]). A single zero kills confidence. But zero means DIFFERENT THINGS for different components:

| Component | Zero means | Should kill? |
|---|---|---|
| **E** (Evidence quality) | No verifiable source | YES — LAW 1 |
| **D** (Data quality) | Corrupt/invalid data | YES — garbage in = garbage out |
| **C** (Consistency) | Contradicts all known findings | ALMOST — but genuine discoveries can contradict consensus |
| **R** (Replication) | No replication attempted | NO — new findings have R=0 by definition |
| **K** (Known mechanisms) | No known mechanism | NO — many genuine discoveries lacked mechanisms initially |

The product formula treats R=0 (new, unreplicated finding) identically to E=0 (no evidence). This destroys claims that are merely premature, not false. It is anti-serendipity.

**v5.0 Formula** — Hard veto + geometric mean with floor:

```
CONFIDENCE FORMULA v5.0:

Step 1: Hard veto check (LAW 1 enforcement)
  IF E < 0.05 OR D < 0.05 → confidence = 0.0
  STOP. No data = no go.

Step 2: Apply floor to soft components (unknown ≠ false)
  R_eff = max(R_raw, 0.10)
  C_eff = max(C_raw, 0.10)
  K_eff = max(K_raw, 0.10)

Step 3: Aggregate
  confidence = E × D × (R_eff × C_eff × K_eff)^(1/3)

  E, D: product (hard veto — zero kills)
  R, C, K: geometric mean (softer, compensatory)
  Floor 0.10: prevents "unknown" from killing; "unknown" ≠ "contradicted"
```

**Properties**:
- E=0 or D=0 → confidence = 0 (unchanged, LAW 1 preserved)
- R=0 (new finding) → R_eff = 0.10, confidence penalized but NOT killed
- K=0 (no mechanism) → K_eff = 0.10, same protection for serendipitous findings
- All components = 1.0 → confidence = 1.0 (unchanged)
- All soft components = 0.10 → confidence ≈ E × D × 0.10 (heavy penalty, not death)

**Dynamic floor by claim type and stage** (v5.0 refinement):

The fixed floor of 0.10 is a reasonable default, but different claim types at different stages have different tolerance for "unknown":

| Claim Type | Stage | Floor | Rationale |
|------------|-------|-------|-----------|
| Descriptive / Correlative | Stage 1-2 (Preliminary/Hyperparameter) | 0.05 | Early exploration — "unknown" is expected and acceptable |
| Descriptive / Correlative | Stage 3+ (Research Agenda onward) | 0.10 | Should have some validation by now |
| Causal / Mechanistic | Any stage | 0.15 | Stronger claims need stronger evidence to survive |
| Paper-critical (abstract/figures) | Stage 5 (Synthesis) | 0.20 | Highest bar — if R or K is still 0, that's a red flag for paper inclusion |

Implementation: the floor is selected at gate evaluation time based on `claim.type` and `current_stage`. The formula itself doesn't change — only the floor parameter.

**Anti-gaming: claim.type is locked after assignment**. Since the floor depends on `claim.type`, a researcher could game the system by labeling a causal claim as "descriptive" to get a lower floor (0.05 instead of 0.15). To prevent this:
- `claim.type` is assigned by the **orchestrator** at claim registration time, based on claim text analysis (does it assert causation? prediction? correlation?).
- Once assigned, `claim.type` is **locked** in the claim ledger. The researcher cannot change it.
- To reclassify a claim, the researcher must request reclassification with justification. R2 reviews the justification. If R2 agrees, the orchestrator updates the type and recalculates confidence with the new floor.
- The claim schema includes: `claim_type_assigned_by: orchestrator`, `claim_type_locked: true`, `reclassification_history: []`.

**R-C collinearity note**: Replication (R) and Consistency (C) are likely correlated — replicated findings are also consistent. The geometric mean mitigates this (less punitive than product). For v6.0, consider merging R and C into a single "External Validation" component or using Choquet integral.

**Backward compatibility**: Claims scored under v4.5 formula should be re-scored under v5.0 formula during session resume. The new formula will be strictly >= the old formula (because of the floor), so no claim will lose confidence.

**File to update**: `protocols/evidence-engine.md` — confidence formula section.

### Enhancement E: Circuit Breaker (Deadlock Prevention)

**Problem**: In a multi-agent system with rigid gates, deadlocks are inevitable. The scenario:

```
R2: "You must run confounder harness for GC content bias"
Researcher: "Dataset lacks GC annotation — test is impossible with available data"
R2: "Without harness, verdict is REJECT"
Researcher: "Gate won't pass without your ACCEPT"
→ Infinite loop. Tokens burn. No progress.
```

This happens whenever R2 demands a test that is impossible given the current data/tools. It's not a bug in R2's logic — the demand is correct — but the system has no mechanism to resolve an irreconcilable disagreement.

**Mechanism — Gossip Limit + DISPUTED State**:

```
CIRCUIT BREAKER PROTOCOL

TRIGGER: Same claim, same R2 objection, 3 consecutive rounds with no state change
  (state change = new evidence presented, test run, confidence revised, or claim modified)

ACTION:
  1. Orchestrator detects gossip loop (identical objection repeated 3x)
  2. Claim status → DISPUTED
     - claim.status = "DISPUTED"
     - claim.dispute_reason = R2's unresolved objection (verbatim)
     - claim.dispute_cycle = current cycle
     - claim.researcher_position = researcher's last response (verbatim)
  3. Claim is FROZEN — cannot be promoted, cannot be killed
  4. Processing continues with remaining claims
  5. DISPUTED claims are re-examined at:
     a. Stage transitions (new data may resolve the dispute)
     b. Synthesis (Stage 5) — human mediator decides
     c. If new tool/data becomes available that addresses R2's objection

PROPERTIES:
  - DISPUTED ≠ KILLED: The claim survives, flagged, for later resolution
  - DISPUTED ≠ ACCEPTED: The claim cannot be promoted to paper-grade
  - Maximum gossip rounds = 3 (configurable, but 3 is the default)
  - The circuit breaker fires LOUDLY — it's logged, reported, and visible in claim ledger
  - R2's objection is preserved verbatim — no information is lost
```

**Why 3 rounds**: Empirically, if R2 and Researcher haven't resolved it in 3 rounds with no new evidence, they won't resolve it in 10. Additional rounds are pure token waste. The disagreement is real and needs external input (new data, human, or cross-model audit).

**S5 Poison Pill**: DISPUTED claims act as a hard block at Stage Synthesis (S5). The stage CANNOT close while any claim has status DISPUTED. Resolution options at S5: (a) new data resolves the test R2 demanded, (b) claim is voluntarily dropped by researcher, (c) human override with documented rationale. This prevents disputes from being quietly swept under the rug.

**File to create**: `protocols/circuit-breaker.md`

### Enhancement F: Agent Permission Model (Least Privilege)

**Problem**: In v4.5, all agents operate within the same Claude Code context. There is no explicit separation of who can READ vs WRITE which artifacts. In principle, R2 could modify the claim ledger directly (by editing a file) rather than producing a verdict for the orchestrator to execute.

**Principle**: Separation of verdict from execution. R2 PRODUCES a verdict. The ORCHESTRATOR executes it. R2 never writes to the claim ledger directly.

**Permission Matrix**:

| Agent | Claim Ledger | Gate Artifacts | R2 Reports | Serendipity Seeds | Schemas |
|-------|-------------|----------------|------------|-------------------|---------|
| Researcher | READ + WRITE (creates claims) | READ + WRITE (produces artifacts) | READ only | READ + WRITE (creates seeds) | READ only |
| R2 Ensemble | READ only | READ only | WRITE (produces reports) | READ only (+ salvagente append) | READ only |
| R3 Judge | READ only | READ only | READ only | READ only | READ only |
| Orchestrator | READ + WRITE (executes gate decisions) | READ + VALIDATE | READ (evaluates) | READ + WRITE (triage) | READ only (enforces) |

**Key constraints**:
- **R2 cannot write to claim ledger** — it produces a YAML verdict (`verdict_artifact.yaml`), the orchestrator applies it
- **R3 cannot modify R2's report** — it scores the report, the orchestrator decides action
- **Schemas are READ-ONLY for all agents** — only the architect (human) can modify schemas
- **Salvagente exception**: R2 CAN append to `salvaged_seeds[]` in its own report (not in Serendipity.md directly)

**Transition Validation**: The Orchestrator does NOT blindly apply R2's verdict. It validates state transitions before writing to the ledger:

| Transition | Allowed? | Condition |
|-----------|----------|-----------|
| DRAFT → VERIFIED | Yes | R2 verdict ACCEPT + gate passed |
| DRAFT → KILLED | Yes | R2 verdict REJECT + gate passed |
| DRAFT → DISPUTED | Yes | Circuit breaker triggered |
| KILLED → VERIFIED | **NO** | Requires explicit **revival protocol**: new evidence + fresh R2 review from scratch |
| DISPUTED → VERIFIED | Yes | Dispute resolved with new evidence or human override |
| DISPUTED → KILLED | Yes | Researcher voluntarily drops claim |
| VERIFIED → KILLED | Yes | Post-verification evidence contradicts (rare but possible) |

Invalid transitions are logged as errors and the ledger update is rejected. This prevents "hallucinated compliance" where an agent writes history that never happened.

**Enforcement**: This is enforced by convention in v5.0 (protocol instructions). In v5.5+, consider file-system-level enforcement (separate directories with different write permissions per agent context).

**File to update**: Add permission model to `SKILL.md` and reference in each protocol.

---

## WHAT STAYS UNCHANGED FROM v4.5

Everything not listed in the innovations and enhancements above remains exactly as-is:

### Architecture (preserved, with LAW 8 quantified)
- 10 Immutable Laws (LAW 8 principle unchanged; enforcement gains measurable 20% exploration floor — see Enhancement C)
- OTAE-Tree loop (Observe-Think-Act-Evaluate inside Tree Search)
- 5-Stage Experiment Manager (Preliminary → Hyperparameter → Research Agenda → Ablation → Synthesis)
- 3 Tree modes (LINEAR, BRANCHING, HYBRID)
- 7 Node types (draft, debug, improve, hyperparameter, ablation, replication, serendipity)
- SOLO / TEAM runtime selection
- Phase 0 Scientific Brainstorm
- Session Resume Protocol

### Pillars (Evidence Engine formula updated, rest unchanged)
- Evidence Engine (confidence formula: **UPDATED in v5.0** — see Enhancement D above)
- Serendipity Engine (cross-branch detection, scoring, interrupt)
- Analysis Orchestrator (tool dispatch, skill router)
- Brainstorm Engine (with v4.5 Inversion + Collision + Productive Tensions)

### R2 Ensemble (enhanced, not replaced)
- 4 reviewers: R2-Methods, R2-Stats, R2-Bio, R2-Eng
- 6 activation modes: BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT
- Red Flag Checklist (12 flags from v4.5)
- Counter-evidence search mandate
- DOI verification protocol
- Double-pass workflow
- What changes: FORCED reviews now include Blind-First Pass and Judge Agent

### Gates (25 existing preserved, 2 new added)
- Pipeline: G0-G6 (unchanged)
- Literature: L0-L2 (L0, L2 get schema enforcement)
- Decision: D0-D2 (D1, D2 get schema enforcement)
- Tree: T0-T3 (unchanged)
- Brainstorm: B0 (gets schema enforcement)
- Stage: S1-S5 (S4, S5 get schema enforcement)
- **NEW**: V0 (R2 Vigilance), J0 (Judge)
- **Total**: 27 gates

### File Structure (extended, not reorganized)
All existing files preserved. New additions:

```
vibe-science-v5.0/
├── (all v4.5 files unchanged)
├── protocols/
│   ├── seeded-fault-injection.md    # NEW — SFI protocol
│   ├── judge-agent.md               # NEW — R3 protocol + rubric
│   ├── blind-first-pass.md          # NEW — BFP protocol
│   ├── schema-validation.md         # NEW — SVG protocol
│   └── circuit-breaker.md           # NEW — Deadlock prevention (Enhancement E)
├── schemas/                          # NEW — JSON Schema directory
│   ├── claim-promotion.schema.json
│   ├── rq-conclusion.schema.json
│   ├── stage4-exit.schema.json
│   ├── stage5-exit.schema.json
│   ├── source-validity.schema.json
│   ├── review-completeness.schema.json
│   ├── brainstorm-quality.schema.json
│   ├── vigilance-check.schema.json
│   └── serendipity-seed.schema.json
├── assets/
│   └── fault-taxonomy.yaml           # NEW — Seeded fault definitions
└── gates/
    └── gates.md                      # UPDATED — V0, J0 added
```

---

## GATE ARCHITECTURE SUMMARY (v5.0 — 27 gates)

| Category | Gates | Schema-Enforced? | New in v5.0? |
|----------|-------|-------------------|--------------|
| Pipeline | G0-G6 (7) | No | No |
| Literature | L0-L2 (3) | L0, L2 | No |
| Decision | D0-D2 (3) | D1, D2 | No |
| Tree | T0-T3 (4) | No | No |
| Brainstorm | B0 (1) | B0 | No |
| Stage | S1-S5 (5) | S4, S5 | No |
| Vigilance | V0 (1) | V0 | **YES** |
| Judge | J0 (1) | No (rubric-based) | **YES** |
| **Total** | **27** | **8 schema-enforced** | **2 new** |

---

## MODIFIED CHECKPOINT FLOW (v5.0)

The CHECKPOINT phase of the OTAE-Tree loop changes for FORCED reviews:

```
CHECKPOINT (v5.0 — FORCED review path)

1. FORCED R2 trigger detected (major finding / stage transition / confidence explosion)
2. Orchestrator: run Seeded Fault Injection
   → Inject 1-3 known faults into claim set
   → Record injection manifest
3. R2 Ensemble: Blind-First Pass Phase 1
   → Claims only (no justifications)
   → R2 produces independent assessment
4. R2 Ensemble: Full Review Phase 2
   → Full context provided
   → R2 produces ensemble report (YAML)
   → R2 must address discrepancies between Phase 1 and Phase 2
5. Gate V0: Seeded Fault Check
   → Did R2 catch all injected faults?
   → If NO → review INVALID, go back to step 3
   → RETRY LIMIT: max 3 V0 failures per session. After 3 → ESCALATE to human.
6. Judge Agent (R3): Review Quality Assessment
   → Score R2's review on 6-dimension rubric
   → Gate J0 check
   → If J0 FAIL → R2 must redo review with R3 feedback, go back to step 3
   → RETRY LIMIT: max 2 consecutive J0 failures. After 2 → ESCALATE to human.
7. Schema Validation: Check gate artifacts
   → Validate relevant artifacts against JSON schemas
   → If INVALID → fix and re-validate (max 3 attempts, then ESCALATE)
8. Gate evaluation proceeds normally (existing logic)

ESCALATION: When any retry limit is hit, the system STOPS automated review
and presents the human with: what failed, how many times, R2's last output,
and R3's feedback (if applicable). Human decides: adjust R2 prompt, skip
this review, or abort the session.
```

For BATCH and SHADOW reviews, the flow remains unchanged from v4.5 (no SFI, no BFP, no R3). This is deliberate: FORCED reviews protect the highest-stakes decisions, while BATCH and SHADOW remain lightweight.

---

## LITERATURE REFERENCES (for VibeX 2026 paper)

These papers directly support the architectural decisions in v5.0 and should be cited in the VibeX 2026 paper:

### Core: LLM Self-Correction Limitations

1. **Huang, J., Chen, X., Mishra, S., Zheng, H.S., Yu, A.W., Song, X., & Zhou, D.** (2024). "Large Language Models Cannot Self-Correct Reasoning Yet." _ICLR 2024_. arXiv:2310.01798.
   - **Key finding**: Intrinsic self-correction is ineffective; performance degrades after self-correction without external feedback.
   - **Our use**: Theoretical foundation for why R2 must be architecturally separated (TEAM mode) and structurally enforced (schemas), not just prompted.

2. **Gou, Z., Shao, Z., Gong, Y., Shen, Y., Yang, Y., Duan, N., & Chen, W.** (2023). "CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing." _ICLR 2024_. arXiv:2305.11738.
   - **Key finding**: Self-correction works ONLY with external tool feedback. Model's own critiques "contribute marginally."
   - **Our use**: Validates R2's mandatory tool-use (web search, PubMed, Scopus) as architecturally necessary, not optional.

3. **Kamoi, R., Zhang, Y., et al.** (2024). "When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs." _TACL 2024_. arXiv:2406.01297.
   - **Key finding**: No demonstration of successful self-correction from prompted LLMs alone. Reliable external feedback or fine-tuning required.
   - **Our use**: Motivates the architectural triad (SFI + BFP + R3) as structural external feedback mechanisms.

### Peer Review as Model

4. **Krlev, G. & Spicer, A.** (2023). "Reining in Reviewer Two: How to Uphold Epistemic Respect in Academia." _Journal of Management Studies_. DOI:10.1111/joms.12905.
   - **Key finding**: Epistemic respect = assess on soundness, not origin. Good review is specific and developmental.
   - **Our use**: R2's calibration: destructive but rigorous. R3 enforces review quality (specificity dimension).

5. **Watling, C., et al.** (2021). "Don't Be Reviewer 2! Reflections on Writing Effective Peer Review Comments."
   - **Key finding**: Checklist-only reviews are mechanical and less effective. Best reviews are specific with developmental intent.
   - **Our use**: R2 Red Flag Checklist is a _floor_, not the review itself. R3 ensures R2 goes beyond checklist compliance.

6. **Jefferson, T., Wager, E., & Davidoff, F.** (2002). "Measuring the Quality of Editorial Peer Review." _JAMA_.
   - **Key finding**: Interventions to improve peer review were "relatively unsuccessful."
   - **Our use**: You cannot fix peer review with better instructions alone. You need structural change — which is exactly what SFI + R3 provide.

### Additional (for Related Work section)

7. **Bruce, R., Chauvin, A., Trinquart, L., Ravaud, P., & Boutron, I.** (2016). "Impact of Interventions to Improve the Quality of Peer Review of Biomedical Journals: A Systematic Review and Meta-Analysis." _BMC Medicine_, 14:85. DOI:10.1186/s12916-016-0631-5.
   - **Relevance**: Meta-analysis showing training and guidelines have limited effect on review quality. Structural interventions needed.

8. **CorrectBench** (2025). "Can LLMs Correct Themselves? A Benchmark of Self-Correction in LLMs." arXiv:2510.16062. **[VERIFY BEFORE CITING — arXiv ID suggests Oct 2025, may need DOI confirmation]**
   - **Relevance**: 2025 benchmark confirming LLMs suffer from a "self-correction blind spot" — can correct external inputs but not their own outputs.

### Adversarial / Multi-Agent Correction

9. **Du, Y., et al.** (2024). "Improving Factuality and Reasoning in Language Models through Multiagent Debate." _ICML 2024_. arXiv:2305.14325.
   - **Key finding**: Multiple LLM agents debating reduces factual errors by 30%+. Accuracy improves with more agents and more rounds.
   - **Our use**: Direct empirical validation of R2 Ensemble's multi-reviewer architecture. More reviewers = better detection.

10. **Kumar, A., et al.** (2024). "Training Language Models to Self-Correct via Reinforcement Learning (SCoRe)." _ICLR 2025_. arXiv:2409.12917.
    - **Key finding**: DeepMind's own follow-up: RL fine-tuning enables genuine self-correction (+15.6% MATH, +9.1% HumanEval).
    - **Our use**: Confirms that self-correction CAN work — but requires structural change (RL training), not just prompting. Our structural changes (SFI, R3, schemas) are the agent-level analog.

11. **Jin, J., et al.** (2024). "AgentReview: Exploring Peer Review Dynamics with LLM Agents." _EMNLP 2024_.
    - **Key finding**: LLM-based peer review simulation framework demonstrating multi-agent review dynamics.
    - **Our use**: Most directly comparable prior work. Position our R2 Ensemble as going beyond simulation to enforcement (schemas, SFI, R3 judge).

### Concurrent Work: Generator-Verifier-Reviser at Inference Level

12. **Snell, C., et al.** (2024). "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters." arXiv:2408.03314.
    - **Key finding**: Inference-time compute scaling (giving models more time to think) improves reasoning more effectively than enlarging the model. Foundation for Deep Think.
    - **Our use**: Theoretical grounding for why our OTAE-Tree (which scales agent-time exploration) works. Same principle, different level (agent vs. inference).

13. **DeepMind** (2024). "Rewarding Progress: Scaling Automated Process Verifiers for LLM Reasoning." arXiv:2410.08146.
    - **Key finding**: Process Reward Models (PRMs) that give step-by-step feedback outperform outcome-only reward models.
    - **Our use**: R2's intervention at every OTAE checkpoint (not just final output) mirrors PRM's step-by-step verification at the agent level.

14. **DeepMind — Aletheia** (2026). "Towards Autonomous Mathematics Research." arXiv:2602.10177.
    - **Key finding**: Generator-Verifier-Reviser architecture for autonomous math research. Verifier uses natural language, not formal proofs. Iterative loop until verified or max attempts.
    - **Our use**: Aletheia's Generator-Verifier-Reviser is architecturally isomorphic to our Researcher-R2-Researcher loop. Validates our design independently. Key difference: we add tool-grounded verification (web search, PubMed, Scopus), not just reasoning-based verification.

15. **DeepMind** (2026). "Accelerating Scientific Research with Gemini: Case Studies and Common Techniques." arXiv:2602.03837.
    - **Key finding**: Documents patterns for human-AI scientific collaboration: iterative refinement, problem decomposition, cross-disciplinary transfer.
    - **Our use**: These patterns map to our OTAE loop (iterative refinement), tree search (problem decomposition), and Brainstorm collision-zone (cross-disciplinary transfer). Independent validation.

16. **ThinkPRM** (2025). "Process Reward Models That Think." arXiv:2504.16828.
    - **Key finding**: Generative PRMs that use chain-of-thought for verification. The verifier itself "reasons" before judging.
    - **Our use**: Parallel to our R3 Judge Agent, which reasons about the quality of R2's review (meta-verification).

### Serendipity Preservation

17. **Swanson, D.R.** (1986). "Undiscovered Public Knowledge." _The Library Quarterly_, 56(2), 103-118. DOI:10.1086/601720.
    - **Key finding**: Foundational work on literature-based discovery — connecting fragments of public knowledge that have never been connected. Serendipity can be systematized.
    - **Our use**: Theoretical foundation for our Serendipity Engine. "Serendipity by design" = Swanson's insight operationalized in an agent architecture.

18. **Kahneman, D.** (2003). "Experiences of Collaborative Research." _American Psychologist_.
    - **Key finding**: Adversarial collaboration as a method where opponents co-design discriminating tests rather than just argue.
    - **Our use**: R2's REDIRECT power + the Salvagente protocol. R2 doesn't just kill claims — it co-designs the test that would resolve them.

### Positioning Statement for VibeX Paper

The relationship between Vibe Science and Deep Think/Aletheia:

| | Deep Think / Aletheia | Vibe Science |
|---|---|---|
| **Level** | Inference-time (within model) | Agent-time (separate agents) |
| **Verifier** | Process Reward Model (trained) | R2 Ensemble (prompted + tool-grounded) |
| **Scaling** | More compute = more hypotheses explored | More OTAE cycles = more tree nodes explored |
| **Verification type** | Logical (reasoning-based) | Empirical (tool-grounded: PubMed, Scopus, web) |
| **Structural enforcement** | PRM weights (non-bypassable) | JSON Schema gates + SFI + R3 (v5.0) |
| **Cost** | Proprietary (Google AI Ultra) | Open source (MIT, any LLM) |
| **Catches** | Logical flaws in reasoning chains | Confounded claims, known artifacts, missing controls, citation errors |

**Complementary, not competing.** Deep Think catches what pure reasoning can catch. Vibe Science catches what only external empirical verification can catch. The ideal system would use both.

### SOLO Mode Mitigations (from self-correction literature)

19. **Wang, X., et al.** (2022). "Self-Consistency Improves Chain of Thought Reasoning in Language Models." arXiv:2203.11171.
    - **Key finding**: Sampling N independent reasoning chains and aggregating outperforms single-pass and often outperforms multi-agent debate at equal cost.
    - **Our use**: In SOLO mode, R2 generates N=3 independent assessments for high-risk claims. Most conservative verdict wins.

20. **Dhuliawala, S., et al.** (2023). "Chain-of-Verification Reduces Hallucination in Large Language Models." arXiv:2309.11495.
    - **Key finding**: Generate verification questions, then answer them independently from the original draft. Structured anti-anchoring.
    - **Our use**: Strengthens Blind-First Pass Phase 1. R2 generates verification questions before seeing justifications.

21. **CriticGPT / McAleese, N., et al.** (2024). "LLM Critics Help Catch LLM Bugs." arXiv:2407.00215.
    - **Key finding**: Fine-tuned critic models outperform prompted critics at bug-finding. But even prompted critics add value with structural enforcement.
    - **Our use**: Validates that our R2 (prompted, not fine-tuned) needs structural scaffolding (SFI, schemas, R3) to compensate for lack of fine-tuning.

22. **Chen, J., et al.** (2024). "RECONCILE: Round-Table Conference Improves Reasoning via Consensus." Multi-model debate outperforms single-model.
    - **Key finding**: ChatGPT + Bard + Claude2 systematically beats ChatGPT + ChatGPT + ChatGPT on reasoning tasks.
    - **Our use**: Justifies cross-model R2 as optional audit mode for highest-stakes claims.

23. **Zheng, C., et al.** (2024). "Personas in System Prompts Do Not Improve Factual QA." arXiv:2311.10054.
    - **Key finding**: Role-playing personas don't reliably improve factual accuracy. Can introduce variability/bias.
    - **Our use**: Confirms our philosophy: R2's robustness comes from architecture (gates, schemas, SFI), not from persona prompting. The adversarial prompt is necessary but insufficient.

### Meta-Review Depth (for R3 design)

24. **PMC** (2024). "Peer Reviews of Peer Reviews: A Randomized Controlled Trial." PMC:11964232.
    - **Key finding**: Longer reviews are rated as higher quality even by meta-reviewers — a length bias. Without structural constraints, meta-layers optimize appearance over substance.
    - **Our use**: R3 rubric explicitly rewards specificity and evidence, not verbosity. Anti-gaming by design.

### Mutation Testing Theory (for SFI design)

25. **Jia, Y. & Harman, M.** (2011). "An Analysis and Survey of the Development of Mutation Testing." _IEEE TSE_, 37(5). DOI:10.1109/TSE.2010.62.
    - **Key finding**: 10% random sampling of mutants is ~84% as effective as exhaustive testing. Selective mutation by operator type is more efficient than random.
    - **Our use**: Justifies 1-3 faults per FORCED review (~10-15% of claims). Prioritize by fault class, not random spray.

26. **Papadakis, M., et al.** (2019). "Mutation Testing Advances: An Analysis and Survey." _Advances in Computers_, 112.
    - **Key finding**: Equivalent mutants inflate scores and are undecidable in general. Must be explicitly managed (excluded from denominator or classified).
    - **Our use**: EQUIV state in fault taxonomy. Non-discriminable faults are bugs in the generator, not R2 failures.

27. **Kaufman, S. & Just, R.** (2022). "Prioritizing Mutants to Guide Mutation Testing." _ICSE_.
    - **Key finding**: Presenting few prioritized mutants (not many random ones) maximizes information per test. Quality over quantity.
    - **Our use**: SFI uses 1-3 carefully selected faults from taxonomy, not spray-and-pray. Fault retirement mechanism ensures faults stay challenging.

### Evidence Aggregation Theory (for confidence formula)

28. **Sentz, K. & Ferson, S.** (2002). "Combination of Evidence in Dempster-Shafer Theory." Sandia National Laboratories, SAND2002-0835.
    - **Key finding**: Independence assumption is critical in evidence combination. Dempster-Shafer allows distinguishing belief, plausibility, and ignorance — unlike point probabilities.
    - **Our use**: Motivates distinguishing "no evidence" (E=0, should kill) from "no replication yet" (R=0, should not kill). The product formula conflates these.

29. **Grabisch, M.** (2000). "Application of the Choquet Integral in Multicriteria Decision Making."
    - **Key finding**: Choquet integral handles interactions between criteria without assuming additivity/independence. Standard tool for non-additive aggregation.
    - **Our use**: Identified as future option (v6.0) for handling R-C collinearity. v5.0 uses geometric mean as simpler approximation.

---

## ATOMIC TASK BREAKDOWN (for parallel agent implementation)

Each task below is self-contained and can be executed by a single agent independently. Tasks are grouped by dependency.

### Layer 0: Independent Tasks (can all run in parallel)

| Task ID | Task | Input | Output | Estimated Lines |
|---------|------|-------|--------|----------------|
| T-01 | Write `protocols/seeded-fault-injection.md` | This blueprint (Innovation 1) + v4.5 reviewer2-ensemble.md | Protocol file | ~120 |
| T-02 | Write `protocols/judge-agent.md` | This blueprint (Innovation 2) + v4.5 reviewer2-ensemble.md | Protocol file + rubric | ~150 |
| T-03 | Write `protocols/blind-first-pass.md` | This blueprint (Innovation 3) + v4.5 reviewer2-ensemble.md | Protocol file | ~80 |
| T-04 | Write `protocols/schema-validation.md` | This blueprint (Innovation 4) + v4.5 gates/gates.md | Protocol file | ~60 |
| T-05 | Write `assets/fault-taxonomy.yaml` | This blueprint (SFI fault table) + CRISPR case study data | YAML taxonomy file | ~100 |
| T-06 | Write `schemas/claim-promotion.schema.json` | This blueprint + v4.5 D1 gate + evidence-engine.md | JSON Schema | ~80 |
| T-07 | Write `schemas/rq-conclusion.schema.json` | This blueprint + v4.5 D2 gate | JSON Schema | ~60 |
| T-08 | Write `schemas/stage4-exit.schema.json` | This blueprint + v4.5 S4 gate | JSON Schema | ~70 |
| T-09 | Write `schemas/stage5-exit.schema.json` | This blueprint + v4.5 S5 gate | JSON Schema | ~50 |
| T-10 | Write `schemas/source-validity.schema.json` | This blueprint + v4.5 L0 gate | JSON Schema | ~50 |
| T-11 | Write `schemas/review-completeness.schema.json` | This blueprint + v4.5 L2 gate | JSON Schema | ~60 |
| T-12 | Write `schemas/brainstorm-quality.schema.json` | This blueprint + v4.5 B0 gate | JSON Schema | ~50 |
| T-13 | Write `schemas/vigilance-check.schema.json` | This blueprint + V0 gate spec | JSON Schema | ~40 |
| T-14 | Write `assets/judge-rubric.yaml` | This blueprint (R3 rubric table) | YAML rubric file | ~60 |
| T-15 | Write `schemas/serendipity-seed.schema.json` | This blueprint (Enhancement B schema) | JSON Schema | ~70 |
| T-16 | Update `protocols/serendipity-engine.md` — add structured seed schema + salvagente integration | This blueprint (Enhancement A+B) + v4.5 serendipity-engine.md | Updated protocol | ~40 new lines |
| T-17 | Write `protocols/circuit-breaker.md` | This blueprint (Enhancement E) | Protocol file | ~80 |

### Layer 1: Depends on Layer 0

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-18 | T-01, T-02, T-03, T-04, T-06..T-13, T-15 | Update `gates/gates.md` — add V0, J0, schema references, T3 exploration check | Updated gates file |
| T-19 | T-01, T-02, T-03, T-16, T-17 | Update `protocols/reviewer2-ensemble.md` — integrate BFP, salvagente, circuit breaker reference, reference SFI and R3 | Updated R2 protocol |
| T-20 | T-01..T-17 | Update `SKILL.md` — version bump, LAW 8 quantified, new sections for innovations + enhancements, permission model (Enhancement F), circuit breaker | Updated SKILL.md |

### Layer 2: Depends on Layer 1

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-21 | T-18, T-19, T-20 | Update `CLAUDE.md` — version bump, add role constraints for R3, salvagente rule, permission model enforcement | Updated CLAUDE.md |
| T-22 | T-18, T-19, T-20 | Update `plugin.json` — version 5.0.0, codename IUDEX | Updated plugin.json |
| T-23 | T-18, T-19, T-20 | Update `README.md` — add v5.0 section, Mermaid diagrams for new flow | Updated README.md |

### Layer 3: Final verification

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-24 | T-21, T-22, T-23 | Orchestrator verification — line counts, version consistency, cross-references | Verification report |

**Total**: 24 tasks, 4 layers, maximum parallelism of 17 tasks in Layer 0.

---

## DESIGN DECISIONS AND RATIONALE

### Why 27 gates, not 6?

ChatGPT proposed consolidating to 6 gates. This is wrong. Here's why:

1. **Granularity enables diagnosis.** When G3 fails, you know it's a training issue. When "Quality Gate" fails, you don't know what broke.
2. **Different gates trigger at different times.** G0 fires at data load, S4 fires at ablation completion. Collapsing them means either running all checks at every stage (wasteful) or losing coverage (dangerous).
3. **Schema enforcement requires specificity.** You can't write a JSON Schema for a generic "quality gate." You need a specific schema for claim promotion (D1) and a different one for brainstorm quality (B0).
4. **The cost is zero.** Gates are prompt checks, not API calls. 27 text checks cost nothing. The question is not "how many gates?" but "does each gate earn its existence?" All 27 do.

### Why stop at R3? Why not R4, R5, ...?

**Data Processing Inequality** (information theory): In a text-only chain (R2 reads claims → R3 reads R2's review → R4 reads R3's report), each successive layer cannot increase information about the original data — it can only contract it. R4 reading only R3's text output is almost always noise + cost.

The exception: a new layer adds value ONLY if it introduces a **new information channel** — direct access to primary artifacts, a different model, different tools. This is why our cross-model audit (optional) works: it accesses artifacts directly with a different model, not R3's text.

Empirical evidence from real peer review: the standard across ICLR, ACL, and major journals is Reviewers → Meta-review (Area Chair) → rarely a Senior AC on borderline cases. Two layers is the norm; three is exceptional. Going deeper has never been shown to improve outcomes.

**Width over depth**: If you want more robustness, add N R2 reviewers in parallel (self-consistency), not more layers of meta-review. This is why we use N=3 self-consistency in SOLO mode rather than an R4.

### Why R3 only on FORCED reviews?

Cost management. FORCED reviews happen at major findings, stage transitions, and conclusion — maybe 5-10 times per RQ. Running R3 on every BATCH and SHADOW review would triple token costs for diminishing returns. The highest-stakes decisions get the most scrutiny.

### Why seeded faults from a taxonomy, not generated by the researcher?

The researcher agent would generate faults it already knows how to detect (because it generated them). The fault taxonomy is based on _real errors from historical research_ — errors the system actually failed to catch in the past. This makes SFI an empirical calibration tool, not a self-test.

### Why blind-first, not blind-only?

R2 needs the full context to do a thorough review. But it needs to form _independent_ opinions first. BFP is a two-phase process within one review, not two separate reviews. This avoids doubling cost while still breaking anchoring bias.

### Why JSON Schema, not a custom validator?

1. JSON Schema is a standard with existing validators in every language
2. It's declarative (schema files are data, not code)
3. It's auditable (you can read the schema and know exactly what's enforced)
4. It works with Claude Code's existing file-based architecture
5. The schemas are READ-ONLY artifacts — agents cannot modify them

### Why no cross-model R2 by default?

RECONCILE (Chen et al.) shows multi-model debate (ChatGPT + Bard + Claude) beats single-model multi-agent. But arXiv:2502.00674 shows mixing models can WORSEN results if a weak model is introduced. Our empirical evidence came from Claude+GPT (both strong), but mandating cross-model R2 creates an external dependency that breaks the MIT self-contained architecture.

**Decision**: Cross-model R2 is an OPTIONAL audit mode, not the default. Activated on:
- Claims with confidence >= 0.80 destined for paper abstract/figures
- Claims where internal R2 and researcher disagree after 2+ rounds
- Random sampling (10% of FORCED reviews) for calibration

When available, log: model_id, model_version, prompt, verdict — for reproducibility.

### CRITICAL NOTE: Empirical Evidence Came from Cross-Model R2

During the 21 CRISPR sprints that generated all empirical data cited in this document (34 claims registered, 11 killed/downgraded, OR=2.30 confounded claim caught), the actual setup was:

- **Researcher**: Claude (in Claude Code)
- **R2**: ChatGPT (manually, with human-mediated copy-paste of messages and files)

This was NOT SOLO mode. It was **manual cross-model TEAM mode** with three layers of external feedback:
1. **Context separation** (different chat windows)
2. **Model diversity** (Claude vs GPT — different architectural biases)
3. **Human mediation** (user decided what to pass and when)

**Implications for v5.0**:
- TEAM mode (Claude+Claude, separate contexts) preserves (1) but loses (2) and (3)
- SOLO mode (same Claude, same context) loses all three
- The SFI + BFP + R3 innovations are designed to partially compensate for the loss of (2) model diversity and (3) human mediation

**Open question for future work**: Should v5.0 support an optional cross-model R2 via MCP server or API call? This would restore model diversity (the strongest factor) at the cost of an external dependency.

**For the VibeX paper**: We must be transparent: "Our empirical results were obtained with cross-model adversarial review (Claude researcher, GPT reviewer, human mediator). The automated TEAM mode architecture preserves context separation but not model diversity. The v5.0 innovations (SFI, BFP, R3, schemas) are designed to structurally compensate for this loss."

---

## NAMING AND VERSIONING

| Field | Value |
|-------|-------|
| Version | 5.0.0 |
| Codename | IUDEX |
| Full name | Vibe Science v5.0 — IUDEX |
| Architecture | OTAE-Tree + R3 Judge |
| Lineage | v3.5 TERTIUM DATUR → v4.0 ARBOR VITAE → v4.5 ARBOR VITAE (Pruned) → v5.0 IUDEX |
| Changelog entry | "v5.0.0 — Seeded Fault Injection, Judge Agent (R3), Blind-First Pass, Schema-Validated Gates. 27 gates (2 new: V0, J0). 8 gates schema-enforced. R2 structurally unbypassable." |

---

## RELATIONSHIP TO VIBEX 2026 PAPER

The v5.0 architecture provides new material for the VibeX 2026 paper:

1. **Section 2 (Background)**: Cite Huang et al. (2024), Gou et al. (2024), Kamoi et al. (2024) to ground the problem. "LLMs cannot self-correct reasoning without external feedback. This has been proven empirically."

2. **Section 3 (Architecture)**: Present the v5.0 innovations as the architectural response to this limitation. The key narrative: "We don't just prompt the agent to be critical. We make it architecturally impossible to bypass the adversarial review."

3. **Section 4 (Evaluation)**: The SFI mechanism provides a _measurable_ evaluation of R2's effectiveness. We can report: "Of N seeded faults injected, R2 detected X% on first pass." This is a concrete metric for the paper.

4. **Section 5 (Case Study)**: The fault taxonomy is derived from 21 real sprints of CRISPR research. This grounds the system in empirical experience, not theory.

5. **Section 6 (Related Work)**: Position against CRITIC (Gou et al.), Kamoi survey, and the peer review literature (Krlev, Watling, Jefferson). Our contribution: "While CRITIC validates tool-interactive correction, we show that even tool use must be structurally enforced, not just prompted."

---

## IMPLEMENTATION NOTES

### Destination Directory
```
F:\Tesi_Python_scRNA\nuove_skill\Vibe-Science-5.0\vibe-science-v5.0\
```

### Starting Point
Copy entire v4.5 directory, then apply modifications per atomic tasks.

### Order of Operations
1. Copy v4.5 → v5.0
2. Run Layer 0 tasks in parallel (17 new files including circuit-breaker.md)
3. Run Layer 1 tasks (3 update files)
4. Run Layer 2 tasks (3 update files)
5. Run Layer 3 verification (1 task)
6. Total: 24 tasks, estimated ~1,800 new/modified lines

### Quality Assurance
- Every new protocol file must be consistent with the 10 Laws
- Every schema must validate against real v4.5 gate artifacts
- R3 rubric must be tested against real R2 ensemble reports from v3.5/v4.0
- Fault taxonomy must map to real errors documented in sprint reports

---

## v5.5 ROADMAP (deferred from v5.0 review)

These items were identified during the v5.0 blueprint review (cross-model adversarial review with ChatGPT and Gemini 3) as valuable but premature for v5.0. They are parked here for v5.5 planning.

**Review convergence note**: ChatGPT and Gemini 3 independently identified the same 5 gaps (calibration, golden set, anti-gaming, cross-model audit, provenance). This convergence validates the roadmap prioritization. The only item unique to Gemini was the Circuit Breaker (now promoted to v5.0 Enhancement E) and the explicit permission model (now Enhancement F).

### v5.5 — Confirmed (ORO)

| ID | Feature | Description | Prerequisite |
|----|---------|-------------|--------------|
| R5.5-01 | **Calibration Log** | Structured log mapping `claim_id → predicted_confidence → actual_outcome` (replicated / killed / revised / published). Accumulates across sessions. | v5.0 running with 10+ sessions |
| R5.5-02 | **Golden Claims Test Suite** | 10-15 claims with known correct outcomes (from 21 CRISPR sprints) as regression tests for gates. Run on every version bump. | Fault taxonomy (T-05) + sprint reports |
| R5.5-03 | **Cross-Model Audit Protocol** | Formalize the optional cross-model R2: MCP/API interface, model version logging, activation policy (confidence >= 0.80 OR internal disagreement >= 2 rounds OR 10% random FORCED), divergence handling. | v5.0 cross-model note |
| R5.5-04 | **Anti-Gaming Metrics** | Secondary metrics that penalize suspicious patterns: false kill rate by R2 reviewer, review diversity score (are all reviews identical?), SFI fault rotation enforcement. Goodhart mitigation. | SFI (T-01) + R3 (T-02) running |
| R5.5-05 | **Dataset Hash in Seed Schema** | Add `dataset_hash` field to serendipity seed schema for lightweight provenance. SHA-256 of input data files referenced by the seed. No W3C PROV overhead. | Seed schema (T-15) |

### v6.0 — Deferred (needs more data or is overengineering for now)

| ID | Feature | Why Deferred |
|----|---------|-------------|
| R6.0-01 | **Confidence Calibration (Brier/ECE)** | Requires >>34 claims with known outcomes to compute meaningful calibration curves. Collect the log in v5.5, calibrate in v6.0. |
| R6.0-02 | **R-C Collinearity Resolution** | Merge R and C into "External Validation" or use Choquet integral. Needs calibration data to choose. |
| R6.0-03 | **Threat Model + Security Gate** | Plugin runs locally with controlled MCP servers. Web-facing agent security (prompt injection, tool hijacking) is a real concern but not for current deployment model. Revisit if Vibe Science becomes a hosted service. |
| R6.0-04 | **Log-Odds / Bayes Factor Confidence** | Elegant but requires explicit priors and likelihood functions. Too much overhead for v5.x. Natural evolution path for Evidence Engine if calibration data is available. |
| R6.0-05 | **W3C PROV Provenance** | Enterprise-level overhead. Claim ledger + structured seed schema + dataset_hash (v5.5) provides adequate provenance for a research plugin. |

### Rejected

| Proposal | Why Rejected |
|----------|-------------|
| Dempster-Shafer full framework | Conflicting evidence combination is unstable/paradoxical (see Dezert 2019). The geometric mean with floor achieves "ignorance ≠ disbelief" without the DS baggage. |
| Separate "missingness" dimension | Adds a 6th component to the formula for marginal gain. The dynamic floor (v5.0) already distinguishes "missing" from "low" via claim type context. |

---

_This blueprint was prepared based on: v4.5 ARBOR VITAE (Pruned) architecture, 21 sprints of CRISPR case study data, peer-reviewed literature on LLM self-correction and peer review effectiveness, and 7+ reverse-engineered upstream skill architectures._

_The philosophy: "Non e' il prompt che fa la differenza. E' il sistema che IMPEDISCE al prompt di mentire."_

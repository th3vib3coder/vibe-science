# Vibe Science v5.5 — ORO-PHOTONICS

> **Codename**: ORO-PHOTONICS (Observe · Recall · Operate — Photonics Fork)
> **Lineage**: v3.5 TERTIUM DATUR → v4.0 ARBOR VITAE → v4.5 ARBOR VITAE (Pruned) → v5.0 IUDEX → v5.5 ORO → **v5.5-ORO-PHOTONICS**
> **Status**: BLUEPRINT — Architecture Document for Implementation
> **Based on**: Vibe Science v5.5 ORO architecture
> **License**: MIT

---

## EXECUTIVE SUMMARY

v5.5 ORO-PHOTONICS addresses a fundamental problem proven by peer-reviewed research: **LLMs cannot self-correct reasoning without external feedback** (Huang et al., ICLR 2024). This fork specializes the Vibe Science v5.0 architecture for **literature-based research in photonics and high-speed optical interconnects** — specifically IM-DD (intensity modulation / direct detection), VCSEL (vertical-cavity surface-emitting laser) systems, and PAM4 modulation at data rates from 25 Gb/s to 200+ Gb/s.

The core architectural challenge in photonics research is different from wet-lab biology: **the domain expert knows more than the model about device physics**. An LLM can hallucinate claims that violate the Shannon limit, thermodynamic constraints, or fundamental optical physics — and without structural enforcement, no amount of prompting will reliably catch these violations. The model does not have intuition for what is physically plausible in a 850 nm VCSEL at 85C operating at 112 Gb/s PAM4.

v5.5-PHOTONICS inherits all four innovations from the base IUDEX architecture, adds a **fifth innovation** (Expert Knowledge Injection), and extends the enhancement set with a **seventh enhancement** (Human Expert Gates):

**Innovations** (new mechanisms):
1. **Seeded Fault Injection (SFI)** — Inject known errors; if R2 misses them, the review is invalid
2. **Judge Agent (R3)** — A third agent meta-reviews R2's review quality with a rubric
3. **Blind-First Pass (BFP)** — R2 reviews claims before seeing the researcher's justifications
4. **Schema-Validated Gate Artifacts (SVG)** — Critical gates enforce structure via JSON Schema, not just prompts
5. **Expert Knowledge Injection (EKI)** — Domain expert assertions are captured, stored, and enforced as ground truth that R2 must consult before every review

**Enhancements** (strengthening existing mechanisms):
A. R2 Salvagente — killed claims preserve serendipity seeds
B. Structured Serendipity Seed Schema — actionable research objects, not notes
C. Quantified Exploration Budget — LAW 8 gains a measurable 20% floor
D. Confidence Formula Revision — hard veto + geometric mean with dynamic floor
E. Circuit Breaker — deadlock prevention with DISPUTED state
F. Agent Permission Model — least privilege, separation of verdict from execution
G. **Human Expert Gates (HE0-HE3)** — Four blocking gates where the domain expert validates physical plausibility, context correctness, and conclusion completeness

Everything else from v4.5 stays. The 10 Laws (LAW 8 principle preserved, enforcement quantified), OTAE-Tree, 5-Stage Manager, Evidence Engine, Serendipity Engine, Brainstorm Engine, all 25 existing gates — untouched. v5.5-PHOTONICS is additive, not a rewrite. It adds domain-specific adaptations on top of the proven IUDEX foundation, plus 7 new gates from v5.5 ORO.

**v5.5 ORO Additions** (post-mortem driven, domain-general):
H. **Literature Pre-Check (L-1)** — Mandatory literature search BEFORE committing to a research direction. Uses IEEE Xplore, Optica Publishing, arXiv (physics.optics, eess.SP).
I. **Data Quality Gates (DQ1-DQ4)** — Four mandatory gates at post-extraction (DQ1), post-training (DQ2), post-calibration (DQ3), and post-finding (DQ4).
J. **Data Dictionary Gate (DD0)** — Document every dataset column before using it. Column names lie.
K. **Design Compliance Gate (DC0)** — Verify execution matches the stated research design at each phase transition.
L. **R2 INLINE Mode** — 7-point checklist at every finding formulation, before CLAIM-LEDGER entry.
M. **SSOT (Single Source of Truth)** — Numbers originate from structured data files only. FINDINGS.md tables are generated, never hand-written.
N. **Structured Logbook** — Mandatory LOGBOOK.md entry in CRYSTALLIZE for every OTAE cycle.
O. **Operational Integrity Checks** — Orphaned datasets, document sync, design-execution drift detection in OBSERVE phase.

Gate count: 25 existing gates + 4 HE gates (PHOTONICS) + 7 v5.5 gates = **36 total gates**.

---

## PROBLEM STATEMENT: WHY v5.5-PHOTONICS IS NECESSARY

### The Empirical Evidence (LLM Self-Correction)

| Paper | Finding | Implication for Vibe Science |
|-------|---------|------------------------------|
| Huang et al. (2024), "Large Language Models Cannot Self-Correct Reasoning Yet", ICLR 2024 | Intrinsic self-correction is ineffective; performance _degrades_ after self-correction. Specifically: 74.7% of the time the model retains its initial answer, and among changes, **more flip correct→incorrect than incorrect→correct**. | R2 in SOLO mode (same context window) is fundamentally limited. The LLM reviewing its own work cannot reliably detect its own errors. TEAM mode (separate context) is better but still same model. |
| Du et al. (2024), "Improving Factuality through Multiagent Debate", ICML 2024 | Multiple LLM agents debating reduces factual errors by 30%+. Accuracy improves with more agents and more debate rounds. | Direct empirical validation of R2 Ensemble's multi-reviewer architecture. More reviewers, more scrutiny rounds = better detection. |
| Gou et al. (2023), "CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing", ICLR 2024 | Self-correction works ONLY when external tools provide feedback. The model's own critiques "contribute marginally." | Validates v4.5's tool-use mandate for R2 (web search, IEEE Xplore, Scopus). But prompt-level mandates can be circumvented. Need structural enforcement. |
| Kamoi et al. (2024), "When Can LLMs Actually Correct Their Own Mistakes?", TACL 2024 | No prior work demonstrates successful self-correction from prompted LLMs alone. Works only with reliable external feedback or fine-tuning. | The adversarial prompt is necessary but insufficient. R2 needs _architectural_ guarantees, not just behavioral instructions. |
| Krlev & Spicer (2023), "Reining in Reviewer Two", JMS | Epistemic respect requires assessing arguments on soundness, not origin. Good review = specific, developmental, evidence-based. Bad review = performative, vague, authority-based. | R2 must be calibrated: destructive but epistemically rigorous. Not theatrical rejection, but surgical evidence-based demolition. The Blind-First Pass implements this. |
| Watling et al. (2021), "Don't Be Reviewer 2" | Researchers respond best to specific, developmental feedback. Checklist-only reviews feel mechanical and are less effective. | R2's Red Flag Checklist (v4.5) is a floor, not a ceiling. The Judge Agent evaluates whether R2's review is actually substantive. |

### The Photonics-Specific Problem

Beyond the general LLM self-correction problem, photonics research introduces **domain-specific failure modes** that make expert involvement structurally necessary:

1. **Physical impossibility blindness**: An LLM may claim a VCSEL achieves 200 Gb/s PAM4 at 850 nm over 500 m of OM3 fiber without recognizing that modal bandwidth limitations make this physically impossible. The model lacks intuition for the interplay between chromatic dispersion, modal dispersion, relative intensity noise (RIN), and receiver bandwidth.

2. **Simulation-reality gap**: Published simulation results in photonics routinely show 2-3 dB better performance than experimental validation. An LLM treating simulation results as equivalent to experimental data will systematically overestimate system capabilities.

3. **Missing practical constraints**: Academic photonics papers often omit manufacturing yield, thermal management cost, packaging complexity, and reliability (MTBF) — constraints that determine real-world viability. An LLM summarizing such papers inherits these blind spots.

4. **Standard confusion**: IEEE 802.3 defines dozens of optical interface standards (802.3bs, 802.3cd, 802.3cm, 802.3cw, 802.3db, 802.3df) with overlapping specifications. An LLM can easily conflate specifications from different standards or cite superseded versions.

5. **Literature is public, data is proprietary**: In photonics, experimental measurement data is typically proprietary. This fork is designed for **literature-based research** — synthesizing and critically analyzing published findings, not processing raw experimental datasets. The expert knows what the literature cannot say because they have seen the unpublished data.

### The Gap v5.5-PHOTONICS Closes

The base IUDEX architecture closes three gaps (rubber-stamp reviews, anchoring bias, schema circumvention). The PHOTONICS fork closes two additional gaps:

4. **Physics-blind review**: R2 has no intuition for what is physically plausible. The R2-Physics reviewer and Expert Knowledge Injection provide this grounding.
5. **Expert knowledge loss**: The domain expert corrects the model verbally ("that doesn't work because the modal bandwidth is too low"), but this correction is lost after the session. Expert Knowledge Injection captures and enforces these corrections permanently.

---

## THE FIVE INNOVATIONS

### Innovation 1: Seeded Fault Injection (SFI)

**Problem it solves**: How do you know R2 is actually catching errors, vs. rubber-stamping?

**Mechanism**:
Before submitting a set of claims to R2 for review, the system (orchestrator-level, NOT the researcher agent) injects 1-3 known faults into the claim set. These faults are drawn from a fault taxonomy and are _realistic_ — they mimic the actual errors found in photonics literature reviews.

**Fault Taxonomy** (adapted for photonics research):

| Fault ID | Category | Description | Example |
|----------|----------|-------------|---------|
| SFI-01 | Confounded claim | Performance gain that disappears when controlling for operating conditions | 3 dB sensitivity improvement that vanishes when controlling for temperature and fiber type |
| SFI-02 | Already-known finding | "Discovery" that is established in the literature | Presenting the PAM4 BER floor for a given extinction ratio as a novel finding |
| SFI-03 | Physical impossibility | Claim that violates fundamental physics | Claiming IM-DD transmission exceeds Shannon limit for the given SNR; violating thermodynamic constraints on VCSEL wall-plug efficiency; exceeding modal bandwidth-length product of specified fiber |
| SFI-04 | Noise-as-signal | Effect size below measurement uncertainty | 0.1 dB power penalty improvement reported as significant when measurement uncertainty is +/-0.3 dB |
| SFI-05 | Simulation-only claim | Result validated only in simulation, presented as experimentally demonstrated | Link budget analysis based on ideal component models without manufacturing tolerances, aging, or connector losses |
| SFI-06 | Citation fabrication | DOI that doesn't resolve, or paper that doesn't say what's claimed | Fake DOI or misattributed experimental result |
| SFI-07 | Statistical artifact | p-value from wrong test, or multiple testing without correction | Cherry-picked BER measurement at optimal temperature ignoring the full operating range; comparing BER at different data rates without normalization |
| SFI-08 | Missing practical constraint | Comparison without accounting for real-world constraints | Claiming a new modulation format outperforms PAM4 without accounting for DSP power consumption, manufacturing yield, thermal budget, or packaging cost |

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
| **RMS (Review Mutation Score)** | caught / (injected - equivalent) | R2 vigilance on known faults |
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
  RMS >= 0.80 (at least 80% of non-equivalent faults caught)
  Detection was substantive (must identify the specific flaw, not just "suspicious")
  FAR <= 0.10 (no more than 10% false alarms on clean claims)
  r2_vigilance_failures < 3 in current session

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
- **Fault generation is HUMAN-ONLY**: The LLM does not generate faults for itself. The taxonomy is authored by the human architect based on real errors encountered in photonics literature analysis. This ensures faults test genuine blind spots, not self-test capability.

**R2 awareness note**: R2 can read the fault taxonomy YAML (it's in the plugin files). R2 knows the 8 fault CATEGORIES but not WHICH specific faults were injected into WHICH specific claims in this review. This is analogous to knowing a test covers "physics, signal processing, device characterization" but not knowing the specific questions. The value of SFI is ensuring R2 does the work (checks physical plausibility, verifies DOIs, validates performance claims against known limits), not that the faults are surprising.

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
| **Specificity** | No specific references to claims or evidence | References claims by ID but critique is generic | Identifies specific flaws with evidence locations | Pinpoints exact values, parameters, or physical constraints that fail |
| **Counter-evidence search** | No external search performed | Searched but only confirming sources | Searched for contradictions in 1 database | Searched 2+ databases (IEEE Xplore, arXiv, Optica) for contradictions, prior art, known limitations |
| **Confounder analysis** | No confounder discussion | Mentions confounders generically | Identifies specific confounders for specific claims (temperature, fiber type, aging) | Demands and designs specific tests for each confounder |
| **Falsification demand** | No falsification tests requested | Generic "more testing needed" | Specific tests requested for major claims | Specific tests with expected outcomes if claim is false (e.g., "If thermal rollover is the cause, BER should degrade by >1 order of magnitude at 85C vs 25C") |
| **Independence** | Review echoes researcher's framing | Some original analysis but mostly follows researcher's structure | Independent structure with some original observations | Completely independent analysis, discovers issues researcher didn't anticipate (e.g., identifies a physical limit the researcher overlooked) |
| **Escalation** | No demands or actions | Generic demands without deadlines | Specific demands with priorities | Specific demands with deadlines, clear PASS/FAIL criteria |

**Scoring**:
- Total possible: 18 points
- PASS threshold: >= 12 (adequate on all dimensions)
- WEAK PASS: 9-11 (acceptable but R2 warned to increase rigor next round)
- FAIL: < 9 (review is rejected, R2 must redo with higher rigor)

**Anti-gaming rule**: An RCT on peer review quality (PMC, 2024) shows unnecessarily longer reviews are rated as higher quality even by meta-reviewers — a length bias. R3 MUST NOT penalize brevity. A 3-line review that identifies a specific fatal flaw (e.g., "claim violates modal bandwidth-length product limit for OM3 at this wavelength") scores higher than a 3-page review that restates concerns generically. The rubric dimensions reward **specificity and evidence**, not verbosity.

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
  R3 rubric total >= 12
  No dimension scored 0 (all aspects addressed)
  Counter-evidence search dimension >= 2 (must actually search)

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
  - What physical limits constrain this claim? (PHOTONICS-SPECIFIC)
  - My independent assessment: SUSPICIOUS | PLAUSIBLE | STRONG

PHASE 2 — FULL REVIEW (R2 additionally receives):
  - Researcher's methodology description
  - Confidence computation (E, R, C, K, D components)
  - Counter-evidence search results
  - Confounder harness results (if available)
  - EXPERT-ASSERTIONS.md (any relevant expert ground truth)

  R2 MUST:
  - Compare Phase 1 assessment with Phase 2 evidence
  - Flag any claim where Phase 2 evidence does NOT address Phase 1 concerns
  - Check claim against EXPERT-ASSERTIONS.md for contradictions
  - Produce final ensemble report (existing YAML schema)
  - Note discrepancies: "My blind assessment expected X, researcher addressed Y but not Z"

OUTPUT: Standard ensemble report + blind_assessment_comparison section
```

**Why this works**: It forces R2 to think independently before being influenced by the researcher's framing. The comparison between blind assessment and full review reveals anchoring — if R2's concerns evaporate after seeing the justification without the justification actually addressing them, that's anchoring bias, and R3 can catch it.

**Photonics-specific Phase 1 question**: The mandatory question "What physical limits constrain this claim?" forces R2 to consider Shannon limit, bandwidth-distance products, thermodynamic efficiency limits, and component-level constraints BEFORE seeing the researcher's analysis. This is critical because photonics claims frequently approach fundamental physical limits, and the model must identify these boundaries independently.

**CoVe integration** (from Chain-of-Verification, arXiv:2309.11495): Phase 1 is strengthened by the CoVe pattern. Instead of just assessing, R2 generates **verification questions** for each claim ("What would need to be true for this to hold? What standard defines the limit? What database would contain counter-evidence?"). In Phase 2, R2 answers these questions with the full context. This creates a structured anti-anchoring barrier even in SOLO mode.

**Integration with R3**: The Judge Agent (R3) explicitly scores the "Independence" dimension of the rubric. BFP provides structural evidence for this score: if R2's Phase 1 concerns disappear in Phase 2 without being addressed, Independence score drops.

**SOLO mode enhancement — Self-Consistency** (Wang et al., arXiv:2203.11171): In SOLO mode, for FORCED reviews on high-risk claims (confidence >= 0.60), R2 generates N=3 independent assessments (different sampling) and takes the **most conservative** verdict (not majority vote). This creates divergence without context separation. Huang et al. confirm self-consistency often outperforms multi-agent debate at equal compute cost.

**File**: `protocols/blind-first-pass.md`

---

### Innovation 4: Schema-Validated Gate Artifacts (SVG)

**Problem it solves**: Gate artifacts are free-text. An agent can write "link budget analysis: DONE" without actually running it. Schema validation makes this structurally impossible.

**Mechanism**:
Critical gate artifacts must conform to a JSON Schema. The schema defines required fields, types, and constraints. If the artifact doesn't validate against the schema, the gate FAILS — regardless of what the prose says.

**Which gates get schema enforcement** (8 of 36 — the highest-stakes ones):

| Gate | Schema File | What It Enforces |
|------|-------------|-----------------|
| D1 (Claim Promotion) | `schemas/claim-promotion.schema.json` | Evidence chain must have verified DOIs, confidence computed with formula (all 5 components present as floats), confounder_harness object with raw/conditioned/matched results, counter_evidence_search with at least 1 database searched |
| D2 (RQ Conclusion) | `schemas/rq-conclusion.schema.json` | All claims referenced by ID, all have status VERIFIED or CONFIRMED, R2 final verdict present, tree snapshot reference |
| S4 (Ablation Exit) | `schemas/stage4-exit.schema.json` | Ablation matrix present (array of ablation objects with component, removed, metric_delta), multi-configuration results (array >= 3), confounder harnesses for all promoted claims |
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

**Honest limitation**: Schema validation ensures structural completeness (all required fields present, correct types, non-empty arrays) but NOT truthfulness. An agent can produce a perfectly valid JSON artifact with fabricated results. SVG catches "hallucinated compliance" (claiming work was done without producing structured output) but not "fabricated compliance" (producing structured output with invented data). The defense against fabrication is layered: SFI tests whether R2 actually catches errors, BFP tests whether R2 thinks independently, R3 tests whether R2's review references real evidence locations, and Expert Knowledge Injection provides human ground truth. No single mechanism is sufficient; the combination is the defense.

**File**: `protocols/schema-validation.md`
**Artifacts**: `schemas/` directory with 9 JSON Schema files (8 gate schemas + serendipity-seed schema)

---

### Innovation 5: Expert Knowledge Injection (EKI)

**Problem it solves**: In photonics research, the domain expert possesses knowledge that no LLM has — practical device physics intuition, unpublished experimental results, industry constraints that never appear in papers. When the expert says "that doesn't work because the modal bandwidth is too low at that wavelength," this correction must not be lost after the session ends.

**Mechanism**:
Expert assertions are captured from natural conversation, stored in a structured file (`EXPERT-ASSERTIONS.md`), and enforced as ground truth that R2 must consult before every review. Claims that contradict expert assertions are immediately flagged.

**EXPERT-ASSERTIONS.md** (stored in `.vibe-science/`):

```markdown
# Expert Assertions — Ground Truth

## Format
EA-NNN: "[assertion text]"
- Source: Expert
- Domain: [photonics | VCSEL | IM-DD | PAM4 | fiber | system]
- Confidence: [HIGH | MEDIUM]
- Date: YYYY-MM-DD
- Context: "[why this matters]"

## Assertions

EA-001: "OM3 fiber modal bandwidth at 850 nm is 2000 MHz*km — any reach
         claim must respect this limit"
- Source: Expert
- Domain: fiber
- Confidence: HIGH
- Date: 2026-01-15
- Context: "Many papers ignore modal bandwidth when claiming long-reach
           850 nm links"

EA-002: "VCSEL wall-plug efficiency at 85C is typically 15-25% — claims
         of >30% at high temperature need extraordinary evidence"
- Source: Expert
- Domain: VCSEL
- Confidence: HIGH
- Date: 2026-01-15
- Context: "Thermal rollover severely limits efficiency at high temperature"
```

**Linguistic triggers for automatic capture**:
The system monitors the expert's natural language for assertion signals:
- "that doesn't work because..."
- "actually..."
- "the problem is..."
- "in reality..."
- "from my experience..."
- "the literature doesn't mention that..."
- "the real constraint is..."
- "nobody does that because..."

When a trigger is detected, the system proposes capturing the assertion:
```
EXPERT said: "Actually, you can't use NRZ above 28 Gb/s on standard
OM3 without significant ISI — the modal bandwidth just isn't there."

SYSTEM: Detected expert assertion. Proposed capture:
  EA-003: "NRZ above 28 Gb/s on OM3 encounters significant ISI due
           to modal bandwidth limitations"
  Domain: fiber
  Confidence: HIGH
  Capture? [Y/n]
```

**Claim collision detection**:
When a new claim is registered or an existing claim is updated, the system checks it against all expert assertions:

```
CLAIM COLLISION DETECTION

FOR each claim C in CLAIM-LEDGER.md:
  FOR each assertion EA in EXPERT-ASSERTIONS.md:
    IF C.text semantically contradicts EA.assertion:
      → FLAG: "EXPERT COLLISION: Claim C-xxx contradicts EA-xxx"
      → claim.status = EXPERT_DISPUTED (immediate, no R2 needed)
      → R2 MUST address this collision in next review
      → Resolution requires: expert confirms claim overrides assertion,
        OR claim is modified to be compatible,
        OR claim is killed

SEVERITY:
  - EA.confidence = HIGH → collision is BLOCKING (claim cannot advance)
  - EA.confidence = MEDIUM → collision is WARNING (R2 must address but claim can advance)
```

**R2 integration**:
- R2 MUST read `EXPERT-ASSERTIONS.md` before every review (FORCED, BATCH, and SHADOW)
- R2's BFP Phase 1 now includes: "Does this claim contradict any expert assertion?"
- R2's ensemble report includes: `expert_assertions_checked: [EA-001, EA-002, ...]`
- If R2 issues a verdict that contradicts an expert assertion, the orchestrator flags this as a potential R2 error

**Brainstorm integration**:
Brainstorm Step 1 (UNDERSTAND) now includes an **Expert Knowledge Harvest** sub-step:
```
EXPERT KNOWLEDGE HARVEST (Brainstorm Step 1 addition)

Before proceeding with literature review, ask the expert:
1. "What do you already know about this topic that the literature might not capture?"
2. "What are the practical constraints that papers in this area typically ignore?"
3. "What is the current state-of-the-art in practice (not just in publications)?"

Capture responses as EA-xxx assertions.
These assertions become ground truth for the entire research question.
```

**File**: `protocols/expert-knowledge.md`
**Artifacts**: `.vibe-science/EXPERT-ASSERTIONS.md`

---

## ADDITIONAL ENHANCEMENTS

These enhancements strengthen existing mechanisms without adding new agents or fundamental complexity.

### Enhancement A: R2 Salvagente Protocol

**Problem**: When R2 kills a claim, it kills it completely. But there are two types of death:
- **Physically false** (e.g., "exceeds Shannon limit at given SNR" — fundamentally impossible) → dead, end of story
- **Insufficient evidence** (e.g., interesting performance trend but not controlled for temperature) → could be true, just premature

Currently, both types are treated identically. This means R2 can prune away genuinely interesting research directions that simply need more data.

**Mechanism**: When R2 kills a claim with reason INSUFFICIENT_EVIDENCE (not PHYSICALLY_FALSE or ARTIFACT), R2 MUST produce a serendipity seed containing:
- The interesting kernel of the claim (what made it worth investigating)
- A minimum discriminating test (one specific test that would resolve it)
- Pointer to the original claim_id and evidence that existed

**Example** (photonics):
```yaml
salvaged_seeds:
  - seed_id: SEED-20260215-001
    source_claim_id: C-012
    kill_reason: INSUFFICIENT_EVIDENCE
    interesting_kernel: "VCSEL achieves 50 Gb/s NRZ with BER < 1e-12
                        at 25C — potentially significant for low-cost
                        short-reach links"
    minimum_test: "Verify performance at 85C industrial temperature —
                  if BER stays below FEC threshold (1e-4 for KP4),
                  the claim has practical value"
    existing_evidence: "Single paper, single temperature point,
                       no reliability data"
    estimated_test_cost: LOW
```

**Integration**: Added to R2 ensemble output schema as `salvaged_seeds[]` array. Each salvaged seed is automatically written to SERENDIPITY.md with status `SALVAGED_FROM_R2` and enters the triage queue.

**Rule**: R2 can ONLY skip salvagente when kill_reason is PHYSICALLY_FALSE or KNOWN_ARTIFACT. For INSUFFICIENT_EVIDENCE, CONFOUNDED, or PREMATURE, salvagente is mandatory.

### Enhancement B: Structured Serendipity Seed Schema

**Problem**: Current serendipity entries in v4.5 have: description, score, source, status. This is a note, not an actionable research object. Seeds without structure become stale and unactionable.

**Enhanced schema** (replaces current free-text entries):

```yaml
seed_id: SEED-YYYYMMDD-NNN
status: PENDING_TRIAGE | QUEUED | TESTING | KILLED | PROMOTED_TO_CLAIM
source: SCANNER | SALVAGED_FROM_R2 | CROSS_BRANCH | USER | EXPERT
score: 0-20 (serendipity engine score)

# Mandatory causal structure
causal_question: "[one-line: what causes what?]"
falsifiers:     # 3-5 specific ways this could be an illusion
  - "[temperature dependence would explain this away]"
  - "[selection bias in cited papers — only positive results]"
  - "[known artifact of simulation method used]"
discriminating_test: "[one specific test that separates real from artifact]"
fallback_test: "[backup test if primary is infeasible]"
expected_value: "[impact if true] x [probability estimate] x [test cost]"

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

**EXPERT source**: Seeds with `source: EXPERT` receive a minimum score of 10 (out of 20), reflecting the high prior probability that expert observations are worth investigating.

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

**Problem**: v4.5 computes confidence as `C = E x R x C x K x D` (product of 5 components, each [0,1]). A single zero kills confidence. But zero means DIFFERENT THINGS for different components:

| Component | Zero means | Should kill? |
|---|---|---|
| **E** (Evidence quality) | No verifiable source | YES — LAW 1 |
| **D** (Data quality) | Corrupt/invalid data | YES — garbage in = garbage out |
| **C** (Consistency) | Contradicts all known findings | ALMOST — but genuine breakthroughs can contradict consensus |
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
  confidence = E x D x (R_eff x C_eff x K_eff)^(1/3)

  E, D: product (hard veto — zero kills)
  R, C, K: geometric mean (softer, compensatory)
  Floor 0.10: prevents "unknown" from killing; "unknown" ≠ "contradicted"
```

**Properties**:
- E=0 or D=0 → confidence = 0 (unchanged, LAW 1 preserved)
- R=0 (new finding) → R_eff = 0.10, confidence penalized but NOT killed
- K=0 (no mechanism) → K_eff = 0.10, same protection for serendipitous findings
- All components = 1.0 → confidence = 1.0 (unchanged)
- All soft components = 0.10 → confidence ≈ E x D x 0.10 (heavy penalty, not death)

**Dynamic floor by claim type and stage** (v5.0 refinement):

The fixed floor of 0.10 is a reasonable default, but different claim types at different stages have different tolerance for "unknown":

| Claim Type | Stage | Floor | Rationale |
|------------|-------|-------|-----------|
| Descriptive / Correlative | Stage 1-2 (Preliminary/Hyperparameter) | 0.05 | Early exploration — "unknown" is expected and acceptable |
| Descriptive / Correlative | Stage 3+ (Research Agenda onward) | 0.10 | Should have some validation by now |
| Causal / Mechanistic | Any stage | 0.15 | Stronger claims need stronger evidence to survive |
| Paper-critical (abstract/figures) | Stage 5 (Synthesis) | 0.20 | Highest bar — if R or K is still 0, that's a red flag for paper inclusion |

Implementation: the floor is selected at gate evaluation time based on `claim.type` and `current_stage`. The formula itself doesn't change — only the floor parameter.

**Expert assertion as evidence source**: In the PHOTONICS fork, expert assertions contribute to the E (Evidence) component. An expert assertion with HIGH confidence provides E = 0.80 (strong but not perfect — the expert could be wrong). An expert assertion with MEDIUM confidence provides E = 0.60. This ensures expert knowledge is weighted appropriately — significant but not infallible.

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
R2: "You must verify BER at 85C industrial temperature"
Researcher: "No experimental data available — paper only reports 25C results"
R2: "Without temperature verification, verdict is REJECT"
Researcher: "Gate won't pass without your ACCEPT"
→ Infinite loop. Tokens burn. No progress.
```

This happens whenever R2 demands a test that is impossible given the available literature. It's not a bug in R2's logic — the demand is correct — but the system has no mechanism to resolve an irreconcilable disagreement.

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
     a. Stage transitions (new literature may resolve the dispute)
     b. Synthesis (Stage 5) — human expert decides
     c. If new paper/data becomes available that addresses R2's objection

PROPERTIES:
  - DISPUTED ≠ KILLED: The claim survives, flagged, for later resolution
  - DISPUTED ≠ ACCEPTED: The claim cannot be promoted to paper-grade
  - Maximum gossip rounds = 3 (configurable, but 3 is the default)
  - The circuit breaker fires LOUDLY — it's logged, reported, and visible in claim ledger
  - R2's objection is preserved verbatim — no information is lost
```

**Why 3 rounds**: Empirically, if R2 and Researcher haven't resolved it in 3 rounds with no new evidence, they won't resolve it in 10. Additional rounds are pure token waste. The disagreement is real and needs external input (new literature, expert decision, or cross-model audit).

**S5 Poison Pill**: DISPUTED claims act as a hard block at Stage Synthesis (S5). The stage CANNOT close while any claim has status DISPUTED. Resolution options at S5: (a) new literature resolves the test R2 demanded, (b) claim is voluntarily dropped by researcher, (c) expert override with documented rationale via HE3 gate. This prevents disputes from being quietly swept under the rug.

**File to create**: `protocols/circuit-breaker.md`

### Enhancement F: Agent Permission Model (Least Privilege)

**Problem**: In v4.5, all agents operate within the same Claude Code context. There is no explicit separation of who can READ vs WRITE which artifacts. In principle, R2 could modify the claim ledger directly (by editing a file) rather than producing a verdict for the orchestrator to execute.

**Principle**: Separation of verdict from execution. R2 PRODUCES a verdict. The ORCHESTRATOR executes it. R2 never writes to the claim ledger directly.

**Permission Matrix**:

| Agent | Claim Ledger | Gate Artifacts | R2 Reports | Serendipity Seeds | Expert Assertions | Schemas |
|-------|-------------|----------------|------------|-------------------|-------------------|---------|
| Researcher | READ + WRITE (creates claims) | READ + WRITE (produces artifacts) | READ only | READ + WRITE (creates seeds) | READ only | READ only |
| R2 Ensemble | READ only | READ only | WRITE (produces reports) | READ only (+ salvagente append) | READ only (MUST consult) | READ only |
| R3 Judge | READ only | READ only | READ only | READ only | READ only | READ only |
| Orchestrator | READ + WRITE (executes gate decisions) | READ + VALIDATE | READ (evaluates) | READ + WRITE (triage) | READ + WRITE (captures expert input) | READ only (enforces) |
| Expert (human) | READ only | READ only | READ only | READ + WRITE (creates seeds) | READ + WRITE (creates/edits assertions) | READ only |

**Key constraints**:
- **R2 cannot write to claim ledger** — it produces a YAML verdict (`verdict_artifact.yaml`), the orchestrator applies it
- **R3 cannot modify R2's report** — it scores the report, the orchestrator decides action
- **Schemas are READ-ONLY for all agents** — only the architect (human) can modify schemas
- **Expert assertions are WRITE for expert only** — the orchestrator captures them, but only the expert can create or edit assertions
- **Salvagente exception**: R2 CAN append to `salvaged_seeds[]` in its own report (not in Serendipity.md directly)

**Transition Validation**: The Orchestrator does NOT blindly apply R2's verdict. It validates state transitions before writing to the ledger:

| Transition | Allowed? | Condition |
|-----------|----------|-----------|
| DRAFT → VERIFIED | Yes | R2 verdict ACCEPT + gate passed |
| DRAFT → KILLED | Yes | R2 verdict REJECT + gate passed |
| DRAFT → DISPUTED | Yes | Circuit breaker triggered |
| DRAFT → EXPERT_DISPUTED | Yes | Collision with expert assertion detected |
| KILLED → VERIFIED | **NO** | Requires explicit **revival protocol**: new evidence + fresh R2 review from scratch |
| DISPUTED → VERIFIED | Yes | Dispute resolved with new evidence or expert override |
| DISPUTED → KILLED | Yes | Researcher voluntarily drops claim |
| EXPERT_DISPUTED → VERIFIED | Yes | Expert confirms claim overrides assertion |
| EXPERT_DISPUTED → KILLED | Yes | Expert confirms assertion stands |
| VERIFIED → KILLED | Yes | Post-verification evidence contradicts (rare but possible) |

Invalid transitions are logged as errors and the ledger update is rejected. This prevents "hallucinated compliance" where an agent writes history that never happened.

**Enforcement**: This is enforced by convention in v5.5-PHOTONICS (protocol instructions). In v6.0+, consider file-system-level enforcement (separate directories with different write permissions per agent context).

**File to update**: Add permission model to `SKILL.md` and reference in each protocol.

### Enhancement G: Human Expert Gates (HE0-HE3)

**Problem**: In photonics research, physical plausibility cannot be verified by an LLM alone. The domain expert must validate at critical junctures that the research direction is physically sound, the priorities are correct, and the conclusions are complete.

**Mechanism**: Four blocking gates where the system pauses and requires explicit expert confirmation before proceeding.

```
HUMAN EXPERT GATES

HE0 — POST-BRAINSTORM STEP 1 (Context Validation)
  WHEN: After Brainstorm Step 1 (UNDERSTAND) completes
  QUESTION: "Is the context correct? Are the key concepts, constraints,
            and state-of-the-art accurately captured?"
  BLOCKING: YES — system cannot proceed to Step 2 until expert confirms
  ACTIONS:
    - Expert reviews the understanding summary
    - Expert corrects any misconceptions (captured as expert assertions)
    - Expert adds missing context (captured as expert assertions)
    - Expert confirms: "Context correct" → proceed
    - Expert rejects: "Context wrong" → Brainstorm Step 1 repeats with corrections

HE1 — POST-TRIAGE STEP 6 (Priority Validation)
  WHEN: After Brainstorm Step 6 (TRIAGE) ranks the research questions
  QUESTION: "Are the prioritized research questions correct? Is the ranking
            sensible given practical constraints?"
  BLOCKING: YES — system cannot enter Stage 1 until expert confirms
  ACTIONS:
    - Expert reviews ranked RQ list
    - Expert may reorder, remove, or add RQs
    - Expert's ranking overrides the system's ranking
    - Expert vote counts 2x in triage scoring
    - Expert confirms: "Priorities correct" → proceed to Stage 1
    - Expert rejects: "Wrong priorities" → Triage repeats with expert guidance

HE2 — EVERY STAGE TRANSITION (Physical Plausibility)
  WHEN: At every stage transition (S1→S2, S2→S3, S3→S4, S4→S5)
  QUESTION: "Do the findings so far make physical sense? Is anything
            obviously wrong from a device physics perspective?"
  BLOCKING: YES — system cannot enter next stage until expert confirms
  ACTIONS:
    - Expert reviews all VERIFIED claims from current stage
    - Expert checks physical plausibility of each claim
    - Expert may flag claims as physically implausible (→ EXPERT_DISPUTED)
    - Expert may inject new assertions based on findings
    - Expert confirms: "Physically plausible" → proceed to next stage
    - Expert rejects: "Physically implausible" → specific claims flagged,
      system returns to address flagged claims before transition

HE3 — PRE-SYNTHESIS (Conclusion Completeness)
  WHEN: Before Stage 5 (Synthesis) begins
  QUESTION: "Looking at all conclusions: what is missing? What would a
            reviewer in this field immediately notice as absent?"
  BLOCKING: YES — system cannot begin synthesis until expert confirms
  ACTIONS:
    - Expert reviews all VERIFIED and CONFIRMED claims
    - Expert reviews all DISPUTED claims (resolves disputes)
    - Expert identifies missing analyses, overlooked comparisons,
      or gaps that a domain reviewer would flag
    - Missing items become new claims or RQs if needed
    - Expert confirms: "Conclusions complete" → proceed to Synthesis
    - Expert adds items: "Missing X, Y, Z" → system addresses gaps,
      then returns to HE3
```

**Properties**:
- All HE gates are BLOCKING — the system stops and waits for expert input
- Expert input at HE gates is captured as expert assertions when applicable
- HE gates cannot be bypassed by any agent (not even the orchestrator)
- HE gate outcomes are logged in PROGRESS.md with timestamp and expert decision
- In TEAM mode, HE gates are the primary mechanism for expert involvement
- In SOLO mode, HE gates are implemented as explicit pauses with prompts to the user

**Gate count impact**: 4 new HE gates bring the total from 25 to 29. With 7 additional v5.5 ORO gates, total is **36 gates**.

**File to update**: `gates/gates.md` — add HE0-HE3 section

---

## WHAT STAYS UNCHANGED FROM v4.5

Everything not listed in the innovations and enhancements above remains exactly as-is:

### Architecture (preserved, with LAW 8 quantified)
- 10 Immutable Laws (LAW 8 principle unchanged; enforcement gains measurable 20% exploration floor — see Enhancement C)
- OTAE-Tree loop (Observe-Think-Act-Evaluate inside Tree Search)
- 5-Stage Experiment Manager (Preliminary → Hyperparameter → Research Agenda → Ablation → Synthesis)
- 3 Tree modes (LINEAR, BRANCHING, HYBRID)
- 7 Node types (draft, debug, improve, hyperparameter, ablation, replication, serendipity)
- SOLO / TEAM runtime selection (TEAM mode recommended for photonics fork)
- Phase 0 Scientific Brainstorm (enhanced with Expert Knowledge Harvest)
- Session Resume Protocol

### Pillars (Evidence Engine formula updated, rest unchanged)
- Evidence Engine (confidence formula: **UPDATED in v5.0** — see Enhancement D above)
- Serendipity Engine (cross-branch detection, scoring, interrupt — with EXPERT source added)
- Analysis Orchestrator (tool dispatch, skill router — adapted for photonics tools)
- Brainstorm Engine (with v4.5 Inversion + Collision + Productive Tensions)

### R2 Ensemble (enhanced, not replaced)
- 4 reviewers: R2-Methods, R2-Stats, **R2-Physics**, R2-Eng
- R2-Physics replaces R2-Bio: electromagnetic plausibility, optics, semiconductor physics, Shannon limit, thermodynamic limits, optical component constraints
- 7 activation modes: BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT, **INLINE (v5.5)**
- Red Flag Checklist (12 flags from v4.5, adapted for photonics)
- Counter-evidence search mandate (IEEE Xplore, arXiv, Optica, SPIE, Scopus)
- DOI verification protocol
- Double-pass workflow
- What changes: FORCED reviews now include Blind-First Pass, Judge Agent, and Expert Assertion consultation

### Gates (25 base preserved, 4 HE new, 7 v5.5 new)
- Pipeline: G0-G6 (unchanged)
- Literature: L0-L2 (L0, L2 get schema enforcement)
- Literature Pre-Check: **L-1 (NEW v5.5)**
- Decision: D0-D2 (D1, D2 get schema enforcement)
- Tree: T0-T3 (unchanged)
- Brainstorm: B0 (gets schema enforcement)
- Stage: S1-S5 (S4, S5 get schema enforcement)
- Data Quality: **DQ1-DQ4 (NEW v5.5)**
- Data Dictionary: **DD0 (NEW v5.5)**
- Design Compliance: **DC0 (NEW v5.5)**
- **NEW v5.0**: V0 (R2 Vigilance), J0 (Judge)
- **NEW v5.0-PHOTONICS**: HE0 (Context), HE1 (Priority), HE2 (Plausibility), HE3 (Completeness)
- **Total**: 36 gates

### File Structure (extended, not reorganized)
All existing files preserved. New additions:

```
vibe-science-photonics/
├── (all v4.5/v5.0 files, domain-adapted)
├── CONTEXT.md                           # NEW — Context briefing for Claude
├── Vibe-Science-Photonics-BLUEPRINT.md  # NEW — This document
├── protocols/
│   ├── seeded-fault-injection.md        # (from v5.0)
│   ├── judge-agent.md                   # (from v5.0)
│   ├── blind-first-pass.md             # (from v5.0, enhanced for photonics)
│   ├── schema-validation.md             # (from v5.0)
│   ├── circuit-breaker.md               # (from v5.0)
│   └── expert-knowledge.md              # NEW — Expert Knowledge Injection protocol
├── schemas/                              # (from v5.0)
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
│   ├── fault-taxonomy.yaml              # (from v5.0, adapted for photonics)
│   └── judge-rubric.yaml               # (from v5.0)
├── gates/
│   └── gates.md                          # UPDATED — V0, J0, HE0-HE3 added; L-1, DQ1-DQ4, DD0, DC0 (v5.5)
└── .vibe-science/                        # Runtime directory
    ├── EXPERT-ASSERTIONS.md             # NEW — Expert ground truth (created at runtime)
    ├── LOGBOOK.md                        # NEW v5.5 — Structured logbook (created at runtime)
    └── DATA-DICT.yaml                   # NEW v5.5 — Data dictionary (created at runtime)
```

---

## GATE ARCHITECTURE SUMMARY (v5.5-PHOTONICS — 36 gates)

| Category | Gates | Schema-Enforced? | New in v5.0? | New in v5.5? |
|----------|-------|-------------------|--------------|--------------|
| Pipeline | G0-G6 (7) | No | No | No |
| Literature | L0-L2 (3) | L0, L2 | No | No |
| Literature Pre-Check | L-1 (1) | No | No | **YES** |
| Decision | D0-D2 (3) | D1, D2 | No | No |
| Tree | T0-T3 (4) | No | No | No |
| Brainstorm | B0 (1) | B0 | No | No |
| Stage | S1-S5 (5) | S4, S5 | No | No |
| Data Quality | DQ1-DQ4 (4) | No | No | **YES** |
| Data Dictionary | DD0 (1) | No | No | **YES** |
| Design Compliance | DC0 (1) | No | No | **YES** |
| Vigilance | V0 (1) | V0 | YES | No |
| Judge | J0 (1) | No (rubric-based) | YES | No |
| Human Expert | HE0-HE3 (4) | No (human-validated) | YES (PHOTONICS) | No |
| **Total** | **36** | **8 schema-enforced** | **6 new in v5.0** | **7 new in v5.5** |

---

## MODIFIED CHECKPOINT FLOW (v5.5-PHOTONICS)

The CHECKPOINT phase of the OTAE-Tree loop changes for FORCED reviews:

```
CHECKPOINT (v5.5-PHOTONICS — FORCED review path)

1. FORCED R2 trigger detected (major finding / stage transition / confidence explosion)
2. Orchestrator: run Seeded Fault Injection
   → Inject 1-3 known faults into claim set
   → Record injection manifest
2b. DQ Gates check (v5.5)
   → DQ1 (post-extraction), DQ2 (post-training), DQ3 (post-calibration) run if applicable
   → HALT on failure, WARN logged
3. R2 Ensemble: Read EXPERT-ASSERTIONS.md (MANDATORY)
   → Check all claims against expert ground truth
   → Flag any expert collisions
4. R2 Ensemble: Blind-First Pass Phase 1
   → Claims only (no justifications)
   → R2 produces independent assessment
   → R2 answers: "What physical limits constrain this claim?"
5. R2 Ensemble: Full Review Phase 2
   → Full context provided (including expert assertions)
   → R2 produces ensemble report (YAML)
   → R2 must address discrepancies between Phase 1 and Phase 2
   → R2 must address any expert assertion collisions
6. Gate V0: Seeded Fault Check
   → Did R2 catch all injected faults?
   → If NO → review INVALID, go back to step 3
   → RETRY LIMIT: max 3 V0 failures per session. After 3 → ESCALATE to human.
7. Judge Agent (R3): Review Quality Assessment
   → Score R2's review on 6-dimension rubric
   → Gate J0 check
   → If J0 FAIL → R2 must redo review with R3 feedback, go back to step 3
   → RETRY LIMIT: max 2 consecutive J0 failures. After 2 → ESCALATE to human.
8. Schema Validation: Check gate artifacts
   → Validate relevant artifacts against JSON schemas
   → If INVALID → fix and re-validate (max 3 attempts, then ESCALATE)
9. Gate evaluation proceeds normally (existing logic)
10. R2 INLINE check (v5.5): For each finding, 7-point checklist
    → claim_id assigned? evidence_chain present? confounder_harness run?
    → counter_evidence searched? R2 verdict recorded? confidence computed? SSOT verified?
    → If any point FAILS → finding cannot enter CLAIM-LEDGER
11. Structured Logbook entry (v5.5): Write LOGBOOK.md entry
    → timestamp, phase, action, inputs, outputs, gate_status
    → Not optional, not retroactive

ESCALATION: When any retry limit is hit, the system STOPS automated review
and presents the human expert with: what failed, how many times, R2's last
output, and R3's feedback (if applicable). Expert decides: adjust R2 prompt,
skip this review, or abort the session.
```

For BATCH and SHADOW reviews, the flow remains unchanged from v4.5 (no SFI, no BFP, no R3). This is deliberate: FORCED reviews protect the highest-stakes decisions, while BATCH and SHADOW remain lightweight.

**Stage transition flow with HE gates**:

```
STAGE TRANSITION (v5.5-PHOTONICS)

1. Current stage exit gate passes (S1, S2, S3, or S4)
2. HE2 gate activates: "Physically plausible?"
   → System pauses
   → Expert reviews all VERIFIED claims from current stage
   → Expert confirms or flags claims
3. If HE2 PASS → proceed to next stage
4. If HE2 FAIL → flagged claims enter EXPERT_DISPUTED status
   → System addresses flagged claims (may require additional literature review)
   → Return to step 2 when claims are resolved
5. Enter next stage
```

---

## DOMAIN MAPPINGS

### Metrics

| Base v5.0 (Bio) | v5.5-PHOTONICS | Description |
|---|---|---|
| iLISI (batch mixing) | BER (bit error rate) | Primary performance metric |
| cLISI (cell type preservation) | SNR (signal-to-noise ratio) | Signal quality metric |
| ARI (clustering accuracy) | Power penalty (dB) | Degradation vs back-to-back |
| NMI (mutual information) | Reach (m at target BER) | Maximum transmission distance |
| Silhouette (cluster separation) | Eye height (mV) / Eye width (ps) | Signal integrity metrics |
| kBET (batch effect test) | Energy efficiency (pJ/bit) | Power consumption metric |
| Batch classifier accuracy | Extinction ratio (dB) | Modulation depth |

### Confounders (LAW 9)

| Base v5.0 (Bio) | v5.5-PHOTONICS |
|---|---|
| n_mm (mismatches) | temperature_C |
| PAM (motif) | fiber_type + fiber_length |
| guide as random effect | device_ID as random effect |
| batch (sequencing run) | measurement_setup (lab, equipment) |
| platform (10X, SmartSeq) | modulation_format (NRZ, PAM4) |

### Databases and Literature Sources

| Base v5.0 (Bio) | v5.5-PHOTONICS |
|---|---|
| PubMed | IEEE Xplore |
| bioRxiv | arXiv (physics.optics, eess.SP) |
| GEO | Optica Publishing (ex-OSA) |
| CellxGene | SPIE Digital Library |
| ENCODE/TCGA | ITU-T standards (G.652, G.694, etc.) |

### Visualizations

| Base v5.0 (Bio) | v5.5-PHOTONICS |
|---|---|
| UMAP plot | Eye diagram |
| Heatmap | BER waterfall curve |
| Violin plot | Bandwidth vs temperature plot |
| Trajectory plot | S-parameter response (S21, S11) |
| Dot plot | Constellation diagram |
| Batch mixing plot | Link budget diagram |

### R2 Ensemble Specialization

| Base v5.0 (Bio) | v5.5-PHOTONICS |
|---|---|
| R2-Bio | **R2-Physics**: electromagnetic plausibility, optics, semiconductor physics, Shannon limit, thermodynamic limits |

R2-Physics checks:
- Does the claimed data rate respect the Shannon-Hartley capacity for the given SNR and bandwidth?
- Does the claimed reach respect the modal bandwidth-length product of the specified fiber?
- Does the claimed VCSEL efficiency respect thermodynamic limits at the specified temperature?
- Does the claimed power penalty account for all loss mechanisms (connector, splice, fiber attenuation, chromatic dispersion, modal dispersion)?
- Are the claimed BER values consistent with the modulation format and FEC assumption?

---

## v5.5 ORO ENHANCEMENTS (Post-Mortem Driven)

v5.5 ORO adds 7 new gates and 4 new operational rules based on a post-mortem analysis of 12 mistakes across 21 research sprints. These additions are domain-general — they apply to any Vibe Science fork, including this photonics specialization.

### Enhancement H: Literature Pre-Check (L-1)

**Problem**: Research directions chosen without checking if the question is already answered.

**Gate L-1 — Literature Pre-Check**:
```
L-1 PASS requires:
  At least 3 databases queried: IEEE Xplore, Optica Publishing, arXiv (physics.optics, eess.SP)
  Query terms documented
  Results summary: N papers found, N directly relevant, N contradicting proposed direction
  If >5 papers directly answer the RQ → HALT: RQ is answered, reformulate or cite

L-1 FAIL: No literature search before committing to direction
```

**Integration**: Fires in Brainstorm Step 2b, before research direction is committed.

### Enhancement I: Data Quality Gates (DQ1-DQ4)

**Problem**: Data quality issues propagated silently through the pipeline.

Four gates at critical pipeline junctions:

| Gate | When | Checks |
|------|------|--------|
| DQ1 | Post-extraction | Feature matrix dimensions, NaN ratio < threshold, value ranges plausible, no constant columns |
| DQ2 | Post-training | Train/test distribution overlap, no leakage, baseline comparison meaningful |
| DQ3 | Post-calibration | Calibration set independent, coverage at target level, interval widths finite |
| DQ4 | Post-finding | Finding reproducible across seeds, effect size above practical significance, CI excludes null |

**Thresholds**: Domain-general (no hardcoded photonics values). Specific thresholds set per-project in DATA-CONFIG.yaml.

### Enhancement J: Data Dictionary Gate (DD0)

**Problem**: Column names lie. Using a column without understanding its semantics introduces silent errors.

**Gate DD0 — Data Dictionary**:
```
DD0 PASS requires:
  Every column in the working dataset has a DATA-DICT entry:
    - column_name
    - description (what it measures)
    - unit
    - expected_range
    - source (where it comes from)
  Examples (photonics):
    output_power: "Optical output power", mW, [0.1, 20], "device characterization"
    bandwidth: "3dB bandwidth", GHz, [1, 50], "S21 measurement"
    BER: "Bit error rate", dimensionless, [1e-15, 1e-2], "BERT measurement"
    wavelength_nm: "Center wavelength", nm, [830, 870], "spectrometer"
    power_penalty_dB: "Power penalty vs B2B", dB, [0, 10], "BER waterfall"

DD0 FAIL: Any column used without DATA-DICT entry
```

### Enhancement K: Design Compliance Gate (DC0)

**Problem**: Execution drifts from stated research design without explicit acknowledgment.

**Gate DC0 — Design Compliance**:
```
DC0 PASS requires:
  At each phase transition:
    - Current execution state matches RQ.md research design
    - Any deviations documented with justification
    - No orphaned datasets (downloaded but unused)
    - No stale findings (data updated but narrative not)

DC0 FAIL: Design-execution mismatch without documented justification
```

### Enhancement L: R2 INLINE Mode

**Problem**: R2 reviews are post-hoc — errors compound before detection.

R2 INLINE is the 7th activation mode. It runs a 7-point checklist at every finding formulation, BEFORE the finding enters CLAIM-LEDGER:

| # | Check | HALT condition |
|---|-------|----------------|
| 1 | claim_id assigned? | Missing ID |
| 2 | evidence_chain present? | No evidence files cited |
| 3 | confounder_harness run? | Quantitative claim without harness |
| 4 | counter_evidence searched? | No search documented |
| 5 | R2 ensemble verdict recorded? | No R2 review |
| 6 | confidence computed with formula? | Missing computation |
| 7 | SSOT verified? | Numbers not traceable to structured data |

**Cost**: Near-zero — it's a checklist, not a full R2 review. Prevents the most common mistakes from entering the pipeline.

### Enhancement M: SSOT (Single Source of Truth)

**Problem**: Numbers in FINDINGS.md diverge from structured data files.

**Rule**: All quantitative values in narrative documents (FINDINGS.md, STATE.md, PROGRESS.md) MUST originate from structured data files (JSON, YAML, CSV). Tables in FINDINGS.md are generated from data, never hand-written.

### Enhancement N: Structured Logbook

**Problem**: Logbooks reconstructed retroactively lose critical decision context.

**Rule**: Every OTAE cycle MUST produce a LOGBOOK.md entry in CRYSTALLIZE phase:
- timestamp
- phase (OBSERVE/THINK/ACT/EVALUATE)
- action taken
- inputs consumed
- outputs produced
- gate_status (which gates passed/failed)
- decisions made and rationale

Not optional. Not retroactive. Written during CRYSTALLIZE, not after the session.

### Enhancement O: Operational Integrity Checks

**Problem**: Orphaned datasets, stale documents, and design drift go undetected.

In the OBSERVE phase of every OTAE cycle, check:
1. **Orphaned datasets**: Data files in project directory not referenced by any active analysis
2. **Document sync**: FINDINGS.md numbers match structured data files
3. **Design drift**: Current execution path matches RQ.md stated design
4. **Naming consistency**: File names follow project conventions

---

## LITERATURE REFERENCES

These papers directly support the architectural decisions in v5.5-PHOTONICS and should be cited in any resulting publication:

### Core: LLM Self-Correction Limitations

1. **Huang, J., Chen, X., Mishra, S., Zheng, H.S., Yu, A.W., Song, X., & Zhou, D.** (2024). "Large Language Models Cannot Self-Correct Reasoning Yet." _ICLR 2024_. arXiv:2310.01798.
   - **Key finding**: Intrinsic self-correction is ineffective; performance degrades after self-correction without external feedback.
   - **Our use**: Theoretical foundation for why R2 must be architecturally separated (TEAM mode) and structurally enforced (schemas), not just prompted.

2. **Gou, Z., Shao, Z., Gong, Y., Shen, Y., Yang, Y., Duan, N., & Chen, W.** (2023). "CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing." _ICLR 2024_. arXiv:2305.11738.
   - **Key finding**: Self-correction works ONLY with external tool feedback. Model's own critiques "contribute marginally."
   - **Our use**: Validates R2's mandatory tool-use (web search, IEEE Xplore, Scopus) as architecturally necessary, not optional.

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
    - **Key finding**: RL fine-tuning enables genuine self-correction (+15.6% MATH, +9.1% HumanEval).
    - **Our use**: Confirms that self-correction CAN work — but requires structural change (RL training), not just prompting. Our structural changes (SFI, R3, schemas) are the agent-level analog.

11. **Jin, J., et al.** (2024). "AgentReview: Exploring Peer Review Dynamics with LLM Agents." _EMNLP 2024_.
    - **Key finding**: LLM-based peer review simulation framework demonstrating multi-agent review dynamics.
    - **Our use**: Most directly comparable prior work. Position our R2 Ensemble as going beyond simulation to enforcement (schemas, SFI, R3 judge).

### Concurrent Work: Generator-Verifier-Reviser at Inference Level

12. **Snell, C., et al.** (2024). "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters." arXiv:2408.03314.
    - **Key finding**: Inference-time compute scaling (giving models more time to think) improves reasoning more effectively than enlarging the model.
    - **Our use**: Theoretical grounding for why our OTAE-Tree (which scales agent-time exploration) works. Same principle, different level (agent vs. inference).

13. **DeepMind** (2024). "Rewarding Progress: Scaling Automated Process Verifiers for LLM Reasoning." arXiv:2410.08146.
    - **Key finding**: Process Reward Models (PRMs) that give step-by-step feedback outperform outcome-only reward models.
    - **Our use**: R2's intervention at every OTAE checkpoint (not just final output) mirrors PRM's step-by-step verification at the agent level.

14. **DeepMind — Aletheia** (2026). "Towards Autonomous Mathematics Research." arXiv:2602.10177.
    - **Key finding**: Generator-Verifier-Reviser architecture for autonomous math research. Verifier uses natural language, not formal proofs. Iterative loop until verified or max attempts.
    - **Our use**: Aletheia's Generator-Verifier-Reviser is architecturally isomorphic to our Researcher-R2-Researcher loop. Validates our design independently. Key difference: we add tool-grounded verification (web search, IEEE Xplore, Scopus), not just reasoning-based verification.

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

### Photonics Domain References

30. **IEEE 802.3** (various). IEEE Standard for Ethernet — Physical Layer specifications.
    - **Key standards**: 802.3bs (400GbE), 802.3cd (50/100/200GbE), 802.3cm (400GbE over MMF), 802.3cw (400GbE over CWDM), 802.3db (100/200/400GbE over short-reach MMF), 802.3df (800/1600GbE).
    - **Our use**: Definitive source for IM-DD interface specifications, BER requirements, reach definitions, and optical power budgets. R2-Physics must verify claims against applicable standard.

31. **Larisch, G., Moser, P., Lott, J.A., & Bimberg, D.** (2018). "Impact of Photon Lifetime on the Temperature Stability of 50+ Gb/s 980 nm VCSELs." _IEEE Journal of Quantum Electronics_, 54(4). DOI:10.1109/JQE.2018.2843598.
    - **Key finding**: Photon lifetime engineering enables high-speed VCSEL operation at elevated temperatures. Demonstrates interplay between oxide aperture, cavity design, and thermal performance.
    - **Our use**: Reference for VCSEL high-speed performance limits and temperature dependence — critical for SFI-03 (physical impossibility) fault design.

32. **Kuchta, D.M., et al.** (2015). "A 71-Gb/s NRZ Modulated 850-nm VCSEL-Based Optical Link." _IEEE Photonics Technology Letters_, 27(6). DOI:10.1109/LPT.2014.2385804.
    - **Key finding**: Demonstrated 71 Gb/s NRZ with 850 nm VCSEL, establishing experimental bounds for short-reach IM-DD.
    - **Our use**: Benchmark for SFI-02 (already-known) — claims of NRZ VCSEL performance must be compared against established experimental records.

33. **Shannon, C.E.** (1948). "A Mathematical Theory of Communication." _Bell System Technical Journal_, 27(3), 379-423.
    - **Key finding**: Channel capacity = B * log2(1 + SNR). Fundamental limit on data rate for any communication channel.
    - **Our use**: Absolute ceiling for R2-Physics checks. Any claim of data rate exceeding Shannon capacity for the given bandwidth and SNR is SFI-03 (physical impossibility). Also foundational for understanding the gap between theoretical limits and practical IM-DD systems.

34. **Cheng, Q., Bahadori, M., Glick, M., Rumley, S., & Bergman, K.** (2018). "Recent Advances in Optical Technologies for Data Centers: A Review." _Optica_, 5(11), 1354-1370. DOI:10.1364/OPTICA.5.001354.
    - **Key finding**: Comprehensive review of optical interconnect technologies for data centers, covering VCSEL, silicon photonics, and co-packaged optics. Maps technology readiness levels.
    - **Our use**: Baseline for state-of-the-art assessment. R2-Physics uses this as reference for what is "already known" (SFI-02) versus genuinely novel claims.

---

## ATOMIC TASK BREAKDOWN (for parallel agent implementation)

Each task below is self-contained and can be executed by a single agent independently. Tasks are grouped by dependency.

### Layer 0: Independent Tasks (can all run in parallel)

| Task ID | Task | Input | Output | Estimated Lines |
|---------|------|-------|--------|----------------|
| T-01 | Write `protocols/seeded-fault-injection.md` | This blueprint (Innovation 1) + v5.0 SFI protocol | Protocol file (photonics-adapted) | ~120 |
| T-02 | Write `protocols/judge-agent.md` | This blueprint (Innovation 2) + v5.0 R3 protocol | Protocol file + rubric | ~150 |
| T-03 | Write `protocols/blind-first-pass.md` | This blueprint (Innovation 3) + v5.0 BFP protocol | Protocol file (with "physical limits" question) | ~100 |
| T-04 | Write `protocols/schema-validation.md` | This blueprint (Innovation 4) + v5.0 SVG protocol | Protocol file | ~60 |
| T-05 | Write `assets/fault-taxonomy.yaml` | This blueprint (SFI fault table) + photonics domain knowledge | YAML taxonomy file | ~120 |
| T-06 | Write `schemas/claim-promotion.schema.json` | This blueprint + D1 gate spec | JSON Schema | ~80 |
| T-07 | Write `schemas/rq-conclusion.schema.json` | This blueprint + D2 gate spec | JSON Schema | ~60 |
| T-08 | Write `schemas/stage4-exit.schema.json` | This blueprint + S4 gate spec | JSON Schema | ~70 |
| T-09 | Write `schemas/stage5-exit.schema.json` | This blueprint + S5 gate spec | JSON Schema | ~50 |
| T-10 | Write `schemas/source-validity.schema.json` | This blueprint + L0 gate spec | JSON Schema | ~50 |
| T-11 | Write `schemas/review-completeness.schema.json` | This blueprint + L2 gate spec | JSON Schema | ~60 |
| T-12 | Write `schemas/brainstorm-quality.schema.json` | This blueprint + B0 gate spec | JSON Schema | ~50 |
| T-13 | Write `schemas/vigilance-check.schema.json` | This blueprint + V0 gate spec | JSON Schema | ~40 |
| T-14 | Write `assets/judge-rubric.yaml` | This blueprint (R3 rubric table) | YAML rubric file | ~60 |
| T-15 | Write `schemas/serendipity-seed.schema.json` | This blueprint (Enhancement B schema) | JSON Schema | ~70 |
| T-16 | Write `protocols/expert-knowledge.md` | This blueprint (Innovation 5) | Protocol file (NEW) | ~150 |
| T-17 | Write `protocols/circuit-breaker.md` | This blueprint (Enhancement E) | Protocol file | ~80 |
| T-18 | Write `CONTEXT.md` | This blueprint + plan | Context briefing for Claude | ~80 |
| T-19 | Adapt `assets/obs-normalizer.md` | This blueprint + domain mappings | Rewritten for photonics | ~150 |
| T-20 | Adapt `protocols/data-extraction.md` | This blueprint + domain mappings | Rewritten for photonics | ~200 |
| T-21 | Adapt `protocols/analysis-orchestrator.md` | This blueprint + domain mappings | Rewritten for photonics | ~180 |

### Layer 1: Depends on Layer 0

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-22 | T-01..T-18 | Update `gates/gates.md` — add V0, J0, HE0-HE3, schema references, domain-adapted examples | Updated gates file |
| T-23 | T-01..T-18 | Update `protocols/reviewer2-ensemble.md` — integrate BFP, salvagente, circuit breaker, expert assertions, R2-Physics, TEAM as default | Updated R2 protocol |
| T-24 | T-01..T-21 | Update `SKILL.md` — version bump, LAW 8 quantified, new sections for innovations + enhancements, permission model (Enhancement F), Expert-Guided mode, photonics domain | Updated SKILL.md |
| T-25 | T-01..T-18 | Update `protocols/brainstorm-engine.md` — add Expert Knowledge Harvest, photonics sources | Updated protocol |
| T-26 | T-01..T-18 | Update `protocols/serendipity-engine.md` — add EXPERT source, domain examples | Updated protocol |
| T-27 | T-01..T-18 | Update `protocols/search-protocol.md` — IEEE Xplore, Optica, SPIE, arXiv as primary sources | Updated protocol |
| T-28 | T-19..T-21 | Update `assets/metric-parser.md` — photonics metrics | Updated asset |
| T-29 | T-19..T-21 | Update `assets/skill-router.md` — photonics tools | Updated asset |

### Layer 2: Depends on Layer 1

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-30 | T-22..T-29 | Update `CLAUDE.md` — version bump, add LAW 0 (Expert Priority), R2-Physics role, HE gates, permission model | Updated CLAUDE.md |
| T-31 | T-22..T-29 | Update remaining Tier 3 files: `vlm-gate.md`, `writeup-engine.md`, `experiment-manager.md`, `audit-reproducibility.md`, `auto-experiment.md`, `commands/start.md` | Updated files (6) |
| T-32 | T-22..T-29 | Update remaining Tier 4 files: `templates.md`, `evidence-engine.md`, `loop-otae.md`, `source-validity.schema.json`, `brainstorm-quality.schema.json`, `walkthrough-literature-review.md` | Updated files (6) |

### Layer 3: Final verification

| Task ID | Depends On | Task | Output |
|---------|-----------|------|--------|
| T-33 | T-30..T-32 | Exhaustive grep verification — zero personal names, zero bio terms, presence of photonics terms, gate count = 36, reference count = 34 | Verification report |

**Total**: 33 tasks, 4 layers, maximum parallelism of 21 tasks in Layer 0.

---

## DESIGN DECISIONS AND RATIONALE

### Why 36 gates, not fewer?

Consolidating to fewer gates is wrong for the same reasons as in the base architecture:

1. **Granularity enables diagnosis.** When G3 fails, you know it's a training issue. When "Quality Gate" fails, you don't know what broke.
2. **Different gates trigger at different times.** G0 fires at data load, S4 fires at ablation completion, HE2 fires at stage transitions, DQ1 fires post-extraction, DC0 fires at phase transitions. Collapsing them means either running all checks at every stage (wasteful) or losing coverage (dangerous).
3. **Schema enforcement requires specificity.** You can't write a JSON Schema for a generic "quality gate." You need a specific schema for claim promotion (D1) and a different one for brainstorm quality (B0).
4. **The cost is zero.** Gates are prompt checks (or human pauses for HE gates), not API calls. 36 text checks cost nothing. The question is not "how many gates?" but "does each gate earn its existence?" All 36 do — 25 base gates proven across v3.5-v4.5, 4 HE gates for photonics expert validation, and 7 v5.5 ORO gates derived from post-mortem analysis of real research failures.

### Why stop at R3? Why not R4, R5, ...?

**Data Processing Inequality** (information theory): In a text-only chain (R2 reads claims → R3 reads R2's review → R4 reads R3's report), each successive layer cannot increase information about the original data — it can only contract it. R4 reading only R3's text output is almost always noise + cost.

The exception: a new layer adds value ONLY if it introduces a **new information channel** — direct access to primary artifacts, a different model, different tools. This is why our cross-model audit (optional) works: it accesses artifacts directly with a different model, not R3's text.

**Width over depth**: If you want more robustness, add N R2 reviewers in parallel (self-consistency), not more layers of meta-review. This is why we use N=3 self-consistency in SOLO mode rather than an R4.

### Why R3 only on FORCED reviews?

Cost management. FORCED reviews happen at major findings, stage transitions, and conclusion — maybe 5-10 times per RQ. Running R3 on every BATCH and SHADOW review would triple token costs for diminishing returns. The highest-stakes decisions get the most scrutiny.

### Why seeded faults from a taxonomy, not generated by the researcher?

The researcher agent would generate faults it already knows how to detect (because it generated them). The fault taxonomy is based on _real errors encountered in photonics literature analysis_ — errors the system actually failed to catch or would plausibly miss. This makes SFI an empirical calibration tool, not a self-test.

### Why blind-first, not blind-only?

R2 needs the full context to do a thorough review. But it needs to form _independent_ opinions first. BFP is a two-phase process within one review, not two separate reviews. This avoids doubling cost while still breaking anchoring bias.

### Why JSON Schema, not a custom validator?

1. JSON Schema is a standard with existing validators in every language
2. It's declarative (schema files are data, not code)
3. It's auditable (you can read the schema and know exactly what's enforced)
4. It works with Claude Code's existing file-based architecture
5. The schemas are READ-ONLY artifacts — agents cannot modify them

### Why no cross-model R2 by default?

RECONCILE (Chen et al.) shows multi-model debate (ChatGPT + Bard + Claude) beats single-model multi-agent. But arXiv:2502.00674 shows mixing models can WORSEN results if a weak model is introduced.

**Decision**: Cross-model R2 is an OPTIONAL audit mode, not the default. Activated on:
- Claims with confidence >= 0.80 destined for paper abstract/figures
- Claims where internal R2 and researcher disagree after 2+ rounds
- Random sampling (10% of FORCED reviews) for calibration

When available, log: model_id, model_version, prompt, verdict — for reproducibility.

### Why Expert Knowledge Injection?

The domain expert knows more than the model about device physics. In photonics specifically:
- The expert has seen unpublished experimental data that constrains what is physically achievable
- The expert knows which simulation assumptions are unrealistic (e.g., ideal fiber connectors, no aging)
- The expert knows industry constraints (yield, cost, thermal budget) that academic papers routinely ignore
- The expert's intuition about physical plausibility has been calibrated over years of device characterization

Without EKI, this knowledge is ephemeral — lost when the session ends, unavailable to R2 for validation, and not enforced against future claims. EKI makes expert knowledge persistent, consultable, and enforceable.

### Why Human Expert Gates?

Human validation is irreplaceable for physical plausibility in photonics research. An LLM cannot reliably determine:
- Whether a VCSEL can physically operate at a claimed data rate given its oxide aperture and cavity design
- Whether a link budget is realistic given the specified fiber, connectors, and environmental conditions
- Whether a claimed breakthrough is genuinely novel or well-known in industry but not published

The HE gates are not bureaucratic overhead — they are the minimum human involvement required to prevent the system from producing physically nonsensical conclusions. Each gate is placed at a decision point where the expert's input has maximum impact:
- HE0 prevents the entire research from starting in the wrong direction
- HE1 prevents wasting cycles on low-priority questions
- HE2 prevents physically implausible findings from propagating across stages
- HE3 prevents publication of incomplete work

### Why literature-based, not data-based?

Experimental data in photonics is proprietary. Device characterization data, manufacturing yield numbers, reliability test results — these belong to companies and cannot be freely shared. Published literature is the common ground:
- Papers in IEEE, Optica, SPIE are publicly accessible
- Conference proceedings (OFC, ECOC, CLEO) capture cutting-edge results
- Standards (IEEE 802.3, ITU-T) define agreed-upon specifications
- arXiv preprints provide early access to results

This fork is designed to synthesize, cross-reference, and critically analyze this public knowledge — augmented by the expert's private knowledge through the EKI mechanism. The expert decides what private knowledge to share; the system never requires proprietary data.

---

## NAMING AND VERSIONING

| Field | Value |
|-------|-------|
| Version | 5.5.0-PHOTONICS |
| Codename | ORO-PHOTONICS |
| Full name | Vibe Science v5.5 — ORO-PHOTONICS |
| Architecture | OTAE-Tree + R3 Judge + Expert Knowledge Injection + v5.5 ORO enhancements |
| Lineage | v3.5 TERTIUM DATUR → v4.0 ARBOR VITAE → v4.5 ARBOR VITAE (Pruned) → v5.0 IUDEX → v5.5 ORO → v5.5-ORO-PHOTONICS |
| Changelog entry | "v5.5.0-PHOTONICS — Photonics fork of ORO. Expert Knowledge Injection (Innovation 5), Human Expert Gates (HE0-HE3), R2-Physics reviewer, 36 gates (13 new: V0, J0, HE0-HE3, L-1, DQ1-DQ4, DD0, DC0). 7 R2 modes (added INLINE). 8 gates schema-enforced. SSOT, structured logbook, operational integrity checks. Domain: IM-DD, VCSEL, PAM4, optical interconnects." |

---

## IMPLEMENTATION NOTES

### Destination Directory
```
F:\Tesi_Python_scRNA\nuove_skill\vibe-science\vibe-science-photonics\
```

### Starting Point
Copy entire v5.0 directory, then apply modifications per atomic tasks.

### Order of Operations
1. Copy v5.0 → vibe-science-photonics
2. Run Layer 0 tasks in parallel (21 tasks: new files + rewrites)
3. Run Layer 1 tasks (8 update tasks)
4. Run Layer 2 tasks (3 update batches)
5. Run Layer 3 verification (1 task)
6. Total: 33 tasks, estimated ~2,500 new/modified lines

### Quality Assurance
- Every new protocol file must be consistent with the 10 Laws
- Every schema must validate against real gate artifacts
- R3 rubric must be tested against sample R2 ensemble reports
- Fault taxonomy must map to realistic errors in photonics literature analysis
- Expert Knowledge Injection must be tested with sample assertions
- HE gates must be verified to fire at correct points in the workflow
- **ZERO personal names in ANY file** — verified by exhaustive grep (Task T-33)

### Verification Grep (Task T-33)

**A) Personal names and private references (MUST be ZERO hits in entire repo)**:
- Any author first/last names that were in the original BIO blueprint
- Any company names used as attributions
- Any GitHub handles or social media identifiers
- Any personal emails or private references
- Run: `grep -ri` with a curated blocklist maintained separately from this document
  (blocklist must NOT appear in any repo file to avoid false positives)

**B) Bio-specific terms (MUST be ZERO hits except in explicit comparison tables)**:
- `scRNA`, `scRNA-seq`, `single-cell RNA`
- `CRISPR`, `Cas9`, `off-target`, `guide RNA`
- `cell_type`, `cell types` (in bio context)
- `gene`, `genes`, `gene expression` (in bio context)
- `scanpy`, `scvi-tools`, `scvi`, `pydeseq2`, `anndata`, `AnnData`
- `UMAP` (in bio context)
- `pct_mito`, `pct_ribo`, `mitochondrial`, `ribosomal`
- `iLISI`, `cLISI`, `kBET` (as primary metrics)
- `10X Chromium`, `SmartSeq`, `DropSeq`
- `GEO`, `CellxGene`, `ENCODE`, `TCGA` (as primary databases)
- `PubMed`, `bioRxiv` (as primary sources)
- `n_HVG`, `n_latent`, `hvg_flavor`
- `Biological impossibility`

**C) Photonics terms (MUST be PRESENT)**:
- `VCSEL`, `IM-DD`, `PAM4`, `NRZ`, `optical interconnect`
- `BER`, `SNR`, `power_penalty`, `reach`, `eye diagram`
- `IEEE Xplore`, `Optica`, `SPIE`, `arXiv physics.optics`
- `temperature`, `fiber_type`, `modulation_format`
- `EXPERT-ASSERTIONS.md`, `Expert Knowledge`, `HE gates`
- `CONTEXT.md`
- `TEAM mode`
- `Shannon limit`

---

## v6.0-PHOTONICS ROADMAP (deferred items)

### v6.0 — Planned

| ID | Feature | Description | Prerequisite |
|----|---------|-------------|--------------|
| R5.5-01 | **Calibration Log** | Structured log mapping `claim_id → predicted_confidence → actual_outcome` (confirmed / killed / revised). Accumulates across sessions. | v5.5-PHOTONICS running with 10+ sessions |
| R5.5-02 | **Golden Claims Test Suite** | 10-15 claims with known correct outcomes from established photonics literature as regression tests for gates. Run on every version bump. | Fault taxonomy (T-05) + domain knowledge |
| R5.5-03 | **Cross-Model Audit Protocol** | Formalize optional cross-model R2: MCP/API interface, model version logging, activation policy (confidence >= 0.80 OR internal disagreement >= 2 rounds OR 10% random FORCED), divergence handling. | v5.5-PHOTONICS cross-model note |
| R5.5-04 | **Anti-Gaming Metrics** | Secondary metrics that penalize suspicious patterns: false kill rate by R2 reviewer, review diversity score, SFI fault rotation enforcement. Goodhart mitigation. | SFI (T-01) + R3 (T-02) running |
| R5.5-05 | **Expert Assertion Versioning** | Track assertion lifecycle: creation, modifications, invalidation. Allow assertions to be superseded by newer expert knowledge without losing history. | EKI (T-16) running |

### v7.0 — Deferred

| ID | Feature | Why Deferred |
|----|---------|-------------|
| R6.0-01 | **Confidence Calibration (Brier/ECE)** | Requires many claims with known outcomes to compute meaningful calibration curves. Collect the log in v5.5, calibrate in v6.0. |
| R6.0-02 | **R-C Collinearity Resolution** | Merge R and C into "External Validation" or use Choquet integral. Needs calibration data to choose. |
| R6.0-03 | **Automated Physical Constraint Checking** | Use physics equations and databases to automatically verify claims against known limits (Shannon, modal bandwidth, thermal). Complex to implement reliably. |
| R6.0-04 | **Multi-Domain Expert Assertions** | Support multiple experts with potentially conflicting assertions. Requires conflict resolution protocol. |

### Rejected

| Proposal | Why Rejected |
|----------|-------------|
| Dempster-Shafer full framework | Conflicting evidence combination is unstable/paradoxical (see Dezert 2019). The geometric mean with floor achieves "ignorance ≠ disbelief" without the DS baggage. |
| Automated paper data extraction (OCR/parsing) | Photonics papers present data in diverse formats (plots, tables, inline text). Automated extraction is unreliable. Manual literature review with expert guidance is more accurate. |
| Separate "missingness" dimension | Adds a 6th component to the formula for marginal gain. The dynamic floor (v5.0) already distinguishes "missing" from "low" via claim type context. |

---

_This blueprint was prepared based on: Vibe Science v5.5 ORO architecture, peer-reviewed literature on LLM self-correction and peer review effectiveness, foundational references in optical communications and information theory, post-mortem analysis of 12 research failures across 21 sprints, and the principle that expert knowledge must be structurally integrated — not just consulted — in domain-specific AI-assisted research._

_The philosophy: "The model does not know what it does not know. The expert does. Build the system so the expert's knowledge is permanent, not ephemeral."_

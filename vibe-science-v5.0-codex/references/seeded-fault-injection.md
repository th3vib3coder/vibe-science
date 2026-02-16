# Seeded Fault Injection Protocol — R2 Vigilance Calibration

> Load this when: CHECKPOINT-r2 (FORCED mode), before submitting claims to R2 Ensemble.

## Overview

Seeded Fault Injection (SFI) is the structural answer to a structural problem: how do you know R2 is catching errors, versus rubber-stamping? Prompt-level mandates ("be adversarial") are necessary but insufficient — Huang et al. (ICLR 2024) proved that LLMs cannot self-correct reasoning without external feedback. SFI provides that external feedback by injecting known faults and measuring detection.

SFI is inspired by mutation testing (Jia & Harman, 2011; Papadakis et al., 2019): inject known defects, measure whether the test suite (R2) catches them. If R2 misses a known fault, the review is invalid — not because R2 failed on a trick question, but because R2 failed to do the work.

**Design note — Inline, not parallel**: Faults are mixed with real claims. R2 does not know which claims are seeded. This tests vigilance under real conditions, not performance on a labeled exam.

---

## Protocol

```
SEEDED FAULT INJECTION PROTOCOL

WHEN:   Before every FORCED R2 review (NOT BATCH, NOT SHADOW — cost management)
WHO:    Orchestrator (not researcher, not R2)
VISIBILITY: R2 does NOT know which claims are seeded faults

1. Select 1-3 faults from taxonomy (random, weighted by recency of similar errors)
   → Source: assets/fault-taxonomy.yaml
   → Only ACTIVE faults are eligible for injection

2. Inject into claim set as additional claims with plausible evidence
   → Faults must look indistinguishable from real claims
   → Each fault carries fabricated but realistic evidence artifacts

3. Record injection manifest (private to orchestrator):
   {review_id, fault_ids, injection_positions, difficulty_ratings}

4. Submit augmented claim set to R2 Ensemble for review

5. After R2 review completes:
   a. Check: did R2 flag ALL seeded faults?
   b. If YES → review is VALID. Remove seeded faults from output.
   c. If NO → review is INVALID. Log which faults were missed.
      → R2 must re-review the ENTIRE claim set (not just missed faults)
      → Increment r2_vigilance_failures counter
      → If 3+ failures in session → ESCALATE to human

6. Record in PROGRESS.md:
   "SFI check: {N_injected} faults, {N_caught} caught, review {VALID|INVALID}"
```

---

## Fault Taxonomy

The fault taxonomy is defined in `assets/fault-taxonomy.yaml`. Eight categories, derived from real errors observed across 21 sprints of the CRISPR case study:

| Fault ID | Category | Catches |
|----------|----------|---------|
| SFI-01 | Confounded claim | Signal that reverses under propensity matching |
| SFI-02 | Already-known finding | Established result presented as novel |
| SFI-03 | Biological impossibility | Claim violating known domain constraints |
| SFI-04 | Noise-as-signal | Sub-threshold effect presented as meaningful |
| SFI-05 | Non-generalizable finding | Assay-specific result claimed as universal |
| SFI-06 | Citation fabrication | Non-resolving DOI or misattributed finding |
| SFI-07 | Statistical artifact | Wrong test, uncorrected multiple comparisons |
| SFI-08 | Missing control | Comparison without appropriate baseline |

Each fault in the taxonomy carries: difficulty rating (EASY / MEDIUM / HARD), equivalence risk (LOW / MEDIUM / HIGH), and current state.

**Fault generation is HUMAN-ONLY.** The LLM does not generate faults for itself. The taxonomy is authored by the human architect based on real errors from historical sprints.

---

## Fault States

Each fault in the taxonomy has exactly one state:

| State | Meaning | RMS impact |
|-------|---------|------------|
| **ACTIVE** | Valid test fault, eligible for injection | Included in denominator |
| **EQUIV** | Non-discriminable with available evidence (fault generator error, not R2 failure) | Excluded from denominator |
| **RETIRED** | R2 has caught this fault type 3+ times consistently; replace with harder variant | Not injected |

State transitions: ACTIVE -> EQUIV (when evidence shows fault is genuinely ambiguous), ACTIVE -> RETIRED (after 3+ consistent catches on that fault type).

---

## SFI Metrics

Adapted from the mutation testing literature (Jia & Harman survey, Papadakis et al.):

| Metric | Formula | Purpose |
|--------|---------|---------|
| **RMS** (Review Mutation Score) | caught / (injected - equivalent) | R2 vigilance on known faults |
| **FAR** (False Alarm Rate) | false_positives / clean_claims_reviewed | R2 paranoia level (must stay low) |
| **Time-to-Catch** | cycle_number when fault first flagged | R2 responsiveness |
| **Coverage by Fault Class** | RMS per fault category (SFI-01..SFI-08) | R2 blind spots by error type |

All metrics are logged in `.vibe-science/RQ-xxx/05-reviewer2/sfi-log.yaml` for longitudinal tracking.

---

## V0 Gate — R2 Vigilance

V0 is the new pre-gate that validates R2 itself before the R2 review output is trusted.

```
V0 PASS requires:
  [] RMS >= 0.80        (at least 80% of non-equivalent faults caught)
  [] FAR <= 0.10        (no more than 10% false alarms on clean claims)
  [] Detection was substantive (must identify the specific flaw, not just "suspicious")
  [] r2_vigilance_failures < 3 in current session

V0 FAIL actions:
  - RMS < 0.80   -> Review INVALID. Full re-review required.
  - FAR > 0.10   -> R2 is being paranoid. Warn and recalibrate.
  - Detection not substantive -> Counts as miss. R2 must provide falsifier + discriminating test.
  - 3+ session failures -> Human escalation. R2 prompt may need adjustment.
```

The anti-paranoia mechanism is structural: every FAIL verdict from R2 must include a specific falsifier and a discriminating test. Vague objections ("this looks suspicious") do not count as detection. This makes false positives expensive to produce.

---

## Fault Replenishment

The retirement mechanism (RETIRED after 3+ consistent catches) can deplete the taxonomy over time. To prevent SFI from becoming an empty ritual:

**Minimum ACTIVE faults**: Each of the 8 fault categories must maintain at least 2 ACTIVE faults. If a category drops below 2, the human architect is notified to create harder variants.

**Meta-faults** (domain-independent, structural): Beyond domain-specific faults, the taxonomy includes structural meta-faults that R2 should catch regardless of research domain:
- Claim type misclassification (causal labeled as descriptive)
- Cherry-picked citation (source exists but does not support the claim as stated)
- P-hacking narrative (multiple comparisons presented as single hypothesis)

---

## R2 Awareness

R2 can read the fault taxonomy YAML (it is in the plugin files). R2 knows the 8 fault CATEGORIES but not WHICH specific faults were injected into WHICH specific claims in any given review. This is analogous to knowing a test covers "math, science, history" but not knowing the specific questions.

The value of SFI is ensuring R2 does the work — checks confounders, verifies DOIs, tests statistics — not that the faults are surprising.

---

## Integration with CHECKPOINT Flow

SFI activates only at CHECKPOINT-r2 in FORCED mode. The flow is:

```
CHECKPOINT-r2 (FORCED) triggered
  |
  +-- Orchestrator: select 1-3 ACTIVE faults from taxonomy
  +-- Orchestrator: inject into claim set, record manifest
  +-- Submit augmented claims to R2 Ensemble
  +-- R2 Ensemble: standard double-pass review (unaware of injection)
  +-- Orchestrator: evaluate V0 gate against R2 output
  |
  +-- V0 PASS? --> Strip seeded faults from output, proceed to normal gate chain
  +-- V0 FAIL? --> Log failure, re-review entire claim set, check escalation threshold
```

SFI does not replace any existing gate. It wraps the R2 review to validate the reviewer before trusting the review. All downstream gates (G1-G7) operate on the cleaned output (seeded faults removed).

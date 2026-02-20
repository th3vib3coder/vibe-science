# Evidence Engine

Pillar 1 of Vibe Science v4.0 — ARBOR VITAE. Transforms claims from free text into tracked, scored, verifiable assertions.

**v4.0 upgrades**: Confounder Harness (LAW 9) mandatory for every quantitative claim. New claim statuses: ARTIFACT, CONFOUNDED, ROBUST. Tree node tracking per claim.

**v5.0 IUDEX upgrades**: Confidence formula revised (hard veto + geometric mean with dynamic floor), claim.type locked by orchestrator (anti-gaming), v5.0 claim status additions (DISPUTED from circuit breaker).

## Claim Ledger

Every assertion made during research gets a ledger entry. The ledger is the single source of truth — if a claim is not in the ledger, it does not exist in the research output.

### Claim Schema

```markdown
| Field | Required | Description |
|-------|----------|-------------|
| `claim_id` | ✅ | Sequential: C-001, C-002, ... |
| `text` | ✅ | Atomic assertion (one testable statement) |
| `type` | ✅ | `DATA` (direct observation), `INFERENCE` (derived), `OPINION` (interpretation) |
| `evidence` | ✅ | List of evidence items (file, figure, DOI, quote) |
| `confidence` | ✅ | Computed score 0.00–1.00 (see formula below) |
| `status` | ✅ | `UNVERIFIED` → `VERIFIED` → `CHALLENGED` → `REJECTED` or `CONFIRMED` |
| `reviewer2` | ○ | Review ID if reviewed |
| `depends_on` | ○ | List of claim_ids this claim requires |
| `assumptions` | ○ | List of assumption_ids (from Assumption Register) |
| `claim_type_assigned_by` | ✅ | `orchestrator` — only orchestrator assigns type |
| `claim_type_locked` | ✅ | `true` after assignment — prevents gaming |
| `dispute_reason` | ○ | Verbatim R2 objection (if DISPUTED) |
| `dispute_cycle` | ○ | Cycle when DISPUTED (if applicable) |
| `researcher_position` | ○ | Verbatim researcher response (if DISPUTED) |
| `created` | ✅ | ISO date |
| `updated` | ✅ | ISO date |
```

### Claim Ledger File Format (CLAIM-LEDGER.md)

```markdown
# Claim Ledger

## C-001
- **Text:** PAM4 achieves 2.1 dB lower power penalty than NRZ at 50 Gb/s over 100m OM4 fiber
- **Type:** DATA
- **Evidence:** [run-20260218/report.md §Metrics], [Fig. 1 BER waterfall], [DOI:10.1109/JLT.2024.example]
- **Confidence:** 0.72
- **Status:** VERIFIED
- **Reviewer2:** ensemble-major-001
- **Depends on:** C-003 (measurement conditions verified), C-005 (FEC assumption justified)
- **Assumptions:** A-002 (KP4 FEC threshold applies uniformly)
- **Updated:** 2026-02-18

## C-002
- **Text:** VCSEL thermal rollover limits output power above 85°C for 850nm devices
- **Type:** DATA
- **Evidence:** [temperature_analysis.py output], [consistent across 8 studies]
- **Confidence:** 0.85
- **Status:** VERIFIED
- **Updated:** 2026-02-18
```

### Rules for Claim Extraction

1. **Atomize**: Break compound statements into single testable claims. "PAM4 achieves lower BER and longer reach than NRZ" → two claims.
2. **Type honestly**: If no direct data supports it, it's INFERENCE. If it's your interpretation beyond what data shows, it's OPINION. Never upgrade type.
3. **Chain dependencies**: If C-005 depends on C-003, and C-003 gets REJECTED, cascade: C-005 becomes CHALLENGED automatically.
4. **No orphan claims**: Every claim in a finding document must have a ledger entry. Every ledger entry must have evidence.

## Confidence Score: Quantitative Formula

Confidence is **computed**, not felt. v5.0 uses a hard-veto + geometric mean formula that distinguishes "no evidence" (should kill) from "not yet tested" (should penalize but not kill).

### v5.0 Formula

```
CONFIDENCE FORMULA v5.0:

Step 1: Hard veto check (LAW 1 enforcement)
  IF E < 0.05 OR D < 0.05 → confidence = 0.0
  STOP. No data = no go.

Step 2: Apply dynamic floor to soft components (unknown ≠ false)
  R_eff = max(R_raw, floor)
  C_eff = max(C_raw, floor)
  K_eff = max(K_raw, floor)

Step 3: Aggregate
  confidence = E × D × (R_eff × C_eff × K_eff)^(1/3)

  E, D: product (hard veto — zero kills)
  R, C, K: geometric mean (softer, compensatory)
  Floor: prevents "unknown" from killing; "unknown" ≠ "contradicted"
```

### Dynamic Floor by Claim Type and Stage

The floor varies based on the claim's epistemic type and the current research stage:

| Claim Type | Stage | Floor | Rationale |
|------------|-------|-------|-----------|
| Descriptive / Correlative | Stage 1-2 (Preliminary/Hyperparameter) | 0.05 | Early exploration — "unknown" is expected |
| Descriptive / Correlative | Stage 3+ (Research Agenda onward) | 0.10 | Should have some validation by now |
| Causal / Mechanistic | Any stage | 0.15 | Stronger claims need stronger evidence |
| Paper-critical (abstract/figures) | Stage 5 (Synthesis) | 0.20 | Highest bar for publication claims |

### Anti-Gaming: claim.type is Locked

Since the floor depends on `claim.type`, a researcher could game the system by labeling a causal claim as "descriptive" to get a lower floor. Prevention:

- `claim.type` is assigned by the **orchestrator** at claim registration, based on text analysis
- Once assigned, `claim.type` is **locked** in the claim ledger
- Reclassification requires R2 review and orchestrator approval
- Schema enforces: `claim_type_assigned_by: orchestrator`, `claim_type_locked: true`

### Properties

- E=0 or D=0 → confidence = 0 (LAW 1 preserved)
- R=0 (new finding) → R_eff = floor, confidence penalized but NOT killed
- K=0 (no mechanism) → K_eff = floor, serendipitous findings protected
- All components = 1.0 → confidence = 1.0
- All soft components at floor → confidence ≈ E × D × floor (heavy penalty, not death)

### R-C Collinearity Note
Replication (R) and Consistency (C) are likely correlated. The geometric mean mitigates this (less punitive than product). v6.0 may merge R and C into a single "External Validation" component.

### Backward Compatibility
Claims scored under v4.5 formula should be re-scored under v5.0 during session resume. The new formula is strictly >= the old formula (because of the floor), so no claim loses confidence.

### Component Scoring Guide

**E — Evidence Quality** (weight: 0.30)

| Score | Criteria |
|-------|----------|
| 1.0 | Peer-reviewed, high-impact journal, reproducible methodology described |
| 0.8 | Peer-reviewed, standard journal, methodology adequate |
| 0.8 | Expert assertion from domain expert with documented rationale |
| 0.6 | Preprint (arXiv physics.optics, eess.SP) or conference proceeding (OFC, ECOC, CLEO) with credible methodology |
| 0.4 | Preprint without replication, or conference proceeding |
| 0.2 | Blog post, technical report, single unreplicated observation |
| 0.0 | Training knowledge only, no retrievable source |

**R — Robustness** (weight: 0.25)

| Score | Criteria |
|-------|----------|
| 1.0 | Multiple independent replications, ablation studies, sensitivity analyses |
| 0.8 | At least 2 seed replicates, one ablation dimension tested |
| 0.6 | Single run but with cross-validation or holdout |
| 0.4 | Single run, no replication, but large sample |
| 0.2 | Single run, small sample, no validation |
| 0.0 | No execution at all (theoretical claim) |

**C — Concordance** (weight: 0.20)

| Score | Criteria |
|-------|----------|
| 1.0 | 3+ independent sources agree, no contradictions found |
| 0.8 | 2 independent sources agree |
| 0.6 | 1 authoritative source, others not searched yet |
| 0.4 | 1 source with partial contradictions elsewhere |
| 0.2 | Sources disagree, claim aligns with minority |
| 0.0 | Contradicted by multiple sources |

**K — Confounding Risk** (weight: 0.15, inverted: high score = low risk)

| Score | Criteria |
|-------|----------|
| 1.0 | Confounders explicitly controlled (temperature, device generation, fiber type, measurement setup) |
| 0.8 | Major confounders addressed, minor ones noted |
| 0.6 | Some confounders discussed but not all controlled |
| 0.4 | Confounders acknowledged but unaddressed |
| 0.2 | Obvious confounders not mentioned |
| 0.0 | High risk of temperature/device/setup confounding, unacknowledged |

**D — Directness** (weight: 0.10)

| Score | Criteria |
|-------|----------|
| 1.0 | Direct measurement, primary data |
| 0.8 | Close proxy with validated relationship |
| 0.6 | Indirect measurement, reasonable proxy |
| 0.4 | Multi-step inference chain (>2 logical steps) |
| 0.2 | Analogy from different system/species |
| 0.0 | Pure speculation or theoretical extrapolation |

### Confidence Thresholds for Action

| Range | Label | Action |
|-------|-------|--------|
| 0.80–1.00 | HIGH | Can build on. Include in conclusions. |
| 0.60–0.79 | MEDIUM | Seek additional confirmation before building. Flag in report. |
| 0.40–0.59 | LOW | Must upgrade before using in conclusions. Active investigation needed. |
| 0.00–0.39 | INSUFFICIENT | Cannot use. Log for transparency. Seek alternative evidence or abandon. |

## Assumption Register

Separate from claims. Assumptions are things we accept without proof for the purpose of this analysis.

### Assumption Schema

```markdown
| Field | Required | Description |
|-------|----------|-------------|
| `assumption_id` | ✅ | Sequential: A-001, A-002, ... |
| `text` | ✅ | What we assume |
| `risk` | ✅ | `HIGH` / `MEDIUM` / `LOW` — impact if wrong |
| `verification_plan` | ✅ | How we could test this assumption |
| `status` | ✅ | `ACTIVE` / `TESTED-OK` / `TESTED-FAIL` / `RETIRED` |
| `claims_affected` | ✅ | List of claim_ids that depend on this assumption |
```

### Example (ASSUMPTION-REGISTER.md)

```markdown
# Assumption Register

## A-001
- **Text:** KP4 FEC threshold (BER = 2.4e-4) applies uniformly across modulation formats for fair comparison
- **Risk:** HIGH — if different FEC assumptions are used, cross-study comparison is invalid
- **Verification plan:** Verify FEC assumption stated in each paper; flag papers using different thresholds
- **Status:** ACTIVE
- **Claims affected:** C-001, C-005, C-012

## A-002
- **Text:** Reported BER values are pre-FEC measurements (not post-FEC)
- **Risk:** MEDIUM — if some studies report post-FEC BER, comparison with pre-FEC is meaningless
- **Verification plan:** Check measurement methodology in each paper; verify measurement point in link
- **Status:** TESTED-OK (verified pre-FEC BER in all 15 included studies)
- **Claims affected:** C-003, C-004
```

## Evidence Mapping

When a finding document is produced, the Evidence Engine requires explicit mapping:

```markdown
## Evidence Map for Finding F-007

| Claim | Evidence Item | Type | Location |
|-------|--------------|------|----------|
| C-015 | BER waterfall Fig. 3 | Figure | run-20260218/figures/ber_waterfall.png |
| C-015 | Power penalty = 1.8 dB | Metric | run-20260218/report.md §Table 1 |
| C-016 | IEEE 802.3 Table 68-3 | Data | standards/ieee802.3bs_table68-3.csv |
| C-016 | "KP4 FEC provides..." | Quote | DOI:10.1109/JLT.2022.example, p. 5 |
| C-017 | Reach at target BER = 400m | Metric | run-20260218/report.md §3.2 |
```

## Confounder Harness (LAW 9 — Mandatory for Every Quantitative Claim)

**This is not optional. This is not a suggestion.** Every feature, interaction, or effect cited in any output MUST pass a three-level confounder harness before it can be cited in any output, paper, or conclusion.

### Why This Exists

A real lesson from research testing: a claim showing a strong performance advantage (p < 10^-100) was completely confounded — controlling for temperature and device generation reversed the sign. Without this harness, that claim would have reached publication. The statistics were correct. The narrative was plausible. But the claim was an artifact of a confounding variable (newer devices tested only at favorable conditions).

### The Three Levels

**Level 1: Raw Estimate**
- The naive, unadjusted number
- What you get from a simple bivariate analysis
- Record: effect size, sign, magnitude, p-value, CI

**Level 2: Conditioned Estimate**
- Adjusted for known confounders via regression, stratification, or partial correlation
- Domain-specific confounders (examples for photonics: temperature, fiber_type, device_generation, measurement_setup, modulation_format)
- For other domains: identify the 3-5 most plausible confounders in the literature
- Record: same metrics + which confounders controlled + change from raw

**Level 3: Matched Estimate**
- Propensity-matched, exact-matched, CEM, or paired analysis on the relevant strata
- Ensures comparison groups are balanced on observed confounders
- Record: same metrics + matching method + balance check + change from raw

### Verdicts

| Observation | Verdict | Status |
|-------------|---------|--------|
| Effect **changes sign** between raw and conditioned/matched | **ARTIFACT** | Killed — the effect was entirely due to confounders |
| Effect **collapses >50%** between raw and conditioned/matched | **CONFOUNDED** | Downgraded — the effect depends on confounders |
| Effect **survives all three levels** (same sign, <50% collapse) | **ROBUST** | Promotable — the effect is real after controlling |

### Claim Status Extensions (v4.0)

The claim ledger status field gains three new values:
- `ARTIFACT` — killed by confounder harness (sign reversal)
- `CONFOUNDED` — downgraded by confounder harness (>50% collapse)
- `ROBUST` — survived confounder harness (promotable)
- `DISPUTED` — frozen by circuit breaker (irreconcilable R2/researcher disagreement, see protocols/circuit-breaker.md)
- `EXPERT_CONFIRMED` — validated by domain expert assertion (confidence floor 0.70)
- `EXPERT_DISPUTED` — contradicts domain expert assertion (requires E >= 0.85 to stand)

These replace the v3.5 `VERIFIED` for quantitative claims. A quantitative claim CANNOT be `VERIFIED` without passing the confounder harness.

### Harness File

Every harness run produces a file: `CONFOUNDER-HARNESS-{claim_id}.md`
See `assets/templates.md` for the template.

### When to Run

- **MANDATORY**: Before any claim is promoted (Gate D1)
- **MANDATORY**: Before any claim appears in a conclusion (Gate D2)
- **MANDATORY**: Before R2 can clear a quantitative finding (R2 will demand it)
- **RECOMMENDED**: As early as possible — catching artifacts early saves sprints

### Domain-Specific Confounder Lists

When applying the harness, use domain-appropriate confounders:

**Optical interconnects**: temperature, fiber_type, fiber_length, device_generation, measurement_setup (lab/equipment)
**VCSEL device**: oxide_aperture, bias_current, wavelength, manufacturing_lot (random effect)
**Link budget**: connector_loss, splice_loss, chromatic_dispersion, modal_bandwidth
**Cross-study comparison**: modulation_format, data_rate, FEC_assumption, year_of_publication (technology trend)

`NO HARNESS = NO CLAIM. NO EXCEPTIONS.`

---

## Counter-Evidence Search (Mandatory Before Promotion)

When a claim reaches MEDIUM confidence (≥ 0.60), a counter-evidence search is MANDATORY before the claim can be promoted via Gate D1.

### Protocol
1. **Search for CONTRADICTING evidence:**
   - Query IEEE Xplore/Optica/OpenAlex with negation terms: "NOT [claim]", "[opposite of claim]"
   - Search for papers with contradictory findings in the same domain
   - Check if any retracted papers originally supported this claim
2. **Search for ALTERNATIVE explanations:**
   - For each causal/correlative claim: identify ≥2 alternative mechanisms that could produce the same observation
   - For each alternative: assess plausibility (HIGH/MEDIUM/LOW)
3. **Update scoring:**
   - If contradicting evidence found → reduce Concordance (C component) by 0.2 per credible contradiction
   - If plausible alternative found → flag for confounder harness (LAW 9)
   - If no contradicting evidence found after genuine search → note "counter-evidence search negative" (this STRENGTHENS the claim)
4. **Document in CLAIM-LEDGER.md:**
   - Add field: `counter_evidence_search: DONE | PENDING`
   - Add field: `contradictions_found: [list or "none after search on [databases] with [queries]"]`
   - Add field: `alternative_explanations: [list with plausibility ratings]`

### Gate D1 Integration
Gate D1 (Claim Promotion) now requires:
- `counter_evidence_search: DONE` (not PENDING)
- If contradictions found: documented and addressed (not ignored)
- If alternatives found: at least 1 tested via confounder harness

---

## Anti-Hallucination Rules (Absolute)

These rules **cannot** be relaxed under any circumstance:

1. **NEVER** present information without a source
2. **ALWAYS** include DOI for every cited paper
3. **QUOTE** exact text — do not paraphrase factual claims
4. **VERIFY** DOIs are accessible before citing (attempt web_fetch on doi.org/DOI)
5. **MARK** confidence using the quantitative formula, not intuition
6. If a claim comes from training knowledge only: `confidence: 0.0` for E component, flag explicitly with ⚠️
7. **CHAIN**: if claim A depends on claim B, and B is INSUFFICIENT, A inherits the constraint
8. **NO UPGRADE**: never upgrade a claim's type (DATA → OPINION is forbidden; OPINION → DATA requires new evidence)
9. **CONFOUNDER HARNESS**: every quantitative claim MUST pass the three-level harness (LAW 9) before promotion

---

## Single Source of Truth (v5.5)

### The Problem

Numbers copied manually between files desynchronize. A JSON file gets updated with corrected results, but FINDINGS.md still shows old numbers. This is not hypothetical — it has happened in prior research runs (e.g., v2/v3 desync).

### The Rule

**All numbers in human-readable documents (FINDINGS.md, LOGBOOK.md, reports) MUST originate from a structured data file (JSON, CSV, or script output).** No number is invented in prose.

### Protocol

1. **Source files are authoritative.** When a pipeline produces results, the structured output (e.g., `results.json`, `metrics.csv`) is the single source of truth.
2. **Documents reference sources.** Every number in FINDINGS.md or equivalent MUST include a reference to its source: `(source: results.json → classification.marginal_coverage)`.
3. **After updating any structured data file**, verify that all documents referencing it are consistent. This is what Gate DQ4 enforces.
4. **When in doubt, regenerate.** If a document's numbers might be stale, regenerate the relevant sections from the source files rather than manually patching.

### What This Does NOT Mean

- It does NOT require a code pipeline to generate every document. Interpretive text is written by the researcher.
- It does NOT require a template engine. The researcher writes FINDINGS.md, but always copies numbers FROM the source file, never from memory.
- It DOES require that every number has a traceable source. If you cannot point to the file and key where a number came from, the number should not be in the document.

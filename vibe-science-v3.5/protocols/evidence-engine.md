# Evidence Engine

Pillar 1 of Vibe Science v3.5 — TERTIUM DATUR. Transforms claims from free text into tracked, scored, verifiable assertions.

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
| `created` | ✅ | ISO date |
| `updated` | ✅ | ISO date |
```

### Claim Ledger File Format (CLAIM-LEDGER.md)

```markdown
# Claim Ledger

## C-001
- **Text:** scVI batch correction preserves cell-type separation in epithelial clusters
- **Type:** INFERENCE
- **Evidence:** [run-20250207/report.md §Metrics], [Fig. 2A UMAP], [DOI:10.1038/s41592-018-0229-2]
- **Confidence:** 0.72
- **Status:** VERIFIED
- **Reviewer2:** ensemble-major-001
- **Depends on:** C-003 (raw counts verified), C-005 (batch key justified)
- **Assumptions:** A-002 (platform effects are batch effects)
- **Updated:** 2025-02-07

## C-002
- **Text:** HVG selection at n=3000 captures endometriosis-specific genes
- **Type:** DATA
- **Evidence:** [hvg_analysis.py output], [overlap with known endo genes: 87%]
- **Confidence:** 0.85
- **Status:** VERIFIED
- **Updated:** 2025-02-07
```

### Rules for Claim Extraction

1. **Atomize**: Break compound statements into single testable claims. "scVI corrects batch effects and preserves biology" → two claims.
2. **Type honestly**: If no direct data supports it, it's INFERENCE. If it's your interpretation beyond what data shows, it's OPINION. Never upgrade type.
3. **Chain dependencies**: If C-005 depends on C-003, and C-003 gets REJECTED, cascade: C-005 becomes CHALLENGED automatically.
4. **No orphan claims**: Every claim in a finding document must have a ledger entry. Every ledger entry must have evidence.

## Confidence Score: Quantitative Formula

Confidence is **computed**, not felt. Score = weighted average of five components with an evidence floor gate.

```
raw_confidence = (w_e × E) + (w_r × R) + (w_c × C) + (w_k × K) + (w_d × D)

Where:
  E = Evidence Quality     (0–1)    w_e = 0.30
  R = Robustness           (0–1)    w_r = 0.25
  C = Concordance          (0–1)    w_c = 0.20
  K = Confounding Risk     (0–1)    w_k = 0.15  (inverted: 1 = low risk)
  D = Directness           (0–1)    w_d = 0.10

EVIDENCE FLOOR GATE (LAW 2 enforcement):
  if E < 0.2:  confidence = min(raw_confidence, 0.20)
  else:        confidence = raw_confidence

Rationale: A claim without a verifiable source (E=0) must NEVER reach
medium/high confidence regardless of other components. This enforces
LAW 2 ("Claims without sources are hallucinations") at the formula level.
A claim with E=0 is capped at 0.20 (INSUFFICIENT), forcing the researcher
to find a verifiable source before the claim can be used in conclusions.
```

### Component Scoring Guide

**E — Evidence Quality** (weight: 0.30)

| Score | Criteria |
|-------|----------|
| 1.0 | Peer-reviewed, high-impact journal, reproducible methodology described |
| 0.8 | Peer-reviewed, standard journal, methodology adequate |
| 0.6 | Preprint (bioRxiv, medRxiv) with credible methodology |
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
| 1.0 | Confounders explicitly controlled (batch, platform, composition) |
| 0.8 | Major confounders addressed, minor ones noted |
| 0.6 | Some confounders discussed but not all controlled |
| 0.4 | Confounders acknowledged but unaddressed |
| 0.2 | Obvious confounders not mentioned |
| 0.0 | High risk of batch/platform/compositional confounding, unacknowledged |

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
- **Text:** Platform effects (10X v2 vs v3) behave as batch effects correctable by scVI
- **Risk:** HIGH — if platform effects are biological, correction destroys real signal
- **Verification plan:** Compare DE results pre/post correction for known platform-independent genes
- **Status:** ACTIVE
- **Claims affected:** C-001, C-005, C-012

## A-002
- **Text:** Raw counts in GEO datasets are truly raw (not re-normalized)
- **Risk:** MEDIUM — if counts are normalized, scVI preprocessing is wrong
- **Verification plan:** Check .X dtype (int vs float), verify max values, check GEO submission notes
- **Status:** TESTED-OK (verified integer counts in all 52 datasets)
- **Claims affected:** C-003, C-004
```

## Evidence Mapping

When a finding document is produced, the Evidence Engine requires explicit mapping:

```markdown
## Evidence Map for Finding F-007

| Claim | Evidence Item | Type | Location |
|-------|--------------|------|----------|
| C-015 | UMAP Fig. 2A | Figure | run-20250207/figures/umap_batch.png |
| C-015 | iLISI = 0.89 | Metric | run-20250207/report.md §Table 1 |
| C-016 | Tsai 2015 Table S3 | Data | 03-data/supplementary/tsai2015_S3.csv |
| C-016 | "count data suitable..." | Quote | DOI:10.1038/nbt.3117, p. 187 |
| C-017 | DE overlap = 92% | Metric | run-20250207/report.md §3.2 |
```

## Anti-Hallucination Rules (Absolute)

These rules **cannot** be relaxed under any circumstance:

1. **NEVER** present information without a source
2. **ALWAYS** include DOI or PMID for every cited paper
3. **QUOTE** exact text — do not paraphrase factual claims
4. **VERIFY** DOIs are accessible before citing (attempt web_fetch on doi.org/DOI)
5. **MARK** confidence using the quantitative formula, not intuition
6. If a claim comes from training knowledge only: `confidence: 0.0` for E component, flag explicitly with ⚠️
7. **CHAIN**: if claim A depends on claim B, and B is INSUFFICIENT, A inherits the constraint
8. **NO UPGRADE**: never upgrade a claim's type (DATA → OPINION is forbidden; OPINION → DATA requires new evidence)

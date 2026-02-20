# Quality Gates v5.5

> **v5.0 IUDEX upgrades**: 2 new gates (V0, J0), schema enforcement on 8 gates, exploration budget in T3, S5 poison pill.
>
> **v5.5 ORO upgrades**: 7 new gates (L-1, DQ1-DQ4, DD0, DC0) for data quality and operational integrity. R2 INLINE mode. Total: 36 gates (25 base + 4 HE + 7 v5.5). 8 schema-enforced.

Blocking gates that stop-the-line if failed. No analysis proceeds past a failed gate. Fix first, re-gate, then continue.

## Gate Philosophy

Gates are not optional checks — they are **blocking barriers**. The pipeline cannot continue if a gate fails. This prevents the accumulation of errors that produce "beautiful but fragile" outputs.

v4.0 adds: Tree Gates (T0-T3), Brainstorm Gate (B0), and Stage Gates (S1-S5).

---

## Pipeline Gates (G0-G6)

### Gate 0 — Input Sanity

**When:** After loading data, before any processing.

```
PASS criteria (ALL must be true):
□ Data matrix contains valid numeric values (dtype float64/float32)
□ Value ranges are reasonable for the measurement type (typical ranges for photonics measurements, e.g., BER values between 0 and 1, power readings in dBm)
□ Raw measurement data preserved if transformations applied
□ No NaN/Inf in measurement matrix
□ Parameter names are present and non-empty
□ n_samples > 0, n_parameters > 0
□ File loads without error

FAIL actions:
- Unexpected value ranges → STOP. Investigate measurement calibration history.
- Raw data missing and measurements are transformed → STOP. Cannot proceed without raw measurements.
- NaN in measurements → STOP. Data corruption or sensor dropout.
```

### Gate 1 — Schema Compliance

**When:** After QC filtering, before feature selection.
**Route to:** `assets/metadata-normalizer.md` for dtype fixes.

```
PASS criteria (ALL must be true):
□ Metadata table contains: study_id, sample_id (at minimum)
□ All categorical columns are dtype 'category' (not string/object)
□ Categories are frozen (no unused categories lingering)
□ No NaN in categorical columns used as controlled-parameter/covariate keys
□ study_id has ≥2 levels (otherwise no systematic variation to correct)
□ platform column present and consistent with known measurement platform names
□ background_noise_ratio computed and stored
□ Parameter identifiers unique (deduplication applied if needed)

FAIL actions:
- String dtypes in controlled-parameter columns → Run metadata-normalizer, re-gate
- NaN in controlled_parameter column → Drop samples with NaN or impute from metadata, document decision
- Single-setup data → Cannot use systematic variation correction model; switch to direct analysis workflow
- Missing background_noise_ratio → Compute from noise floor measurements, add to metadata table
```

### Gate 2 — Design Justification

**When:** After choosing controlled_parameter, covariates, feature selection threshold. Before training model.

```
PASS criteria (ALL must be true):
□ controlled_parameter choice justified with evidence (variance decomposition, PCA plot, or literature)
□ controlled_parameter has between 2 and ~50 levels (too many → model overfitting risk)
□ Categorical covariates justified (not just "because they exist" — e.g., fiber type, modulation format, device generation)
□ Feature selection threshold justified (e.g., SNR cutoff, significance level — with documented reasoning)
□ Feature selection method stated (variance ranking, signal-to-noise ranking, etc.)
□ Decision logged in decision-log.md with alternatives considered
□ Confounding between controlled_parameter and physical conditions assessed

FAIL actions:
- controlled_parameter not justified → Run PCA variance decomposition, document, re-gate
- controlled_parameter perfectly confounded with physical conditions → STOP. Cannot separate systematic variation from signal.
- Covariates correlated with controlled_parameter → Document risk in ASSUMPTION-REGISTER.md
```

### Gate 3 — Training / Execution Integrity

**When:** After model training completes. Before using outputs.

```
PASS criteria (ALL must be true):
□ ELBO/loss converged (visual inspection of convergence plot)
□ No training-validation divergence (overfitting check)
□ Final loss is not NaN or Inf
□ Model saved successfully (model.pt exists and loads)
□ At least 2 seed replicates run (or 1 with documented justification)
□ Training completed without errors (stderr.log clean)
□ Memory usage did not cause silent OOM

FAIL actions:
- Non-convergence → Increase epochs, reduce learning rate, check data
- Overfitting (train-val gap > 10%) → Add regularization, reduce model_complexity (e.g., latent dimensions, layer width)
- NaN loss → Data issue (likely corrupted measurements or extreme outliers)
- Single seed only → Run second seed before accepting results
```

### Gate 4 — Metrics Decision

**When:** After computing integration/analysis metrics.

```
PASS criteria (ALL must be true):
□ Standard metric suite computed (link performance metrics: BER, power penalty, reach, energy efficiency)
□ Metrics contextualized (compared to baseline or previous run)
□ Direction of improvement documented
□ Trade-offs between metrics explicit (No Free Lunch)
□ Decision motivated with metric evidence
□ No metric gaming flagged

FAIL actions:
- One metric improved at significant cost to another → Investigate
- No baseline comparison → Compute baseline first
- Missing calibration assessment (if probabilistic model) → Compute ECE/Brier
```

### Gate 5 — Artifact Completeness

**When:** After run completion. Before marking run as valid.

```
PASS criteria (ALL must be true):
□ manifest.json present and valid
□ report.md present, following standard template
□ figures/ directory present with expected figures
□ metrics.json present with all computed values
□ output files present (dataset, model, etc. as applicable)
□ scripts/ directory present
□ logs/ directory present

FAIL actions:
- Missing manifest → Run is invalid. Cannot audit. Regenerate.
- Missing figures → Generate from saved output before accepting
- Missing report → Generate from manifest + metrics before accepting
```

### Gate 6 — VLM Validation (OPTIONAL)

**When:** After figures are generated. If VLM access available.

```
PASS criteria:
□ Figures are readable (not garbled, not blank)
□ Axes are labeled with units
□ Trends visible in figures match quantitative metrics
□ Color schemes are colorblind-friendly
□ VLM quality score >= 0.6

FAIL actions:
- Garbled/blank figures → Regenerate
- Axes unlabeled → Fix and regenerate
- Trend-metric mismatch → Investigate (potential bug in figure generation)

OPTIONAL: If no VLM access, skip this gate. Not blocking.
```

---

## Literature Gates (L-1, L0-L2)

### Gate L-1 — Literature Pre-Check — NEW in v5.5
**When:** Before committing to any new research direction (Phase 0, after LANDSCAPE, before GAPS).

```
PASS criteria (ALL must be true):
□ PubMed + arXiv + IEEE Xplore + Optica searched for EXACT intersection of planned topic
□ Component terms searched SEPARATELY (not just the combined phrase)
□ If prior work found: explicit decision — PIVOT (different angle) or DIFFERENTIATE (what's new)
□ If no prior work found: queries and null results documented
□ Decision logged in decision-log.md with search queries used

FAIL actions:
- No search performed → BLOCK. Cannot commit to direction without prior art check.
- Prior work found but not addressed → BLOCK. Must articulate differentiation.
- Searches too narrow (only exact phrase) → Redo with component terms.
```

### Gate L0 — Source Validity
```
□ All cited DOIs verified (accessible via web_fetch)
□ No training-knowledge-only claims marked as DATA
□ All claims registered in CLAIM-LEDGER.md
□ Confidence scores computed (not guessed)
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/source-validity.schema.json`

### Gate L1 — Coverage Adequacy
```
□ ≥2 databases searched
□ ≥3 search strategies used (keyword, snowball, author trail, etc.)
□ Negative results documented (what was NOT found)
□ Source dedup applied (no double-counting)
```

### Gate L2 — Review Completeness
```
□ All major findings reviewed by ensemble
□ All FATAL FLAWS resolved or finding rejected
□ All DEMANDED EVIDENCE provided or finding downgraded
□ Counter-evidence explicitly searched for every conclusion
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/review-completeness.schema.json`

---

## Decision Gates (D0-D2)

### Gate D0 — Decision Justification
```
□ Decision logged in decision-log.md with DEC-YYYYMMDD-NNN format
□ ≥2 alternatives considered and documented with rejection reasons
□ Trade-offs explicitly stated (what we lose)
□ Reversibility assessed (HIGH/MEDIUM/LOW)
□ Affected claims listed (claim_ids)
□ Evidence-based justification (not opinion-based)
```

### Gate D1 — Claim Promotion
```
□ Claim has ≥1 verifiable source with DOI
□ Confidence computed with formula (not subjective)
□ Evidence floor gate passed (E ≥ 0.2)
□ Counter-evidence actively searched
□ Confounder harness completed (LAW 9) — raw, conditioned, matched
□ Dependencies checked (all depends_on claims are ≥ VERIFIED)
□ Assumptions listed and registered
□ At least 3 falsification attempts performed
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- E < 0.2 → Cannot promote. Seek verifiable source first.
- No confounder harness → BLOCK. Run harness before promotion (LAW 9).
- No counter-evidence search → Perform search, document results
- < 3 falsification attempts → Design and run additional tests
```
**Schema**: `schemas/claim-promotion.schema.json`

### Gate D2 — RQ Conclusion
```
□ All success/kill criteria from RQ.md explicitly addressed
□ All major claims R2-reviewed (final review completed)
□ No unresolved FATAL FLAWS from R2
□ All promoted claims have passed confounder harness (LAW 9)
□ CLAIM-LEDGER.md consistent (no UNVERIFIED claims cited in conclusion)
□ Cross-configuration/cross-dataset validation attempted for generalizable claims
□ Knowledge base updated
□ PROGRESS.md complete (no gaps)
□ Reproducibility contract satisfied
□ Tree visualization final snapshot saved
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/rq-conclusion.schema.json`

---

## Tree Gates (T0-T3) — NEW in v4.0

### Gate T0 — Node Validity
**When:** Before expanding a new tree node.

```
PASS criteria:
□ Node has a valid type (draft|debug|improve|hyperparameter|ablation|replication|serendipity)
□ Node has a valid parent (exists in TREE-STATE.json)
□ Node has a non-empty action plan (think_plan is not empty)
□ Node type is appropriate for current stage (e.g., hyperparameter only in Stage 2+)
□ Parent is not pruned

FAIL actions:
- Invalid type → Fix type assignment
- Invalid parent → Check tree structure integrity
- Empty action plan → Complete THINK phase before expanding
- Wrong type for stage → Select appropriate node type
```

### Gate T1 — Debug Limit
**When:** After a debug attempt on a buggy node.

```
PASS criteria:
□ debug_attempts <= 3 for the node being debugged
□ Each debug attempt addresses a DIFFERENT root cause (not repeating the same fix)
□ Debug attempt is documented with: what was tried, why, result

FAIL actions:
- debug_attempts > 3 → PRUNE the node. Mark as pruned with reason.
  Move on. Do not attempt a 4th fix.
- Same fix repeated → Document why, prune if no alternative approaches
```

### Gate T2 — Branch Diversity
**When:** When creating sibling nodes (multiple children of same parent).

```
PASS criteria:
□ Sibling nodes differ in at least 1 substantive parameter or approach
□ No exact duplicate configurations exist among siblings
□ Diversity documented (what differs between siblings)

FAIL actions:
- Duplicate configuration → Merge or differentiate
- All siblings doing the same thing → Introduce variation (different method, different features, different split)
```

### Gate T3 — Tree Health
**When:** Every 5 cycles, or after any node is pruned.

```
PASS criteria:
□ good_nodes / total_nodes >= 0.2 (at least 20% of nodes are productive)
□ No branch has 5+ consecutive non-improving nodes
□ At least 2 branches explored (LAW 8) unless tree_mode = LINEAR
□ Exploration ratio >= 0.20 (serendipity + draft + novel ablation nodes / total nodes)
  WARNING if < 0.20, FAIL if < 0.10 (LAW 8 quantified enforcement)

FAIL actions:
- Ratio < 0.2 → STOP expanding. R2 emergency review. Strategy revision.
  Do NOT add more nodes — the current approach is not working.
- 5+ non-improving → Soft-prune that branch. Try different approach.
- Single branch only → Create alternative branch (LAW 8: Explore Before Exploit)
- Exploration ratio < 0.20 → WARNING. Create exploration nodes before next expansion.
- Exploration ratio < 0.10 → FAIL. Must add exploration nodes before ANY further processing.
```

---

## Brainstorm Gate (B0) — NEW in v4.0

### Gate B0 — Brainstorm Quality
**When:** After Phase 0 BRAINSTORM completion, before any OTAE cycle.

```
PASS criteria (ALL must be true):
□ At least 3 gaps identified with evidence
□ At least 1 gap verified as not-yet-addressed (preprint check)
□ Data availability confirmed for chosen hypothesis (DATA_AVAILABLE >= 0.5)
□ Hypothesis is falsifiable (null hypothesis stated)
□ Predictions stated (if true → X, if false → Y)
□ R2 brainstorm review: WEAK_ACCEPT or better
□ User approved the chosen direction

B0 MUST PASS before any OTAE cycle begins.
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- Insufficient gaps → More literature search needed
- No verified gap → Check preprints on arXiv, IEEE Xplore, Optica Publishing
- DATA_AVAILABLE < 0.5 → Find better data source or adjust hypothesis
- Hypothesis not falsifiable → Reformulate with testable predictions
- R2 rejected → Address R2 demands, re-review
- User not consulted → Present options to user
```
**Schema**: `schemas/brainstorm-quality.schema.json`

---

## Stage Gates (S1-S5) — NEW in v4.0

### Gate S1 — Preliminary Investigation Exit
**When:** Evaluating readiness to advance from Stage 1 to Stage 2.

```
PASS criteria:
□ At least 1 good node with valid metrics exists
□ Metrics are meaningful (not trivially achieved)
□ Multi-seed validation of best node (minimum 2 seeds)
□ R2 batch review at transition (BLOCKING)

FAIL actions:
- No good nodes → Continue Stage 1, try different approaches
- Trivial metrics → Investigate (random baseline comparison needed)
- Single seed → Run second seed before advancing
```

### Gate S2 — Hyperparameter Tuning Exit
**When:** Evaluating readiness to advance from Stage 2 to Stage 3.

```
PASS criteria:
□ Best metric confirmed improved over Stage 1 best
□ Improvement tested on 2+ configurations (not just 1 lucky config)
□ Ablation of at least 1 key hyperparameter completed
□ R2 batch review at transition

FAIL actions:
- No improvement → Consider that Stage 1 approach may be suboptimal
- Single config → Test at least 1 more variation
```

### Gate S3 — Research Agenda Exit
**When:** Evaluating readiness to advance from Stage 3 to Stage 4.

```
PASS criteria:
□ All planned sub-experiments attempted or time budget exceeded
□ Results documented for each sub-experiment
□ At least 3 draft nodes explored (LAW 8)
□ R2 batch review at transition

FAIL actions:
- Planned experiments remaining → Complete or document why skipped
- < 3 approaches explored → Create additional draft nodes
```

### Gate S4 — Ablation & Validation Exit
**When:** Evaluating readiness to advance from Stage 4 to Stage 5.

```
PASS criteria:
□ All key components ablated, contribution quantified
□ Multi-seed validation complete (minimum 3 seeds for best config)
□ Cross-dataset/cross-configuration validation attempted (if generalizable claims)
□ Confounder harness run for ALL promoted claims (LAW 9)
□ R2 batch review at transition
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- Missing ablations → Complete ablation matrix
- Single seed → Run additional seeds
- No cross-validation → Attempt or document why impossible
- Harness missing → Run confounder harness before advancing (LAW 9)
```
**Schema**: `schemas/stage4-exit.schema.json`

### Gate S5 — Synthesis & Review Exit
**When:** Final gate before concluding the RQ.

```
PASS criteria:
□ R2 full ensemble verdict: ACCEPT
□ Gate D2 (RQ Conclusion) PASS
□ All claims have status VERIFIED or CONFIRMED (no UNVERIFIED in conclusion)
□ No claims with status DISPUTED (S5 Poison Pill — circuit breaker resolution required)
□ All confounder harnesses completed and documented (LAW 9)
□ Tree visualization final snapshot saved
□ Knowledge base updated
□ All artifacts crystallized to files (LAW 10)
□ Artifact validates against schemas/stage5-exit.schema.json

FAIL actions:
- R2 not ACCEPT → Address demands, re-review
- D2 not PASS → Fix specific D2 failures
- UNVERIFIED claims → Either verify or remove from conclusion
- DISPUTED claims exist → Resolution required: (a) new data resolves dispute, (b) claim dropped, (c) human override with documented rationale
- Missing harnesses → Complete before concluding
```
**Schema**: `schemas/stage5-exit.schema.json`

---

## Vigilance Gate (V0) — NEW in v5.0

### Gate V0 — R2 Vigilance Check
**When:** After every FORCED R2 review completes, before accepting the review.

```
PASS criteria (ALL must be true):
□ All non-EQUIV seeded faults caught by R2 (caught=true)
□ RMS (Review Miss Score) >= 0.80: faults_caught / faults_injected (EQUIV excluded from denominator)
□ FAR (False Accusation Rate) <= 0.10: false_accusations / real_claims_count
□ Schema validation: artifact validates against schemas/vigilance-check.schema.json

FAIL actions:
- R2 missed seeded faults → review INVALID, R2 must re-review ENTIRE claim set
- RMS < 0.80 → insufficient vigilance, re-review required
- FAR > 0.10 → R2 is trigger-happy, recalibrate
- RETRY LIMIT: max 3 V0 failures per session. After 3 → ESCALATE to human.
```

**Protocol**: `protocols/seeded-fault-injection.md`
**Schema**: `schemas/vigilance-check.schema.json`

---

## Judge Gate (J0) — NEW in v5.0

### Gate J0 — Judge Agent Assessment
**When:** After every FORCED R2 review passes V0, before accepting the review into the pipeline.

```
PASS criteria (ALL must be true):
□ R3 rubric total >= 12 (out of 18)
□ No dimension scored 0 (all 6 aspects addressed)
□ Counter-evidence search dimension >= 2 (must actually search, not rubber-stamp)

FAIL actions:
- Total < 12 → R2 must redo FORCED review with R3's specific feedback
- Any dimension = 0 → R2 gets specific guidance on which aspect was missing
- RETRY LIMIT: max 2 consecutive J0 failures. After 2 → ESCALATE to human.
```

**Rubric dimensions** (see `assets/judge-rubric.yaml` for full scoring):
1. Specificity (0-3): Did R2 cite exact files, lines, claim IDs?
2. Independence (0-3): Did R2 generate its own concerns (BFP Phase 1)?
3. Counter-Evidence (0-3): Did R2 actually search databases?
4. Confounder Analysis (0-3): Did R2 demand raw/conditioned/matched estimates?
5. Falsification Demand (0-3): Did R2 specify concrete falsification tests?
6. Escalation (0-3): Did R2 escalate unresolved issues appropriately?

**Protocol**: `protocols/judge-agent.md`
**Rubric**: `assets/judge-rubric.yaml`

---

## Gate Tracking Format

In every run report, sprint report, and decision log:

```markdown
| Gate | Status | Evidence | Notes |
|------|--------|----------|-------|
| G0 | PASS | dtype=float64, ranges validated | power in dBm range |
| G1 | PASS | metadata-normalizer applied | 3 string→category |
| T0 | PASS | node-003, type=hyper, parent=node-001 | |
| T3 | PASS | 4/6 good (67%) | healthy |
| S1 | PASS | node-001 acc=0.72, 2 seeds | advancing to S2 |
| V0 | PASS | 3/3 caught, RMS=1.00, FAR=0.00 | |
| J0 | PASS | total=14/18, min=2 | |
```

---

## Schema Enforcement Summary (v5.0)

| Gate | Schema File | Key Enforcement |
|------|-------------|-----------------|
| D1 | claim-promotion.schema.json | Evidence chain, confidence formula, confounder harness, counter-evidence |
| D2 | rq-conclusion.schema.json | All claims verified, R2 ACCEPT, tree snapshot |
| S4 | stage4-exit.schema.json | Ablation matrix, multi-seed (>=3), all harnesses |
| S5 | stage5-exit.schema.json | R2 ACCEPT only, no DISPUTED (poison pill), all crystallized |
| L0 | source-validity.schema.json | Verified DOIs, computed confidence, ledger registration |
| L2 | review-completeness.schema.json | R2 reports, flaws resolved, counter-evidence searched |
| B0 | brainstorm-quality.schema.json | >=3 gaps, data availability >=0.5, falsifiable hypothesis |
| V0 | vigilance-check.schema.json | All non-EQUIV faults caught, RMS >=0.80, FAR <=0.10 |

**Protocol**: `protocols/schema-validation.md`
**Schemas are READ-ONLY**: No agent can modify schema files. Only the human architect can change them.

---

## Human Expert Gates (HE) — Expert Validation Checkpoints

These gates are unique to the expert-guided photonics fork. They BLOCK the pipeline until the domain expert provides validation. The system STOPS and asks the expert.

### HE0 — Context Validation (post-Brainstorm Step 1)
**Trigger**: After Step 1 UNDERSTAND completes
**Question**: "Is the research context correct? Are the domain assumptions valid?"
**BLOCKING**: Yes — system cannot proceed to Step 2 without expert confirmation
**Pass criteria**: Expert confirms context is appropriate for the research question

### HE1 — RQ Priority Validation (post-Triage Step 6)
**Trigger**: After Step 6 TRIAGE produces ranked research questions
**Question**: "Are the prioritized research questions correct? Should any be reordered, added, or removed?"
**BLOCKING**: Yes — system cannot commit to RQ without expert approval
**Pass criteria**: Expert approves or modifies the RQ ranking

### HE2 — Physical Plausibility Check (every Stage transition)
**Trigger**: At every Stage transition (S1→S2, S2→S3, S3→S4, S4→S5)
**Question**: "Do the current findings make physical sense? Are there physical constraints being violated?"
**BLOCKING**: Yes — system cannot advance to next stage without expert confirmation
**Pass criteria**: Expert confirms findings are physically plausible
**Special focus**: Shannon limit, thermodynamic constraints, optical diffraction limits, semiconductor physics

### HE3 — Conclusions Completeness (pre-Stage 5 Synthesis)
**Trigger**: Before entering Stage 5 (Synthesis)
**Question**: "What's missing from the conclusions? What would a domain expert expect to see that isn't here?"
**BLOCKING**: Yes — system cannot synthesize without expert review
**Pass criteria**: Expert confirms conclusions are complete or provides additions

---

## Data Quality Gates (DQ1-DQ4) — NEW in v5.5

These gates address a blind spot in v5.0: all existing gates verify *claim quality* (is the conclusion supported?) but NONE verify *data quality* (are the features correct? do the numbers in documents match the source?). Data quality gates operate between pipeline phases, not at the claim level.

All thresholds are **domain-general** — no hardcoded values for any specific problem.

### Gate DQ1 — Post-Extraction Quality
**When:** After feature extraction, before any model training or analysis.

```
PASS criteria (ALL must be true):
□ No zero-variance features in extracted set
□ No features with >50% missing values
□ Feature distributions are plausible (no impossible values for the measurement type)
□ Cross-check: feature count matches expectations from metadata/documentation
□ Leakage check: no feature has |correlation| > 0.95 with target variable
□ If features derived from raw data: derivation steps documented and reproducible

FAIL actions:
- Zero-variance features found → Remove, document, re-extract
- >50% missing → Investigate source (sensor dropout? measurement gap?)
- Implausible values → HALT. Investigate data pipeline before proceeding.
- Leakage detected → HALT. Feature is likely derived from target. Remove and re-extract.
```

### Gate DQ2 — Post-Training Quality
**When:** After model training completes, before using model for any claims.

```
PASS criteria (ALL must be true):
□ Model beats trivial baseline (mean predictor, majority class, random)
□ No single feature dominates predictions (>50% importance) without physical justification
□ Cross-validation folds are stable (CV of metric < 0.50)
□ No leakage indicators (suspiciously perfect train metrics with poor validation)

FAIL actions:
- Worse than baseline → HALT. Model is not learning signal.
- Single-feature dominance → Investigate. If the feature is a proxy for the target, it's leakage.
- Unstable folds → Investigate data heterogeneity. Consider stratification.
- Perfect train + poor val → Overfitting or leakage. Investigate features.
```

### Gate DQ3 — Post-Calibration Quality
**When:** After any calibration step (probability calibration, interval calibration, etc.).

```
PASS criteria (ALL must be true):
□ Calibration metric is in plausible range (not suspiciously perfect: exact 0.000)
□ Sample size adequate for calibration claims (document n)
□ Calibration result is reproducible across seeds
□ If calibration is "perfect" (metric = ideal value exactly): suspicious, investigate

FAIL actions:
- Suspiciously perfect → HALT. Likely a bug or leakage. Verify independently.
- Sample too small → Document limitation, widen confidence intervals.
- Non-reproducible → Run additional seeds, report distribution.
```

### Gate DQ4 — Post-Finding Quality
**When:** After formulating any finding, before recording in CLAIM-LEDGER.

```
PASS criteria (ALL must be true):
□ All numbers in the finding match source data files (spot-check at minimum)
□ Sample size is reported alongside every quantitative claim
□ If result is surprising (better than expected, sign reversal, etc.): alternative explanations listed
□ Naming is consistent (same entity has same name everywhere)

FAIL actions:
- Number mismatch → HALT. Fix source or finding. Never proceed with inconsistent numbers.
- Missing sample size → Add before recording.
- Surprising result without alternatives → List at least 2 alternative explanations.
- Naming inconsistency → Standardize before recording.
```

---

## Data Dictionary Gate (DD0) — NEW in v5.5

### Gate DD0 — Column/Parameter Documentation
**When:** Before using ANY column, feature, or parameter from a dataset for the first time.

```
PASS criteria (ALL must be true):
□ Every column/parameter used in analysis has a documented meaning
□ Meaning is VERIFIED (from official documentation, metadata, or source code — not guessed)
□ Units are documented where applicable
□ Any column whose name could be ambiguous has an explicit clarification

FAIL actions:
- Undocumented column used → HALT. Document meaning before proceeding.
- Meaning guessed from name alone → HALT. Verify from authoritative source.
- Units missing for physical quantity → Add units from documentation.
```

**Template** (in data dictionary file):

```markdown
| Column/Parameter | Meaning | Source of Meaning | Units | Notes |
|------------------|---------|-------------------|-------|-------|
| ... | ... | ... | ... | ... |
```

---

## Design Compliance Gate (DC0) — NEW in v5.5

### Gate DC0 — Design-Execution Alignment
**When:** At every stage transition AND at any checkpoint where execution may have drifted from design.

```
PASS criteria (ALL must be true):
□ Current analysis matches the design documented in RQ.md / decision-log.md
□ If deviations exist: each is documented with rationale
□ No undocumented datasets added (every data source traceable to design or documented pivot)
□ No undocumented methodology changes
□ Feature set matches what was planned (or deviations documented)

FAIL actions:
- Undocumented deviation → HALT. Document the deviation and rationale before proceeding.
- Orphaned dataset (downloaded but unused) → Document why unused or remove.
- Methodology changed without record → Add to decision-log.md with justification.
```

**Rationale**: Design-execution drift was the root cause of multiple errors in field testing. This gate ensures the agent stays on track or explicitly documents why it diverged.

---

## v5.5 Gate Summary

| Category | Gates | Count |
|----------|-------|:-----:|
| Pipeline | G0-G6 | 7 |
| Literature | L-1, L0-L2 | 4 |
| Decision | D0-D2 | 3 |
| Tree | T0-T3 | 4 |
| Brainstorm | B0 | 1 |
| Stage | S1-S5 | 5 |
| Vigilance + Judge | V0, J0 | 2 |
| Human Expert | HE0-HE3 | 4 |
| Data Quality | DQ1-DQ4 | 4 |
| Data Dictionary | DD0 | 1 |
| Design Compliance | DC0 | 1 |
| **Total** | | **36** |
